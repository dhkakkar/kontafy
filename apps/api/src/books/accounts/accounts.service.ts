import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all accounts for an organization, optionally filtered.
   */
  async findAll(orgId: string, filters?: { type?: string; activeOnly?: boolean }) {
    const where: any = { org_id: orgId };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.activeOnly) {
      where.is_active = true;
    }

    const accounts = await this.prisma.account.findMany({
      where,
      orderBy: [{ code: 'asc' }],
    });

    return accounts;
  }

  /**
   * Get a single account by ID.
   */
  async findOne(orgId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  /**
   * Create a new account in the chart of accounts.
   */
  async create(
    orgId: string,
    data: {
      code: string;
      name: string;
      type: string;
      sub_type?: string;
      parent_id?: string;
      opening_balance?: number;
      description?: string;
    },
  ) {
    // The GlobalExceptionFilter maps HttpException payloads into
    // { code: resp.error, message: resp.message, details: resp.details }.
    // So to surface a field-level error to the client we set `error` (the
    // machine code), `message` (human text), and `details: { field }`. The
    // frontend reads `details.field` to render inline errors on the right
    // input — without this, the modal had no way to tell which field was
    // bad and the whole thing looked like a silent save failure.

    const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException({
        error: 'INVALID_TYPE',
        message: `Invalid account type. Must be one of: ${validTypes.join(', ')}`,
        details: { field: 'type' },
      });
    }

    const code = (data.code || '').trim();
    const name = (data.name || '').trim();
    if (!code) {
      throw new BadRequestException({
        error: 'REQUIRED',
        message: 'Account code is required',
        details: { field: 'code' },
      });
    }
    if (!name) {
      throw new BadRequestException({
        error: 'REQUIRED',
        message: 'Account name is required',
        details: { field: 'name' },
      });
    }

    const existingByCode = await this.prisma.account.findFirst({
      where: { org_id: orgId, code },
      select: { id: true, code: true, name: true },
    });
    if (existingByCode) {
      throw new ConflictException({
        error: 'DUPLICATE_CODE',
        message: `Code ${code} is already used by "${existingByCode.name}". Try a different code.`,
        details: {
          field: 'code',
          existing: { code: existingByCode.code, name: existingByCode.name },
        },
      });
    }

    // Case-insensitive name uniqueness. Without this, two ledgers with
    // identical display names (e.g. "Bank Charges" twice with different
    // codes) can both exist and confuse every ledger picker downstream.
    const existingByName = await this.prisma.account.findFirst({
      where: {
        org_id: orgId,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true, code: true, name: true },
    });
    if (existingByName) {
      throw new ConflictException({
        error: 'DUPLICATE_NAME',
        message: `An account named "${existingByName.name}" already exists (code ${existingByName.code}).`,
        details: {
          field: 'name',
          existing: { code: existingByName.code, name: existingByName.name },
        },
      });
    }

    if (data.parent_id) {
      const parent = await this.prisma.account.findFirst({
        where: { id: data.parent_id, org_id: orgId },
      });
      if (!parent) {
        throw new BadRequestException({
          error: 'INVALID_PARENT',
          message: 'Parent account not found',
          details: { field: 'parent_id' },
        });
      }
    }

    const openingAmount = Number(data.opening_balance) || 0;
    if (openingAmount < 0) {
      throw new BadRequestException({
        error: 'INVALID_OPENING_BALANCE',
        message:
          'Opening balance cannot be negative. Use the Dr/Cr toggle to set direction.',
        details: { field: 'opening_balance' },
      });
    }

    const account = await this.prisma.account.create({
      data: {
        org_id: orgId,
        code,
        name,
        type: data.type,
        sub_type: data.sub_type,
        parent_id: data.parent_id,
        opening_balance: openingAmount,
        description: data.description,
        is_system: false,
        is_active: true,
      },
    });

    // If the user entered a non-zero opening balance, post the contra
    // journal against the suspense account (3099) so the Trial Balance
    // reflects it immediately. Done outside the create() transaction so a
    // posting failure doesn't lose the account — instead we warn-log and
    // the user can retry from the bulk OB screen (Phase 2).
    if (openingAmount > 0) {
      const drCr =
        data.opening_dr_cr ||
        (data.type === 'asset' || data.type === 'expense' ? 'Dr' : 'Cr');
      try {
        await this.postOpeningBalanceJournal(
          orgId,
          account.id,
          openingAmount,
          drCr,
          data.opening_date,
        );
      } catch (err) {
        this.logger.warn(
          `Account ${code} created but opening-balance journal failed: ${(err as Error).message}`,
        );
      }
    }

    return account;
  }

  /**
   * Update account details. System accounts have limited editable fields.
   */
  async update(
    orgId: string,
    id: string,
    data: {
      name?: string;
      code?: string;
      sub_type?: string;
      description?: string;
      is_active?: boolean;
      opening_balance?: number;
      opening_dr_cr?: 'Dr' | 'Cr';
      opening_date?: string;
    },
  ) {
    const account = await this.prisma.account.findFirst({
      where: { id, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // System accounts: name, description, and opening_balance can be
    // updated (Owner's Capital opening is the obvious use case). Code /
    // type / structure stays locked.
    if (account.is_system) {
      const allowedKeys = [
        'name',
        'description',
        'opening_balance',
        'opening_dr_cr',
        'opening_date',
      ];
      const attemptedKeys = Object.keys(data).filter(
        (k) => data[k as keyof typeof data] !== undefined,
      );
      const disallowed = attemptedKeys.filter((k) => !allowedKeys.includes(k));
      if (disallowed.length > 0) {
        throw new BadRequestException(
          `System accounts can only update: ${allowedKeys.join(', ')}`,
        );
      }
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== account.code) {
      const existing = await this.prisma.account.findFirst({
        where: { org_id: orgId, code: data.code },
      });
      if (existing) {
        throw new ConflictException(`Account code "${data.code}" already exists`);
      }
    }

    // Separate opening-balance fields from the regular column writes —
    // those go to a journal entry, not the Account row's opening_balance
    // column (which we still keep in sync as a denormalised snapshot).
    const { opening_balance, opening_dr_cr, opening_date, ...columnData } = data;

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        ...columnData,
        ...(opening_balance !== undefined ? { opening_balance } : {}),
      },
    });

    if (opening_balance !== undefined) {
      const amount = Number(opening_balance) || 0;
      if (amount < 0) {
        throw new BadRequestException({
          error: 'INVALID_OPENING_BALANCE',
          message: 'Opening balance cannot be negative.',
          details: { field: 'opening_balance' },
        });
      }
      const drCr =
        opening_dr_cr ||
        (account.type === 'asset' || account.type === 'expense' ? 'Dr' : 'Cr');
      try {
        await this.postOpeningBalanceJournal(
          orgId,
          id,
          amount,
          drCr,
          opening_date,
        );
      } catch (err) {
        this.logger.warn(
          `Opening-balance journal sync failed for account ${account.code}: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }

  /**
   * Delete an account. Cannot delete system accounts or accounts with transactions.
   */
  async remove(orgId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.is_system) {
      throw new BadRequestException('System accounts cannot be deleted');
    }

    // Check if account has journal lines
    const lineCount = await this.prisma.journalLine.count({
      where: { account_id: id },
    });
    if (lineCount > 0) {
      throw new BadRequestException(
        'Cannot delete account with existing transactions. Deactivate it instead.',
      );
    }

    // Check for child accounts
    const childCount = await this.prisma.account.count({
      where: { parent_id: id },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot delete account with child accounts. Remove children first.',
      );
    }

    await this.prisma.account.delete({ where: { id } });

    return { message: 'Account deleted successfully' };
  }

  /**
   * Get accounts as a hierarchical tree structure with computed balances.
   */
  async getTree(orgId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId, is_active: true },
      orderBy: { code: 'asc' },
    });

    // Aggregate debit/credit totals per account from posted journal entries
    const balances = await this.prisma.journalLine.groupBy({
      by: ['account_id'],
      where: {
        entry: { org_id: orgId, is_posted: true },
      },
      _sum: { debit: true, credit: true },
    });

    const balanceMap = new Map<string, { debit: number; credit: number }>();
    for (const b of balances) {
      balanceMap.set(b.account_id, {
        debit: Number(b._sum.debit || 0),
        credit: Number(b._sum.credit || 0),
      });
    }

    // Build tree from flat list
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const account of accounts) {
      const txn = balanceMap.get(account.id) || { debit: 0, credit: 0 };
      const opening = Number(account.opening_balance || 0);

      // Asset & Expense: debit-normal; Liability, Equity, Income: credit-normal
      const isDebitNormal = ['asset', 'expense'].includes(account.type);
      const balance = isDebitNormal
        ? opening + txn.debit - txn.credit
        : opening + txn.credit - txn.debit;

      map.set(account.id, { ...account, balance, children: [] });
    }

    for (const account of accounts) {
      const node = map.get(account.id);
      if (account.parent_id && map.has(account.parent_id)) {
        map.get(account.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Roll up children balances to parent accounts
    const rollUp = (node: any): number => {
      if (node.children.length === 0) return node.balance;
      let childTotal = 0;
      for (const child of node.children) {
        childTotal += rollUp(child);
      }
      node.balance = childTotal;
      return node.balance;
    };

    for (const root of roots) {
      rollUp(root);
    }

    return roots;
  }

  // ──────────────────────────────────────────────────────────
  // Excel export
  // ──────────────────────────────────────────────────────────

  /**
   * Build a styled .xlsx representation of the chart of accounts. Returns a
   * Buffer + a sanitized filename — the controller wires the response
   * headers. Two sheets: the main "Chart of Accounts" table and a "Summary"
   * tab with by-type / by-status counts so the CA reviewing the file gets
   * the totals up front.
   */
  async exportXlsx(
    orgId: string,
    filters: {
      type?: string;
      search?: string;
      includeInactive: boolean;
      includeSystem: boolean;
    },
  ): Promise<{ buffer: Buffer; filename: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const where: any = { org_id: orgId };
    if (filters.type && filters.type !== 'all') where.type = filters.type;
    if (!filters.includeInactive) where.is_active = true;
    if (!filters.includeSystem) where.is_system = false;
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const accounts = await this.prisma.account.findMany({
      where,
      orderBy: [{ code: 'asc' }],
    });

    // Build a map for parent-code lookups so we can render the parent column
    // without a second query. We may have parents that were filtered out of
    // `accounts`; fetch them on demand for those cases.
    const parentIds = Array.from(
      new Set(
        accounts
          .map((a) => a.parent_id)
          .filter((id): id is string => !!id),
      ),
    );
    const parents = parentIds.length
      ? await this.prisma.account.findMany({
          where: { id: { in: parentIds } },
          select: { id: true, code: true, name: true },
        })
      : [];
    const parentMap = new Map(parents.map((p) => [p.id, p]));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Kontafy';
    wb.created = new Date();

    const main = wb.addWorksheet('Chart of Accounts', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const headers = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'A/c Code', key: 'code', width: 12 },
      { header: 'Account Type', key: 'type', width: 14 },
      { header: 'Account Name', key: 'name', width: 35 },
      { header: 'Group / Category', key: 'sub_type', width: 25 },
      { header: 'Parent Account', key: 'parent', width: 25 },
      { header: 'Opening Balance (₹)', key: 'opening', width: 18 },
      { header: 'Dr/Cr', key: 'drcr', width: 8 },
      { header: 'Current Balance (₹)', key: 'balance', width: 18 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'System Locked', key: 'locked', width: 14 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];
    main.columns = headers as any;

    // Header row formatting — dark blue background, white bold, centered.
    const headerRow = main.getRow(1);
    headerRow.height = 22;
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF888888' } },
        bottom: { style: 'thin', color: { argb: 'FF888888' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    });

    // Auto-filter on the header row so the user can filter in Excel directly.
    main.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };

    // Type → tint colour for the Account Type cell.
    const typeColors: Record<string, string> = {
      asset: 'FFDDEBF7',
      liability: 'FFFCE4D6',
      equity: 'FFE2EFDA',
      income: 'FFFFF2CC',
      expense: 'FFF8CBAD',
    };
    // For asset/expense accounts, a positive opening_balance is a debit;
    // for liability/equity/income it's a credit. Matches Trial Balance
    // convention used elsewhere in the app.
    const isDebitNormal = (type: string) =>
      type === 'asset' || type === 'expense';

    accounts.forEach((a, idx) => {
      const parent = a.parent_id ? parentMap.get(a.parent_id) : null;
      const opening = Number(a.opening_balance || 0);
      const row = main.addRow({
        sno: idx + 1,
        code: a.code,
        type: a.type.charAt(0).toUpperCase() + a.type.slice(1),
        name: a.name,
        sub_type: a.sub_type || '',
        parent: parent ? `${parent.code} - ${parent.name}` : '',
        opening,
        drcr: isDebitNormal(a.type) ? 'Dr' : 'Cr',
        // Current balance isn't denormalised on the Account row; without
        // running the trial-balance roll-up here we'd be guessing, so we
        // ship opening only and leave the column blank. (Future: pass
        // tree balances in.)
        balance: '',
        status: a.is_active ? 'Active' : 'Inactive',
        locked: a.is_system ? 'Yes' : 'No',
        notes: a.description || '',
      });

      row.font = { name: 'Arial', size: 10 };
      row.height = 18;

      // Type cell colour-band.
      const typeCell = row.getCell('type');
      typeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: typeColors[a.type] || 'FFFFFFFF' },
      };
      typeCell.alignment = { horizontal: 'center' };

      // Code cell — bold dark blue.
      const codeCell = row.getCell('code');
      codeCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F4E78' } };

      // Money formatting on opening + current balance.
      row.getCell('opening').numFmt = '#,##0.00';
      row.getCell('opening').alignment = { horizontal: 'right' };
      row.getCell('balance').numFmt = '#,##0.00';
      row.getCell('balance').alignment = { horizontal: 'right' };
      row.getCell('drcr').alignment = { horizontal: 'center' };

      // System-locked rows: subtle gray banding so they're visually distinct.
      if (a.is_system) {
        row.eachCell((cell, colNumber) => {
          // Don't overwrite the colour-banded type cell.
          if (colNumber === 3) return;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' },
          };
        });
      }
    });

    // ── Summary sheet ───────────────────────────────────────
    const summary = wb.addWorksheet('Summary');
    summary.columns = [
      { header: '', key: 'label', width: 36 },
      { header: '', key: 'value', width: 28 },
    ];

    const totalRow = (label: string, value: string | number) => {
      const r = summary.addRow({ label, value });
      r.getCell('label').font = { name: 'Arial', size: 10, bold: true };
      r.getCell('value').font = { name: 'Arial', size: 10 };
      r.getCell('value').alignment = { horizontal: 'right' };
    };
    const sectionHeader = (label: string) => {
      const r = summary.addRow({ label, value: '' });
      r.getCell('label').font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      r.getCell('label').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
      r.getCell('value').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
    };

    const title = summary.addRow({
      label: 'Chart of Accounts Summary',
      value: '',
    });
    title.getCell('label').font = { name: 'Arial', size: 14, bold: true };
    summary.addRow({});
    totalRow('Organization', org.name);
    totalRow(
      'Exported on',
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    );
    totalRow('Total Accounts', accounts.length);
    if (filters.type && filters.type !== 'all') {
      totalRow('Filter (type)', filters.type);
    }
    if (filters.search) {
      totalRow('Filter (search)', filters.search);
    }
    summary.addRow({});
    sectionHeader('By Account Type');
    const byType = new Map<string, number>();
    for (const a of accounts) {
      byType.set(a.type, (byType.get(a.type) || 0) + 1);
    }
    for (const t of ['asset', 'liability', 'equity', 'income', 'expense']) {
      const c = byType.get(t) || 0;
      if (c > 0) totalRow(t.charAt(0).toUpperCase() + t.slice(1), `${c} ledgers`);
    }
    summary.addRow({});
    sectionHeader('Status');
    const sys = accounts.filter((a) => a.is_system).length;
    const active = accounts.filter((a) => a.is_active).length;
    totalRow('System-Locked', `${sys} ledgers`);
    totalRow('User-Created', `${accounts.length - sys} ledgers`);
    totalRow('Active', `${active} ledgers`);
    totalRow('Inactive', `${accounts.length - active} ledgers`);

    const arrayBuffer = await wb.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

    // Filename: ChartOfAccounts_{OrgName}_{YYYY-MM-DD}.xlsx — strip
    // non-word characters from the org name so the OS doesn't reject the
    // download, and use the IST date so it matches what the user sees.
    const safeOrg = (org.name || 'Org')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'Org';
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    });
    const filename = `ChartOfAccounts_${safeOrg}_${today}.xlsx`;

    return { buffer, filename };
  }

  // ──────────────────────────────────────────────────────────
  // Opening balance journal
  // ──────────────────────────────────────────────────────────

  /**
   * Create or replace the opening-balance journal for a single account.
   * The contra side always lands on the suspense ledger (code 3099); when
   * every account's opening is entered the suspense balance net-zeros, so
   * a non-zero 3099 balance flags an unbalanced opening trial. We also
   * keep Account.opening_balance in sync as a denormalised snapshot for
   * faster Balance Sheet / Trial Balance reads.
   *
   * Idempotent: any prior journal tagged reference_type='opening_balance'
   * + reference_id=accountId is removed first, so editing an opening
   * balance never leaves stale duplicates.
   */
  private async postOpeningBalanceJournal(
    orgId: string,
    accountId: string,
    amount: number,
    drCr: 'Dr' | 'Cr',
    dateIso?: string,
  ) {
    if (amount <= 0) {
      // Nothing to post; still wipe any prior OB journal for this account
      // so an "amount went from 50000 to 0" edit doesn't leave a ghost.
      await this.deleteOpeningBalanceJournal(orgId, accountId);
      return;
    }

    const suspense = await this.ensureSuspenseAccount(orgId);
    if (suspense.id === accountId) {
      throw new BadRequestException(
        'Opening balance cannot be posted against the suspense account itself',
      );
    }

    const date = dateIso ? new Date(dateIso) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        error: 'INVALID_DATE',
        message: 'Invalid opening balance date',
        details: { field: 'opening_date' },
      });
    }

    // Remove any prior OB journal for this account so we don't double-post.
    await this.deleteOpeningBalanceJournal(orgId, accountId);

    // Build the two balanced lines. Dr on the account means the suspense
    // side is Cr (and vice versa) — standard double-entry.
    const accountLine =
      drCr === 'Dr'
        ? { account_id: accountId, debit: amount, credit: 0 }
        : { account_id: accountId, debit: 0, credit: amount };
    const suspenseLine =
      drCr === 'Dr'
        ? { account_id: suspense.id, debit: 0, credit: amount }
        : { account_id: suspense.id, debit: amount, credit: 0 };

    const entry = await this.prisma.journalEntry.create({
      data: {
        org_id: orgId,
        date,
        narration: 'Opening Balance',
        reference: `OB-${date.toISOString().slice(0, 10)}`,
        reference_type: 'opening_balance',
        reference_id: accountId,
        is_posted: true,
      },
    });
    await this.prisma.journalLine.createMany({
      data: [
        { entry_id: entry.id, ...accountLine },
        { entry_id: entry.id, ...suspenseLine },
      ],
    });
  }

  /**
   * Remove any opening-balance journal previously posted for an account.
   * Used both when the amount changes (replace-and-recreate) and when
   * it's zeroed out.
   */
  private async deleteOpeningBalanceJournal(orgId: string, accountId: string) {
    const prior = await this.prisma.journalEntry.findMany({
      where: {
        org_id: orgId,
        reference_type: 'opening_balance',
        reference_id: accountId,
      },
      select: { id: true },
    });
    if (prior.length === 0) return;
    const ids = prior.map((p) => p.id);
    await this.prisma.journalLine.deleteMany({ where: { entry_id: { in: ids } } });
    await this.prisma.journalEntry.deleteMany({ where: { id: { in: ids } } });
  }

  /**
   * Resolve the suspense account (code 3099). Created on demand for orgs
   * whose chart was seeded before this account was added to the default
   * template — keeps the feature working without a forced re-seed.
   */
  private async ensureSuspenseAccount(orgId: string) {
    const existing = await this.prisma.account.findFirst({
      where: { org_id: orgId, code: '3099' },
      select: { id: true, code: true },
    });
    if (existing) return existing;

    // Find the Equity group (3000) to parent the new account under, if it
    // exists; otherwise leave parent_id null.
    const equityParent = await this.prisma.account.findFirst({
      where: { org_id: orgId, code: '3000' },
      select: { id: true },
    });
    return this.prisma.account.create({
      data: {
        org_id: orgId,
        code: '3099',
        name: 'Opening Balance Adjustment',
        type: 'equity',
        sub_type: 'capital',
        parent_id: equityParent?.id || null,
        is_system: true,
        is_active: true,
        opening_balance: 0,
      },
      select: { id: true, code: true },
    });
  }
}
