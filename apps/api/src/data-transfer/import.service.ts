import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

export type ImportEntityType = 'contacts' | 'products' | 'opening_balances';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: ValidationError[];
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────

  private async parseFile(buffer: Buffer, format: string): Promise<Record<string, string>[]> {
    const workbook = new ExcelJS.Workbook();

    if (format === 'csv' || format === 'text/csv') {
      await workbook.csv.read(require('stream').Readable.from(buffer));
    } else {
      await workbook.xlsx.load(buffer as any);
    }

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      throw new BadRequestException('File is empty or has no data rows');
    }

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, colNum) => {
      headers[colNum] = String(cell.value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    });

    const rows: Record<string, string>[] = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip header
      const record: Record<string, string> = {};
      row.eachCell((cell, colNum) => {
        const key = headers[colNum];
        if (key) {
          record[key] = cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : '';
        }
      });
      // Skip fully empty rows
      if (Object.values(record).some((v) => v !== '')) {
        rows.push(record);
      }
    });

    return rows;
  }

  private parseIndianDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    // Support DD/MM/YYYY, DD-MM-YYYY
    const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    }
    // Fallback to ISO parsing
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  private toNumber(val: string | undefined): number {
    if (!val) return 0;
    const cleaned = val.replace(/,/g, '').replace(/₹/g, '').trim();
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private normalizeHeader(header: string): string {
    return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }

  // ─── Validate Import Data ────────────────────────────────────

  validateImportData(rows: Record<string, string>[], type: ImportEntityType): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (type) {
      case 'contacts':
        rows.forEach((row, idx) => {
          const rowNum = idx + 2; // account for header row
          if (!row.name && !row.contact_name) {
            errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
          }
          if (!row.type && !row.contact_type) {
            errors.push({ row: rowNum, field: 'type', message: 'Type is required (customer, vendor, or both)' });
          } else {
            const t = (row.type || row.contact_type || '').toLowerCase();
            if (!['customer', 'vendor', 'both'].includes(t)) {
              errors.push({
                row: rowNum,
                field: 'type',
                message: 'Type must be customer, vendor, or both',
                value: t,
              });
            }
          }
          if (row.gstin) {
            const gstinPattern = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
            if (!gstinPattern.test(row.gstin.toUpperCase())) {
              errors.push({ row: rowNum, field: 'gstin', message: 'Invalid GSTIN format', value: row.gstin });
            }
          }
          if (row.pan) {
            const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panPattern.test(row.pan.toUpperCase())) {
              errors.push({ row: rowNum, field: 'pan', message: 'Invalid PAN format', value: row.pan });
            }
          }
          if (row.email) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(row.email)) {
              errors.push({ row: rowNum, field: 'email', message: 'Invalid email format', value: row.email });
            }
          }
        });
        break;

      case 'products':
        rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          if (!row.name && !row.product_name) {
            errors.push({ row: rowNum, field: 'name', message: 'Product name is required' });
          }
          if (row.selling_price && isNaN(Number(row.selling_price.replace(/,/g, '')))) {
            errors.push({ row: rowNum, field: 'selling_price', message: 'Invalid selling price', value: row.selling_price });
          }
          if (row.purchase_price && isNaN(Number(row.purchase_price.replace(/,/g, '')))) {
            errors.push({ row: rowNum, field: 'purchase_price', message: 'Invalid purchase price', value: row.purchase_price });
          }
          if (row.tax_rate) {
            const rate = Number(row.tax_rate);
            if (isNaN(rate) || rate < 0 || rate > 100) {
              errors.push({ row: rowNum, field: 'tax_rate', message: 'Tax rate must be between 0 and 100', value: row.tax_rate });
            }
          }
        });
        break;

      case 'opening_balances':
        rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          if (!row.account_code && !row.account_name) {
            errors.push({ row: rowNum, field: 'account', message: 'Account code or name is required' });
          }
          if (!row.opening_balance && !row.balance && !row.amount) {
            errors.push({ row: rowNum, field: 'balance', message: 'Opening balance amount is required' });
          }
        });
        break;
    }

    return errors;
  }

  // ─── Import: Contacts ─────────────────────────────────────────

  async importContacts(orgId: string, file: Buffer, format: string): Promise<ImportResult> {
    this.logger.log(`Importing contacts for org ${orgId}`);

    const rows = await this.parseFile(file, format);
    const errors = this.validateImportData(rows, 'contacts');

    if (errors.length > 0) {
      return { success: false, total: rows.length, imported: 0, skipped: rows.length, errors };
    }

    let imported = 0;
    let skipped = 0;
    const importErrors: ValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await this.prisma.contact.create({
          data: {
            org_id: orgId,
            name: row.name || row.contact_name || '',
            type: (row.type || row.contact_type || 'customer').toLowerCase(),
            company_name: row.company_name || null,
            gstin: row.gstin ? row.gstin.toUpperCase() : null,
            pan: row.pan ? row.pan.toUpperCase() : null,
            email: row.email || null,
            phone: row.phone || null,
            whatsapp: row.whatsapp || null,
            payment_terms: row.payment_terms ? Number(row.payment_terms) : 30,
            credit_limit: row.credit_limit ? this.toNumber(row.credit_limit) : null,
            opening_balance: this.toNumber(row.opening_balance),
            notes: row.notes || null,
            billing_address: row.billing_address ? this.tryParseJson(row.billing_address) : {},
            shipping_address: row.shipping_address ? this.tryParseJson(row.shipping_address) : {},
            is_active: true,
          },
        });
        imported++;
      } catch (error: any) {
        skipped++;
        importErrors.push({
          row: i + 2,
          field: 'general',
          message: error.message || 'Failed to create contact',
        });
      }
    }

    return {
      success: importErrors.length === 0,
      total: rows.length,
      imported,
      skipped,
      errors: importErrors,
    };
  }

  // ─── Import: Products ─────────────────────────────────────────

  async importProducts(orgId: string, file: Buffer, format: string): Promise<ImportResult> {
    this.logger.log(`Importing products for org ${orgId}`);

    const rows = await this.parseFile(file, format);
    const errors = this.validateImportData(rows, 'products');

    if (errors.length > 0) {
      return { success: false, total: rows.length, imported: 0, skipped: rows.length, errors };
    }

    let imported = 0;
    let skipped = 0;
    const importErrors: ValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await this.prisma.product.create({
          data: {
            org_id: orgId,
            name: row.name || row.product_name || '',
            sku: row.sku || null,
            description: row.description || null,
            type: (row.type || row.product_type || 'goods').toLowerCase(),
            hsn_code: row.hsn_code || row.hsn_sac || row.hsn || null,
            unit: row.unit || 'pcs',
            purchase_price: row.purchase_price ? this.toNumber(row.purchase_price) : null,
            selling_price: row.selling_price ? this.toNumber(row.selling_price) : null,
            tax_rate: row.tax_rate ? this.toNumber(row.tax_rate) : null,
            track_inventory: row.track_inventory ? row.track_inventory.toLowerCase() === 'yes' : true,
            reorder_level: row.reorder_level ? this.toNumber(row.reorder_level) : null,
            is_active: true,
          },
        });
        imported++;
      } catch (error: any) {
        skipped++;
        importErrors.push({
          row: i + 2,
          field: 'general',
          message: error.message || 'Failed to create product',
        });
      }
    }

    return {
      success: importErrors.length === 0,
      total: rows.length,
      imported,
      skipped,
      errors: importErrors,
    };
  }

  // ─── Import: Opening Balances ─────────────────────────────────

  async importOpeningBalances(orgId: string, file: Buffer): Promise<ImportResult> {
    this.logger.log(`Importing opening balances for org ${orgId}`);

    const rows = await this.parseFile(file, 'xlsx');
    const errors = this.validateImportData(rows, 'opening_balances');

    if (errors.length > 0) {
      return { success: false, total: rows.length, imported: 0, skipped: rows.length, errors };
    }

    let imported = 0;
    let skipped = 0;
    const importErrors: ValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Find account by code or name
        const where: any = { org_id: orgId };
        if (row.account_code) {
          where.code = row.account_code;
        } else {
          where.name = row.account_name;
        }

        const account = await this.prisma.account.findFirst({ where });

        if (!account) {
          importErrors.push({
            row: i + 2,
            field: 'account',
            message: `Account not found: ${row.account_code || row.account_name}`,
          });
          skipped++;
          continue;
        }

        const balance = this.toNumber(row.opening_balance || row.balance || row.amount);

        await this.prisma.account.update({
          where: { id: account.id },
          data: { opening_balance: balance },
        });
        imported++;
      } catch (error: any) {
        skipped++;
        importErrors.push({
          row: i + 2,
          field: 'general',
          message: error.message || 'Failed to update opening balance',
        });
      }
    }

    return {
      success: importErrors.length === 0,
      total: rows.length,
      imported,
      skipped,
      errors: importErrors,
    };
  }

  // ─── Import: Tally Data (XML) ─────────────────────────────────

  async importTallyData(orgId: string, file: Buffer): Promise<ImportResult> {
    this.logger.log(`Importing Tally data for org ${orgId}`);

    const xmlContent = file.toString('utf-8');
    let imported = 0;
    let skipped = 0;
    const errors: ValidationError[] = [];

    try {
      // Parse Tally XML — extract ledger groups and ledgers
      const ledgers = this.parseTallyLedgers(xmlContent);
      const parties = this.parseTallyParties(xmlContent);
      const stockItems = this.parseTallyStockItems(xmlContent);

      // Import Chart of Accounts from Tally ledger groups
      for (let i = 0; i < ledgers.length; i++) {
        const ledger = ledgers[i];
        try {
          // Map Tally group to Kontafy account type
          const accountType = this.mapTallyGroupToAccountType(ledger.group);

          await this.prisma.account.create({
            data: {
              org_id: orgId,
              name: ledger.name,
              code: ledger.code || null,
              type: accountType,
              sub_type: ledger.subGroup || null,
              opening_balance: ledger.openingBalance || 0,
              description: `Imported from Tally: ${ledger.group}`,
              is_active: true,
            },
          });
          imported++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            skipped++; // Duplicate, skip
          } else {
            errors.push({ row: i + 1, field: 'ledger', message: error.message });
            skipped++;
          }
        }
      }

      // Import contacts from Tally parties (sundry debtors/creditors)
      for (let i = 0; i < parties.length; i++) {
        const party = parties[i];
        try {
          await this.prisma.contact.create({
            data: {
              org_id: orgId,
              name: party.name,
              type: party.type,
              gstin: party.gstin || null,
              pan: party.pan || null,
              email: party.email || null,
              phone: party.phone || null,
              opening_balance: party.openingBalance || 0,
              billing_address: party.address ? { line1: party.address } : {},
              shipping_address: {},
              is_active: true,
            },
          });
          imported++;
        } catch (error: any) {
          skipped++;
          errors.push({ row: i + 1, field: 'party', message: error.message });
        }
      }

      // Import stock items
      for (let i = 0; i < stockItems.length; i++) {
        const item = stockItems[i];
        try {
          await this.prisma.product.create({
            data: {
              org_id: orgId,
              name: item.name,
              unit: item.unit || 'pcs',
              hsn_code: item.hsnCode || null,
              purchase_price: item.purchasePrice || null,
              selling_price: item.sellingPrice || null,
              tax_rate: item.gstRate || null,
              type: 'goods',
              track_inventory: true,
              is_active: true,
            },
          });
          imported++;
        } catch (error: any) {
          skipped++;
          errors.push({ row: i + 1, field: 'stock_item', message: error.message });
        }
      }
    } catch (error: any) {
      this.logger.error(`Tally import failed: ${error.message}`);
      return {
        success: false,
        total: 0,
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, field: 'xml', message: `Failed to parse Tally XML: ${error.message}` }],
      };
    }

    return {
      success: errors.length === 0,
      total: imported + skipped,
      imported,
      skipped,
      errors,
    };
  }

  // ─── Import: Busy Data (CSV) ──────────────────────────────────

  async importBusyData(orgId: string, file: Buffer): Promise<ImportResult> {
    this.logger.log(`Importing Busy data for org ${orgId}`);

    const rows = await this.parseFile(file, 'csv');
    let imported = 0;
    let skipped = 0;
    const errors: ValidationError[] = [];

    // Busy CSV exports typically have columns:
    // Account Name, Group, Opening Balance (Dr), Opening Balance (Cr), Address, GST No, PAN

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const accountName = row.account_name || row.name || row.ledger_name || '';
        const group = row.group || row.account_group || row.category || '';

        if (!accountName) {
          skipped++;
          continue;
        }

        // Determine if this is a contact (Sundry Debtor/Creditor) or a ledger account
        const groupLower = group.toLowerCase();
        const isDebtor = groupLower.includes('debtor') || groupLower.includes('receivable');
        const isCreditor = groupLower.includes('creditor') || groupLower.includes('payable');

        if (isDebtor || isCreditor) {
          // Create as contact
          const drBalance = this.toNumber(row.opening_balance__dr_ || row.dr_balance || row.debit || '0');
          const crBalance = this.toNumber(row.opening_balance__cr_ || row.cr_balance || row.credit || '0');
          const balance = drBalance - crBalance;

          await this.prisma.contact.create({
            data: {
              org_id: orgId,
              name: accountName,
              type: isDebtor ? 'customer' : 'vendor',
              gstin: (row.gst_no || row.gstin || '').toUpperCase() || null,
              pan: (row.pan || '').toUpperCase() || null,
              email: row.email || null,
              phone: row.phone || row.mobile || null,
              opening_balance: balance,
              billing_address: row.address ? { line1: row.address } : {},
              shipping_address: {},
              is_active: true,
            },
          });
          imported++;
        } else {
          // Create as ledger account
          const accountType = this.mapBusyGroupToAccountType(group);
          const drBalance = this.toNumber(row.opening_balance__dr_ || row.dr_balance || row.debit || '0');
          const crBalance = this.toNumber(row.opening_balance__cr_ || row.cr_balance || row.credit || '0');
          const balance = drBalance - crBalance;

          await this.prisma.account.create({
            data: {
              org_id: orgId,
              name: accountName,
              type: accountType,
              opening_balance: balance,
              description: `Imported from Busy: ${group}`,
              is_active: true,
            },
          });
          imported++;
        }
      } catch (error: any) {
        skipped++;
        if (error.code !== 'P2002') {
          errors.push({ row: i + 2, field: 'general', message: error.message });
        }
      }
    }

    return {
      success: errors.length === 0,
      total: rows.length,
      imported,
      skipped,
      errors,
    };
  }

  // ─── Template Generation ──────────────────────────────────────

  async getImportTemplate(type: ImportEntityType): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kontafy';

    switch (type) {
      case 'contacts': {
        const sheet = workbook.addWorksheet('Contacts Template');
        sheet.columns = [
          { header: 'Name *', key: 'name', width: 25 },
          { header: 'Type * (customer/vendor/both)', key: 'type', width: 28 },
          { header: 'Company Name', key: 'company_name', width: 25 },
          { header: 'GSTIN', key: 'gstin', width: 18 },
          { header: 'PAN', key: 'pan', width: 14 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Phone', key: 'phone', width: 16 },
          { header: 'WhatsApp', key: 'whatsapp', width: 16 },
          { header: 'Payment Terms (Days)', key: 'payment_terms', width: 20 },
          { header: 'Credit Limit', key: 'credit_limit', width: 16 },
          { header: 'Opening Balance', key: 'opening_balance', width: 18 },
          { header: 'Notes', key: 'notes', width: 30 },
        ];
        this.styleTemplateHeader(sheet);
        // Add sample row
        sheet.addRow({
          name: 'Acme Pvt. Ltd.',
          type: 'customer',
          company_name: 'Acme Private Limited',
          gstin: '29AABCU9603R1ZN',
          pan: 'AABCU9603R',
          email: 'info@acme.com',
          phone: '9876543210',
          whatsapp: '9876543210',
          payment_terms: 30,
          credit_limit: 500000,
          opening_balance: 25000,
          notes: 'Regular customer',
        });
        break;
      }

      case 'products': {
        const sheet = workbook.addWorksheet('Products Template');
        sheet.columns = [
          { header: 'Name *', key: 'name', width: 28 },
          { header: 'SKU', key: 'sku', width: 16 },
          { header: 'Description', key: 'description', width: 35 },
          { header: 'Type (goods/services)', key: 'type', width: 22 },
          { header: 'HSN/SAC Code', key: 'hsn_code', width: 14 },
          { header: 'Unit', key: 'unit', width: 10 },
          { header: 'Purchase Price', key: 'purchase_price', width: 16 },
          { header: 'Selling Price', key: 'selling_price', width: 16 },
          { header: 'Tax Rate %', key: 'tax_rate', width: 12 },
          { header: 'Track Inventory (Yes/No)', key: 'track_inventory', width: 24 },
          { header: 'Reorder Level', key: 'reorder_level', width: 14 },
        ];
        this.styleTemplateHeader(sheet);
        sheet.addRow({
          name: 'Widget Pro',
          sku: 'WDG-001',
          description: 'Professional grade widget',
          type: 'goods',
          hsn_code: '84719000',
          unit: 'pcs',
          purchase_price: 800,
          selling_price: 1200,
          tax_rate: 18,
          track_inventory: 'Yes',
          reorder_level: 50,
        });
        break;
      }

      case 'opening_balances': {
        const sheet = workbook.addWorksheet('Opening Balances Template');
        sheet.columns = [
          { header: 'Account Code', key: 'account_code', width: 16 },
          { header: 'Account Name', key: 'account_name', width: 28 },
          { header: 'Opening Balance (INR)', key: 'opening_balance', width: 22 },
        ];
        this.styleTemplateHeader(sheet);
        sheet.addRow({
          account_code: '1001',
          account_name: 'Cash in Hand',
          opening_balance: 150000,
        });
        sheet.addRow({
          account_code: '1002',
          account_name: 'Bank Account - SBI',
          opening_balance: 500000,
        });
        break;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ─── Dry-run Validation ───────────────────────────────────────

  async validateFile(
    file: Buffer,
    format: string,
    type: ImportEntityType,
  ): Promise<{
    valid: boolean;
    total: number;
    errors: ValidationError[];
    preview: Record<string, string>[];
  }> {
    const rows = await this.parseFile(file, format);
    const errors = this.validateImportData(rows, type);

    return {
      valid: errors.length === 0,
      total: rows.length,
      errors,
      preview: rows.slice(0, 10), // First 10 rows for preview
    };
  }

  private styleTemplateHeader(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E0F0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  }

  // ─── Tally XML Parsing Helpers ────────────────────────────────

  private parseTallyLedgers(xml: string): Array<{
    name: string;
    code: string | null;
    group: string;
    subGroup: string | null;
    openingBalance: number;
  }> {
    const ledgers: Array<{
      name: string;
      code: string | null;
      group: string;
      subGroup: string | null;
      openingBalance: number;
    }> = [];

    // Match Tally LEDGER entries: <LEDGER NAME="..."> ... </LEDGER>
    const ledgerRegex = /<LEDGER\s+NAME="([^"]*)"[^>]*>([\s\S]*?)<\/LEDGER>/gi;
    let match;

    while ((match = ledgerRegex.exec(xml)) !== null) {
      const name = match[1];
      const body = match[2];

      const group = this.extractTallyTag(body, 'PARENT') || 'Miscellaneous';
      const openingBalStr = this.extractTallyTag(body, 'OPENINGBALANCE') || '0';
      const code = this.extractTallyTag(body, 'LEDGERCODE');

      // Parse Tally balance format: "1234.56 Dr" or "-1234.56"
      let openingBalance = 0;
      const balMatch = openingBalStr.match(/([-\d.,]+)\s*(Dr|Cr)?/i);
      if (balMatch) {
        openingBalance = parseFloat(balMatch[1].replace(/,/g, ''));
        if (balMatch[2] && balMatch[2].toLowerCase() === 'cr') {
          openingBalance = -openingBalance;
        }
      }

      ledgers.push({
        name,
        code: code || null,
        group,
        subGroup: null,
        openingBalance,
      });
    }

    return ledgers;
  }

  private parseTallyParties(xml: string): Array<{
    name: string;
    type: string;
    gstin: string | null;
    pan: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    openingBalance: number;
  }> {
    const parties: Array<{
      name: string;
      type: string;
      gstin: string | null;
      pan: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      openingBalance: number;
    }> = [];

    const ledgerRegex = /<LEDGER\s+NAME="([^"]*)"[^>]*>([\s\S]*?)<\/LEDGER>/gi;
    let match;

    while ((match = ledgerRegex.exec(xml)) !== null) {
      const name = match[1];
      const body = match[2];
      const group = (this.extractTallyTag(body, 'PARENT') || '').toLowerCase();

      // Only process sundry debtors and creditors as contacts
      const isDebtor = group.includes('sundry debtor') || group.includes('receivable');
      const isCreditor = group.includes('sundry creditor') || group.includes('payable');

      if (!isDebtor && !isCreditor) continue;

      const openingBalStr = this.extractTallyTag(body, 'OPENINGBALANCE') || '0';
      let openingBalance = 0;
      const balMatch = openingBalStr.match(/([-\d.,]+)\s*(Dr|Cr)?/i);
      if (balMatch) {
        openingBalance = parseFloat(balMatch[1].replace(/,/g, ''));
        if (balMatch[2] && balMatch[2].toLowerCase() === 'cr') {
          openingBalance = -openingBalance;
        }
      }

      parties.push({
        name,
        type: isDebtor ? 'customer' : 'vendor',
        gstin: this.extractTallyTag(body, 'GSTIN') || this.extractTallyTag(body, 'PARTYGSTIN') || null,
        pan: this.extractTallyTag(body, 'INCOMETAXNUMBER') || this.extractTallyTag(body, 'PANNO') || null,
        email: this.extractTallyTag(body, 'EMAIL') || null,
        phone: this.extractTallyTag(body, 'PHONENUMBER') || this.extractTallyTag(body, 'LEDGERPHONE') || null,
        address: this.extractTallyTag(body, 'ADDRESS') || null,
        openingBalance,
      });
    }

    return parties;
  }

  private parseTallyStockItems(xml: string): Array<{
    name: string;
    unit: string | null;
    hsnCode: string | null;
    purchasePrice: number | null;
    sellingPrice: number | null;
    gstRate: number | null;
  }> {
    const items: Array<{
      name: string;
      unit: string | null;
      hsnCode: string | null;
      purchasePrice: number | null;
      sellingPrice: number | null;
      gstRate: number | null;
    }> = [];

    const itemRegex = /<STOCKITEM\s+NAME="([^"]*)"[^>]*>([\s\S]*?)<\/STOCKITEM>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const name = match[1];
      const body = match[2];

      const unit = this.extractTallyTag(body, 'BASEUNITS') || this.extractTallyTag(body, 'UNIT');
      const hsnCode = this.extractTallyTag(body, 'HSNCODE') || this.extractTallyTag(body, 'HSNDESCRIPTION');
      const gstRateStr = this.extractTallyTag(body, 'GSTRATE') || this.extractTallyTag(body, 'TAXRATE');

      const rateStr = this.extractTallyTag(body, 'RATEOFSTOCKITEM');
      let sellingPrice: number | null = null;
      if (rateStr) {
        const numMatch = rateStr.match(/([\d.,]+)/);
        if (numMatch) sellingPrice = parseFloat(numMatch[1].replace(/,/g, ''));
      }

      items.push({
        name,
        unit: unit || null,
        hsnCode: hsnCode || null,
        purchasePrice: null,
        sellingPrice,
        gstRate: gstRateStr ? parseFloat(gstRateStr) : null,
      });
    }

    return items;
  }

  private extractTallyTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  private mapTallyGroupToAccountType(group: string): string {
    const g = group.toLowerCase();

    if (g.includes('cash') || g.includes('bank') || g.includes('current asset')) return 'asset';
    if (g.includes('fixed asset') || g.includes('investment')) return 'asset';
    if (g.includes('sundry debtor') || g.includes('receivable')) return 'asset';
    if (g.includes('stock') || g.includes('inventory')) return 'asset';
    if (g.includes('deposit') || g.includes('loan') && g.includes('advance')) return 'asset';

    if (g.includes('sundry creditor') || g.includes('payable')) return 'liability';
    if (g.includes('current liabilit')) return 'liability';
    if (g.includes('provision') || g.includes('duty') || g.includes('tax')) return 'liability';
    if (g.includes('secured loan') || g.includes('unsecured loan') || g.includes('loan')) return 'liability';

    if (g.includes('capital') || g.includes('reserve') || g.includes('retained')) return 'equity';

    if (g.includes('sales') || g.includes('revenue') || g.includes('income') || g.includes('direct income')) return 'income';
    if (g.includes('indirect income')) return 'income';

    if (g.includes('purchase') || g.includes('direct expense')) return 'expense';
    if (g.includes('indirect expense') || g.includes('expense') || g.includes('cost')) return 'expense';

    return 'asset'; // Default fallback
  }

  private mapBusyGroupToAccountType(group: string): string {
    const g = group.toLowerCase();

    if (g.includes('asset') || g.includes('cash') || g.includes('bank') || g.includes('debtor')) return 'asset';
    if (g.includes('stock') || g.includes('inventory') || g.includes('receivable')) return 'asset';

    if (g.includes('liabilit') || g.includes('creditor') || g.includes('payable') || g.includes('loan')) return 'liability';
    if (g.includes('duty') || g.includes('provision')) return 'liability';

    if (g.includes('capital') || g.includes('equity') || g.includes('reserve')) return 'equity';

    if (g.includes('income') || g.includes('revenue') || g.includes('sales')) return 'income';

    if (g.includes('expense') || g.includes('purchase') || g.includes('cost')) return 'expense';

    return 'asset';
  }

  private tryParseJson(value: string): Record<string, any> {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' ? parsed : { line1: value };
    } catch {
      return { line1: value };
    }
  }
}
