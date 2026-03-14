import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { invoiceTemplate } from './templates/invoice.template';
import { reminderTemplate } from './templates/reminder.template';
import { receiptTemplate } from './templates/receipt.template';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private whatsappQueue: Queue;

  /** WhatsApp provider config */
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly senderNumber: string;
  private readonly provider: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.provider = this.configService.get<string>('WHATSAPP_PROVIDER', 'gupshup');
    this.apiUrl = this.configService.get<string>(
      'WHATSAPP_API_URL',
      'https://api.gupshup.io/wa/api/v1/msg',
    );
    this.apiKey = this.configService.get<string>('WHATSAPP_API_KEY', '');
    this.senderNumber = this.configService.get<string>('WHATSAPP_SENDER_NUMBER', '');

    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.whatsappQueue = new Queue('whatsapp', {
      connection: { host: redisHost, port: redisPort },
    });
  }

  /**
   * Send an invoice via WhatsApp — queues a background job.
   */
  async sendInvoice(invoiceId: string, orgId: string, phoneNumber: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      include: {
        contact: true,
        payment_links: { where: { status: 'active' }, take: 1 },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.contact) {
      throw new BadRequestException('Invoice has no associated contact');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, currency: true },
    });

    const message = invoiceTemplate({
      contactName: invoice.contact.name,
      invoiceNumber: invoice.invoice_number,
      amount: this.formatAmount(invoice.total, org?.currency),
      dueDate: invoice.due_date
        ? invoice.due_date.toLocaleDateString('en-IN')
        : undefined,
      paymentLink: invoice.payment_links?.[0]?.link_url ?? undefined,
      orgName: org?.name || 'Kontafy',
    });

    // Create message record
    const whatsappMessage = await this.prisma.whatsAppMessage.create({
      data: {
        org_id: orgId,
        contact_id: invoice.contact.id,
        invoice_id: invoiceId,
        type: 'invoice',
        status: 'queued',
        phone: phoneNumber,
        template: message,
      },
    });

    // Add to queue
    await this.whatsappQueue.add(
      'send-invoice',
      {
        messageId: whatsappMessage.id,
        phone: phoneNumber,
        message,
        pdfUrl: invoice.pdf_url,
        orgId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    // Mark invoice as whatsapp_sent
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { whatsapp_sent: true },
    });

    this.logger.log(`Queued WhatsApp invoice message for ${phoneNumber}`);

    return {
      message: 'Invoice queued for WhatsApp delivery',
      messageId: whatsappMessage.id,
    };
  }

  /**
   * Send a payment reminder for an overdue invoice.
   */
  async sendPaymentReminder(invoiceId: string, orgId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      include: {
        contact: true,
        payment_links: { where: { status: 'active' }, take: 1 },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.contact) {
      throw new BadRequestException('Invoice has no associated contact');
    }

    const phone = invoice.contact.whatsapp || invoice.contact.phone;
    if (!phone) {
      throw new BadRequestException('Contact has no phone or WhatsApp number');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, currency: true },
    });

    const daysOverdue = invoice.due_date
      ? Math.max(0, Math.floor((Date.now() - invoice.due_date.getTime()) / 86400000))
      : 0;

    const message = reminderTemplate({
      contactName: invoice.contact.name,
      invoiceNumber: invoice.invoice_number,
      amount: this.formatAmount(invoice.balance_due ?? invoice.total, org?.currency),
      daysOverdue,
      paymentLink: invoice.payment_links?.[0]?.link_url ?? undefined,
      orgName: org?.name || 'Kontafy',
    });

    const whatsappMessage = await this.prisma.whatsAppMessage.create({
      data: {
        org_id: orgId,
        contact_id: invoice.contact.id,
        invoice_id: invoiceId,
        type: 'reminder',
        status: 'queued',
        phone,
        template: message,
      },
    });

    await this.whatsappQueue.add(
      'send-reminder',
      {
        messageId: whatsappMessage.id,
        phone,
        message,
        orgId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`Queued WhatsApp reminder for invoice ${invoice.invoice_number}`);

    return {
      message: 'Reminder queued for WhatsApp delivery',
      messageId: whatsappMessage.id,
    };
  }

  /**
   * Send a payment receipt confirmation.
   */
  async sendPaymentReceipt(paymentId: string, orgId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, org_id: orgId },
      include: { contact: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.contact) {
      throw new BadRequestException('Payment has no associated contact');
    }

    const phone = payment.contact.whatsapp || payment.contact.phone;
    if (!phone) {
      throw new BadRequestException('Contact has no phone or WhatsApp number');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, currency: true },
    });

    const message = receiptTemplate({
      contactName: payment.contact.name,
      amount: this.formatAmount(payment.amount, org?.currency),
      paymentDate: payment.date.toLocaleDateString('en-IN'),
      paymentMethod: payment.method ?? undefined,
      reference: payment.reference ?? undefined,
      orgName: org?.name || 'Kontafy',
    });

    const whatsappMessage = await this.prisma.whatsAppMessage.create({
      data: {
        org_id: orgId,
        contact_id: payment.contact.id,
        type: 'receipt',
        status: 'queued',
        phone,
        template: message,
      },
    });

    await this.whatsappQueue.add(
      'send-receipt',
      {
        messageId: whatsappMessage.id,
        phone,
        message,
        orgId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`Queued WhatsApp receipt for payment ${paymentId}`);

    return {
      message: 'Receipt queued for WhatsApp delivery',
      messageId: whatsappMessage.id,
    };
  }

  /**
   * Find all overdue invoices and queue reminder messages for each.
   */
  async sendBulkReminders(orgId: string) {
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        status: { in: ['sent', 'overdue', 'partially_paid'] },
        due_date: { lt: new Date() },
        contact: {
          OR: [
            { whatsapp: { not: null } },
            { phone: { not: null } },
          ],
        },
      },
      select: { id: true },
    });

    let queued = 0;
    let failed = 0;

    for (const invoice of overdueInvoices) {
      try {
        await this.sendPaymentReminder(invoice.id, orgId);
        queued++;
      } catch (error) {
        this.logger.warn(`Failed to queue reminder for invoice ${invoice.id}: ${error.message}`);
        failed++;
      }
    }

    this.logger.log(`Bulk reminders: ${queued} queued, ${failed} failed out of ${overdueInvoices.length}`);

    return {
      total: overdueInvoices.length,
      queued,
      failed,
    };
  }

  /**
   * Get message history for a contact.
   */
  async getMessageHistory(contactId: string, orgId: string) {
    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { contact_id: contactId, org_id: orgId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return { data: messages };
  }

  /**
   * Get dashboard stats: messages sent today, delivered, failed.
   */
  async getStats(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sentToday, delivered, failed, total] = await Promise.all([
      this.prisma.whatsAppMessage.count({
        where: { org_id: orgId, created_at: { gte: today } },
      }),
      this.prisma.whatsAppMessage.count({
        where: { org_id: orgId, status: 'delivered' },
      }),
      this.prisma.whatsAppMessage.count({
        where: { org_id: orgId, status: 'failed' },
      }),
      this.prisma.whatsAppMessage.count({
        where: { org_id: orgId },
      }),
    ]);

    return { sentToday, delivered, failed, total };
  }

  /**
   * Get recent messages for the dashboard.
   */
  async getRecentMessages(orgId: string, limit = 20) {
    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return { data: messages };
  }

  /**
   * Handle delivery status webhook from the WhatsApp provider.
   */
  async handleWebhook(payload: {
    messageId: string;
    status: string;
    timestamp?: string;
    error?: string;
  }) {
    const message = await this.prisma.whatsAppMessage.findFirst({
      where: { provider_message_id: payload.messageId },
    });

    if (!message) {
      this.logger.warn(`Webhook: unknown provider message ID ${payload.messageId}`);
      return { received: true };
    }

    const updateData: Record<string, any> = {
      status: payload.status,
    };

    if (payload.status === 'delivered' && payload.timestamp) {
      updateData.delivered_at = new Date(payload.timestamp);
    }

    if (payload.status === 'read' && payload.timestamp) {
      updateData.read_at = new Date(payload.timestamp);
    }

    if (payload.status === 'failed' && payload.error) {
      updateData.error = payload.error;
    }

    await this.prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: updateData,
    });

    this.logger.log(`Webhook: updated message ${message.id} to status ${payload.status}`);

    return { received: true };
  }

  /**
   * Send a message via the configured WhatsApp provider (Gupshup / generic).
   * Called by the BullMQ processor.
   */
  async sendViaProvider(
    phone: string,
    message: string,
    mediaUrl?: string,
  ): Promise<{ providerMessageId: string }> {
    if (!this.apiKey) {
      throw new BadRequestException(
        'WhatsApp API key is not configured. Set WHATSAPP_API_KEY in environment.',
      );
    }

    const body: Record<string, any> = {
      channel: 'whatsapp',
      source: this.senderNumber,
      destination: phone,
      message: { type: 'text', text: message },
    };

    if (mediaUrl) {
      body['message'] = {
        type: 'document',
        url: mediaUrl,
        filename: 'invoice.pdf',
        caption: message,
      };
    }

    // Provider-specific request formatting
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.provider === 'gupshup') {
      headers['apikey'] = this.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`WhatsApp API error: ${response.status} — ${errorBody}`);
      throw new Error(`WhatsApp API returned ${response.status}: ${errorBody}`);
    }

    const result = await response.json();

    // Gupshup returns messageId, generic providers may return id
    const providerMessageId =
      result.messageId || result.id || result.message_id || 'unknown';

    return { providerMessageId };
  }

  private formatAmount(
    amount: any,
    currency?: string | null,
  ): string {
    const num = typeof amount === 'object' && amount !== null
      ? parseFloat(amount.toString())
      : Number(amount) || 0;

    const currencyCode = currency || 'INR';
    const symbol = currencyCode === 'INR' ? '\u20B9' : currencyCode;

    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
