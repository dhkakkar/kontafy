import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new organization and set the creator as owner.
   */
  async create(
    userId: string,
    data: {
      name: string;
      legal_name?: string;
      gstin?: string;
      pan?: string;
      business_type?: string;
      industry?: string;
      address?: Record<string, any>;
      phone?: string;
      email?: string;
    },
  ) {
    // The org + owner-membership write is small enough to keep inside a
    // transaction. The chart-of-accounts seed is intentionally pulled OUT
    // — its ~50 sequential round-trips exceed Neon's PgBouncer
    // per-transaction budget when run inside $transaction. The COA seed
    // is idempotent (skipDuplicates + parent re-linking), so a retry on
    // partial progress is safe.
    const org = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: data.name,
          legal_name: data.legal_name,
          gstin: data.gstin,
          pan: data.pan,
          business_type: data.business_type,
          industry: data.industry,
          address: data.address || {},
          phone: data.phone,
          email: data.email,
          fiscal_year_start: 4, // April — Indian FY
          currency: 'INR',
          plan: 'starter',
          settings: {},
        },
      });
      await tx.orgMember.create({
        data: {
          org_id: organization.id,
          user_id: userId,
          role: 'owner',
          permissions: {},
          invited_by: userId,
        },
      });
      return organization;
    });

    // Seed COA outside the transaction. We don't fail the whole org
    // creation if seeding has a transient issue — the user can re-trigger
    // it from the Chart of Accounts page's empty state.
    try {
      await this.createDefaultAccounts(this.prisma, org.id);
    } catch (err) {
      this.logger.warn(
        `Default COA seed failed for new org ${org.id}: ${(err as Error).message}. User can retry from /books/accounts.`,
      );
    }

    return org;
  }

  /**
   * List all organizations the user is a member of.
   */
  async listByUser(userId: string) {
    const memberships = await this.prisma.orgMember.findMany({
      where: { user_id: userId },
      include: { organization: true },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  }

  /**
   * Get organization details (only accessible by members).
   */
  async findOne(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  /**
   * Update organization details.
   */
  async update(
    orgId: string,
    userId: string,
    data: Record<string, any>,
  ) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    return org;
  }

  /**
   * List members of an organization.
   */
  async listMembers(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const members = await this.prisma.orgMember.findMany({
      where: { org_id: orgId },
    });

    return members;
  }

  /**
   * Add a new member to the organization.
   */
  async addMember(
    orgId: string,
    invitedBy: string,
    data: { user_id: string; role: string; permissions?: Record<string, any> },
  ) {
    // Check if already a member
    const existing = await this.prisma.orgMember.findUnique({
      where: {
        org_id_user_id: {
          org_id: orgId,
          user_id: data.user_id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const member = await this.prisma.orgMember.create({
      data: {
        org_id: orgId,
        user_id: data.user_id,
        role: data.role,
        permissions: data.permissions || {},
        invited_by: invitedBy,
      },
    });

    return member;
  }

  /**
   * Update member role or permissions.
   */
  async updateMember(
    orgId: string,
    memberId: string,
    data: { role?: string; permissions?: Record<string, any> },
  ) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, org_id: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Prevent changing the last owner
    if (member.role === 'owner' && data.role && data.role !== 'owner') {
      const ownerCount = await this.prisma.orgMember.count({
        where: { org_id: orgId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot change role of the last owner');
      }
    }

    return this.prisma.orgMember.update({
      where: { id: memberId },
      data,
    });
  }

  /**
   * Remove a member from the organization.
   */
  async removeMember(orgId: string, memberId: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, org_id: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'owner') {
      const ownerCount = await this.prisma.orgMember.count({
        where: { org_id: orgId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner');
      }
    }

    await this.prisma.orgMember.delete({ where: { id: memberId } });

    return { message: 'Member removed successfully' };
  }

  /**
   * Verify that a user is a member of the organization.
   */
  private async verifyMembership(orgId: string, userId: string) {
    const member = await this.prisma.orgMember.findUnique({
      where: {
        org_id_user_id: {
          org_id: orgId,
          user_id: userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return member;
  }

  /**
   * Seed the default Indian chart of accounts for an organization that
   * doesn't have any accounts yet. Safe to call multiple times — it's a
   * no-op when the org already has accounts.
   *
   * Intentionally NOT wrapped in $transaction. The seed does ~50 small
   * write round-trips (1 createMany + 1 findMany + ~50 updateManys for
   * parent links), which blows Neon's PgBouncer per-transaction budget.
   * Since createMany uses skipDuplicates and parent linking is
   * idempotent, partial-progress reruns are safe.
   */
  async seedDefaultAccounts(orgId: string): Promise<{ created: number }> {
    const existing = await this.prisma.account.count({
      where: { org_id: orgId },
    });
    if (existing > 0) {
      return { created: 0 };
    }
    await this.createDefaultAccounts(this.prisma, orgId);
    const created = await this.prisma.account.count({
      where: { org_id: orgId },
    });
    return { created };
  }

  /**
   * Create the default Indian chart of accounts for a new organization.
   *
   * Uses createMany + a second pass of updateMany for parent links so the
   * whole seed completes in two round-trips instead of 70. The earlier
   * one-row-at-a-time loop timed out inside Prisma's $transaction on
   * Neon's PgBouncer pooler (transactions there have a tight budget).
   */
  private async createDefaultAccounts(tx: any, orgId: string) {
    const defaultAccounts = DEFAULT_SERVICES_CHART;

    await tx.account.createMany({
      data: defaultAccounts.map((a) => ({
        org_id: orgId,
        code: a.code,
        name: a.name,
        type: a.type,
        sub_type: a.sub_type,
        parent_id: null,
        is_system: a.is_system,
        is_active: true,
        opening_balance: 0,
      })),
      skipDuplicates: true,
    });

    // Resolve every account we just created (by code) so we can wire
    // parent_id in a second pass.
    const created = await tx.account.findMany({
      where: { org_id: orgId },
      select: { id: true, code: true },
    });
    const codeToId = new Map<string, string>(
      created.map((a: { id: string; code: string }) => [a.code, a.id]),
    );

    for (const a of defaultAccounts) {
      if (!a.parent_code) continue;
      const parentId = codeToId.get(a.parent_code);
      if (!parentId) continue;
      await tx.account.updateMany({
        where: { org_id: orgId, code: a.code, parent_id: null },
        data: { parent_id: parentId },
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Default Services-template chart of accounts.
// Exported as a module-level constant so the seed logic and any
// future template-picker UI can reference the same source of truth.
// ─────────────────────────────────────────────────────────────────

type DefaultAccount = {
  code: string;
  name: string;
  type: string;
  sub_type: string | null;
  parent_code?: string;
  is_system: boolean;
};

const DEFAULT_SERVICES_CHART: DefaultAccount[] = [
  // ── ASSETS ─────────────────────────────────────────────────────
  { code: '1000', name: 'Assets', type: 'asset', sub_type: null, is_system: true },
  { code: '1100', name: 'Current Assets', type: 'asset', sub_type: 'current_asset', parent_code: '1000', is_system: true },
  { code: '1101', name: 'Cash in Hand', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  { code: '1102', name: 'Bank Accounts', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  { code: '1103', name: 'Accounts Receivable', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  { code: '1104', name: 'Inventory', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  { code: '1105', name: 'GST Input Credit (CGST)', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  { code: '1106', name: 'GST Input Credit (SGST)', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  { code: '1107', name: 'GST Input Credit (IGST)', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  { code: '1108', name: 'TDS Receivable', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  // New under Current Assets — services-template additions
  { code: '1109', name: 'GST Cash Ledger', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  { code: '1110', name: 'GST TDS Receivable', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: true },
  { code: '1111', name: 'Prepaid Expenses', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: false },
  { code: '1112', name: 'Advance to Vendors', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: false },
  { code: '1113', name: 'Security Deposits', type: 'asset', sub_type: 'current_asset', parent_code: '1100', is_system: false },
  // Fixed Assets
  { code: '1200', name: 'Fixed Assets', type: 'asset', sub_type: 'fixed_asset', parent_code: '1000', is_system: true },
  { code: '1201', name: 'Furniture & Fixtures', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200', is_system: false },
  { code: '1202', name: 'Computer & Equipment', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200', is_system: false },
  { code: '1203', name: 'Vehicle', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200', is_system: false },
  { code: '1204', name: 'Office Equipment', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200', is_system: false },
  { code: '1210', name: 'Accumulated Depreciation', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200', is_system: true },

  // ── LIABILITIES ───────────────────────────────────────────────
  { code: '2000', name: 'Liabilities', type: 'liability', sub_type: null, is_system: true },
  { code: '2100', name: 'Current Liabilities', type: 'liability', sub_type: 'current_liability', parent_code: '2000', is_system: true },
  { code: '2101', name: 'Accounts Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2102', name: 'GST Payable (CGST)', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2103', name: 'GST Payable (SGST)', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2104', name: 'GST Payable (IGST)', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2105', name: 'TDS Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2106', name: 'Salary Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  // New under Current Liabilities — services-template additions
  { code: '2107', name: 'PF Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: false },
  { code: '2108', name: 'ESI Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: false },
  { code: '2109', name: 'Professional Tax Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: false },
  { code: '2110', name: 'GST Late Fee Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: false },
  // Section-wise TDS payables — granular accounts required for 26Q/26AS reconciliation
  { code: '2111', name: 'TDS Payable - 192 (Salary)', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2112', name: 'TDS Payable - 194C (Contractor)', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2113', name: 'TDS Payable - 194J (Professional)', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2114', name: 'TDS Payable - 194I (Rent)', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2115', name: 'TDS Payable - 194H (Commission)', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: true },
  { code: '2116', name: 'Advance from Customers', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: false },
  { code: '2117', name: 'Outstanding Expenses', type: 'liability', sub_type: 'current_liability', parent_code: '2100', is_system: false },
  // Long-Term Liabilities
  { code: '2200', name: 'Long-Term Liabilities', type: 'liability', sub_type: 'long_term_liability', parent_code: '2000', is_system: true },
  { code: '2201', name: 'Loan from Bank', type: 'liability', sub_type: 'long_term_liability', parent_code: '2200', is_system: false },
  { code: '2202', name: "Director's Loan", type: 'liability', sub_type: 'long_term_liability', parent_code: '2200', is_system: false },
  { code: '2203', name: 'Unsecured Loans', type: 'liability', sub_type: 'long_term_liability', parent_code: '2200', is_system: false },

  // ── EQUITY ────────────────────────────────────────────────────
  { code: '3000', name: 'Equity', type: 'equity', sub_type: null, is_system: true },
  { code: '3001', name: "Owner's Capital", type: 'equity', sub_type: 'capital', parent_code: '3000', is_system: true },
  { code: '3002', name: "Owner's Drawings", type: 'equity', sub_type: 'drawings', parent_code: '3000', is_system: true },
  { code: '3003', name: 'Retained Earnings', type: 'equity', sub_type: 'retained_earnings', parent_code: '3000', is_system: true },
  { code: '3004', name: 'Reserves & Surplus', type: 'equity', sub_type: 'retained_earnings', parent_code: '3000', is_system: true },
  { code: '3005', name: 'Current Year P&L', type: 'equity', sub_type: 'retained_earnings', parent_code: '3000', is_system: true },
  // Suspense ledger used as the contra side of opening-balance journal
  // entries. When the user enters all opening balances correctly the net
  // movement here is zero; a non-zero balance means the opening trial is
  // unbalanced and signals missing entries.
  { code: '3099', name: 'Opening Balance Adjustment', type: 'equity', sub_type: 'capital', parent_code: '3000', is_system: true },

  // ── INCOME ────────────────────────────────────────────────────
  { code: '4000', name: 'Income', type: 'income', sub_type: null, is_system: true },
  { code: '4001', name: 'Sales Revenue', type: 'income', sub_type: 'operating', parent_code: '4000', is_system: true },
  { code: '4002', name: 'Service Revenue', type: 'income', sub_type: 'operating', parent_code: '4000', is_system: false },
  { code: '4003', name: 'Interest Income', type: 'income', sub_type: 'other_income', parent_code: '4000', is_system: false },
  { code: '4004', name: 'Discount Received', type: 'income', sub_type: 'other_income', parent_code: '4000', is_system: false },
  { code: '4005', name: 'Other Income', type: 'income', sub_type: 'other_income', parent_code: '4000', is_system: false },
  // Services-template income line items
  { code: '4006', name: 'Web Development Income', type: 'income', sub_type: 'operating', parent_code: '4000', is_system: false },
  { code: '4007', name: 'SEO Services Income', type: 'income', sub_type: 'operating', parent_code: '4000', is_system: false },
  { code: '4008', name: 'AMC / Support Income', type: 'income', sub_type: 'operating', parent_code: '4000', is_system: false },
  { code: '4009', name: 'Consulting Income', type: 'income', sub_type: 'operating', parent_code: '4000', is_system: false },
  { code: '4011', name: 'Hosting Income', type: 'income', sub_type: 'operating', parent_code: '4000', is_system: false },
  { code: '4010', name: 'Sales Returns', type: 'income', sub_type: 'contra', parent_code: '4000', is_system: true },

  // ── EXPENSES ──────────────────────────────────────────────────
  { code: '5000', name: 'Expenses', type: 'expense', sub_type: null, is_system: true },
  { code: '5001', name: 'Cost of Goods Sold', type: 'expense', sub_type: 'cogs', parent_code: '5000', is_system: true },
  { code: '5002', name: 'Purchase Returns', type: 'expense', sub_type: 'contra', parent_code: '5000', is_system: true },
  { code: '5100', name: 'Operating Expenses', type: 'expense', sub_type: 'operating', parent_code: '5000', is_system: true },
  { code: '5101', name: 'Rent Expense', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5102', name: 'Salary & Wages', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5103', name: 'Electricity & Utilities', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5104', name: 'Telephone & Internet', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5105', name: 'Office Supplies', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5106', name: 'Travel & Conveyance', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5107', name: 'Professional Fees', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5108', name: 'Depreciation Expense', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: true },
  { code: '5109', name: 'Bank Charges', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5110', name: 'Insurance', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5111', name: 'Discount Allowed', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5112', name: 'Interest Expense', type: 'expense', sub_type: 'finance', parent_code: '5000', is_system: false },
  // Services-template expense additions
  { code: '5113', name: 'Sub-contractor Charges', type: 'expense', sub_type: 'cogs', parent_code: '5000', is_system: false },
  { code: '5114', name: 'Cloud Hosting Charges', type: 'expense', sub_type: 'cogs', parent_code: '5000', is_system: false },
  { code: '5115', name: 'Software Subscriptions', type: 'expense', sub_type: 'cogs', parent_code: '5000', is_system: false },
  { code: '5116', name: "Director's Remuneration", type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5117', name: 'Staff Welfare', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5118', name: 'Advertising & Marketing', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5119', name: 'Repairs & Maintenance', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
  { code: '5120', name: 'Round-off', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: true },
  { code: '5121', name: 'Miscellaneous Expenses', type: 'expense', sub_type: 'operating', parent_code: '5100', is_system: false },
];
