import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as puppeteer from 'puppeteer';
import { generateInvoiceHtml, InvoiceTemplateData } from './invoice-template';
import { formatIndianNumber } from './pdf.helpers';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: puppeteer.Browser | null = null;

  private readonly s3: S3Client;
  private readonly bucket = 'syscode-uploads';
  private readonly keyPrefix = 'kontafy/invoices';
  private readonly publicBaseUrl = 'https://pub-3c9b20f24ae34d4d935610c014f9ba51.r2.dev';

  constructor(private readonly prisma: PrismaService) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: 'https://08c5215e60e39dc2fbb3fb67ae7359a5.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '0bd5fa4925a7b2172467c4b1976bb65a',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'ada1bfa44238f83b2097bb6b23d7ed17594bf46c62bdbbcba3e8ec00e6b40bcd',
      },
      forcePathStyle: true,
    });
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Puppeteer browser closed');
    }
  }

  /**
   * Get or launch a shared Puppeteer browser instance.
   */
  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser || !this.browser.connected) {
      this.logger.log('Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Generate a PDF buffer for the given invoice.
   */
  async generateInvoicePdf(invoiceId: string, orgId: string): Promise<Buffer> {
    // Fetch invoice with all relations
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      include: {
        items: true,
        contact: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Fetch organization
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Build template data
    const templateData = this.buildTemplateData(invoice, org);

    // Render HTML
    const html = generateInvoiceHtml(templateData);

    // Generate PDF with Puppeteer
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: false,
      });

      await page.close();

      this.logger.log(`PDF generated for invoice ${invoice.invoice_number}`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate PDF for invoice ${invoiceId}`, error);
      throw new InternalServerErrorException('Failed to generate invoice PDF');
    }
  }

  /**
   * Upload a PDF buffer to Cloudflare R2. Returns the public URL.
   */
  async uploadPdf(buffer: Buffer, key: string): Promise<string> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: 'application/pdf',
          CacheControl: 'public, max-age=31536000',
        }),
      );

      const publicUrl = `${this.publicBaseUrl}/${key}`;
      this.logger.log(`PDF uploaded to R2: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`Failed to upload PDF to R2: ${key}`, error);
      throw new InternalServerErrorException('Failed to upload invoice PDF');
    }
  }

  /**
   * Get existing PDF URL or generate + upload a new one.
   */
  async getOrGenerateInvoicePdf(invoiceId: string, orgId: string): Promise<string> {
    // Check if invoice already has a PDF URL
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      select: { id: true, pdf_url: true, invoice_number: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.pdf_url) {
      return invoice.pdf_url;
    }

    // Generate and upload
    return this.regenerateInvoicePdf(invoiceId, orgId);
  }

  /**
   * Force-regenerate the PDF, upload to R2, and update the database record.
   */
  async regenerateInvoicePdf(invoiceId: string, orgId: string): Promise<string> {
    const pdfBuffer = await this.generateInvoicePdf(invoiceId, orgId);

    // Build the R2 key: kontafy/invoices/{orgId}/{invoiceId}.pdf
    const key = `${this.keyPrefix}/${orgId}/${invoiceId}.pdf`;

    const publicUrl = await this.uploadPdf(pdfBuffer, key);

    // Save URL to invoice record
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdf_url: publicUrl, updated_at: new Date() },
    });

    return publicUrl;
  }

  /**
   * Get raw PDF buffer for direct download.
   */
  async getInvoicePdfBuffer(invoiceId: string, orgId: string): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      select: { id: true, invoice_number: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const buffer = await this.generateInvoicePdf(invoiceId, orgId);
    const safeNumber = invoice.invoice_number.replace(/\//g, '-');
    const filename = `${safeNumber}.pdf`;

    return { buffer, filename };
  }

  /**
   * Build the template data object from Prisma records.
   */
  private buildTemplateData(invoice: any, org: any): InvoiceTemplateData {
    const orgAddress = typeof org.address === 'string' ? JSON.parse(org.address) : (org.address || {});
    const contact = invoice.contact || {};
    const billingAddr = typeof contact.billing_address === 'string'
      ? JSON.parse(contact.billing_address) : (contact.billing_address || {});
    const shippingAddr = typeof contact.shipping_address === 'string'
      ? JSON.parse(contact.shipping_address) : (contact.shipping_address || {});

    // Parse org settings for bank details
    const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : (org.settings || {});
    const bankDetails = settings.bank_details || null;

    // Format dates
    const formatDate = (d: Date | string | null): string => {
      if (!d) return '';
      const date = new Date(d);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    // Build items with serial numbers
    const items = (invoice.items || []).map((item: any, idx: number) => ({
      sno: idx + 1,
      description: item.description,
      hsn_code: item.hsn_code,
      quantity: Number(item.quantity),
      unit: item.unit || 'pcs',
      rate: Number(item.rate),
      discount_pct: Number(item.discount_pct || 0),
      taxable_amount: Number(item.taxable_amount || 0),
      cgst_rate: Number(item.cgst_rate || 0),
      cgst_amount: Number(item.cgst_amount || 0),
      sgst_rate: Number(item.sgst_rate || 0),
      sgst_amount: Number(item.sgst_amount || 0),
      igst_rate: Number(item.igst_rate || 0),
      igst_amount: Number(item.igst_amount || 0),
      cess_rate: Number(item.cess_rate || 0),
      cess_amount: Number(item.cess_amount || 0),
      total: Number(item.total || 0),
    }));

    // Build tax summary grouped by rate
    const taxByRate = new Map<string, {
      taxable_amount: number; cgst: number; sgst: number; igst: number; cess: number;
    }>();

    for (const item of items) {
      const rateKey = invoice.is_igst
        ? String(item.igst_rate)
        : String(item.cgst_rate + item.sgst_rate);

      if (!taxByRate.has(rateKey)) {
        taxByRate.set(rateKey, { taxable_amount: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 });
      }
      const entry = taxByRate.get(rateKey)!;
      entry.taxable_amount += item.taxable_amount;
      entry.cgst += item.cgst_amount;
      entry.sgst += item.sgst_amount;
      entry.igst += item.igst_amount;
      entry.cess += item.cess_amount;
    }

    const taxSummary = Array.from(taxByRate.entries()).map(([rate, vals]) => ({
      rate,
      taxable_amount: vals.taxable_amount,
      cgst: vals.cgst,
      sgst: vals.sgst,
      igst: vals.igst,
      cess: vals.cess,
      total_tax: vals.cgst + vals.sgst + vals.igst + vals.cess,
    }));

    return {
      org: {
        name: org.name,
        legal_name: org.legal_name,
        gstin: org.gstin,
        pan: org.pan,
        address: orgAddress,
        phone: org.phone,
        email: org.email,
        logo_url: org.logo_url,
      },
      contact: {
        name: contact.name || '',
        company_name: contact.company_name,
        gstin: contact.gstin,
        billing_address: billingAddr,
        shipping_address: shippingAddr,
        phone: contact.phone,
        email: contact.email,
      },
      invoice_number: invoice.invoice_number,
      type: invoice.type,
      date: formatDate(invoice.date),
      due_date: formatDate(invoice.due_date),
      place_of_supply: invoice.place_of_supply,
      is_igst: invoice.is_igst,
      items,
      subtotal: Number(invoice.subtotal || 0),
      discount_amount: Number(invoice.discount_amount || 0),
      tax_amount: Number(invoice.tax_amount || 0),
      total: Number(invoice.total || 0),
      amount_paid: Number(invoice.amount_paid || 0),
      balance_due: Number(invoice.balance_due || 0),
      tax_summary: taxSummary,
      notes: invoice.notes,
      terms: invoice.terms,
      signature_url: invoice.signature_url,
      bank_details: bankDetails,
    };
  }
}
