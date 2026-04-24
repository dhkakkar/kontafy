import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

export type CaPermission =
  | 'view_reports'
  | 'view_invoices'
  | 'view_gst'
  | 'approve_entries'
  | 'download_data';

const VALID_PERMISSIONS: CaPermission[] = [
  'view_reports',
  'view_invoices',
  'view_gst',
  'approve_entries',
  'download_data',
];

@Injectable()
export class CaPortalService {
  private readonly logger = new Logger(CaPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Invitation Management ──────────────────────────────────

  /**
   * Invite a CA to access the organization's financial data.
   */
  async inviteCA(
    orgId: string,
    email: string,
    permissions: CaPermission[],
    invitedBy: string,
  ) {
    // Validate permissions
    const invalidPerms = permissions.filter((p) => !VALID_PERMISSIONS.includes(p));
    if (invalidPerms.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPerms.join(', ')}. Valid: ${VALID_PERMISSIONS.join(', ')}`,
      );
    }

    // Check org exists
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Check for existing pending/accepted invitation
    const existing = await this.prisma.caInvitation.findFirst({
      where: {
        org_id: orgId,
        ca_email: email.toLowerCase(),
        status: { in: ['pending', 'accepted'] },
      },
    });
    if (existing) {
      throw new BadRequestException(
        existing.status === 'accepted'
          ? 'This CA already has access to your organization'
          : 'A pending invitation already exists for this email',
      );
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const invitation = await this.prisma.caInvitation.create({
      data: {
        org_id: orgId,
        ca_email: email.toLowerCase(),
        permissions: permissions as any,
        token,
        status: 'pending',
        expires_at: expiresAt,
      },
    });

    // Send invitation email
    const appUrl = this.configService.get<string>('APP_URL', 'https://app.kontafy.in');
    const inviteUrl = `${appUrl}/ca/accept-invite?token=${token}`;

    try {
      await this.emailService.sendMail({
        to: email,
        subject: `Invitation to access ${org.name} on Kontafy`,
        html: this.buildInviteEmailHtml(org.name, inviteUrl, permissions),
        orgId,
        type: 'ca_invitation',
      });
    } catch (error) {
      this.logger.warn(`Failed to send CA invitation email to ${email}`, error);
      // Don't fail the invitation creation if email fails
    }

    this.logger.log(`CA invitation sent: ${email} for org ${org.name}`);
    return invitation;
  }

  /**
   * Accept a CA invitation using a token.
   */
  async acceptInvite(token: string, caUserId: string) {
    const invitation = await this.prisma.caInvitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid token');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Invitation has already been ${invitation.status}`);
    }

    if (new Date() > new Date(invitation.expires_at)) {
      // Mark as expired
      await this.prisma.caInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Invitation has expired. Please request a new one.');
    }

    // Create OrgMember with CA role using a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Check if already a member
      const existingMember = await tx.orgMember.findUnique({
        where: {
          org_id_user_id: {
            org_id: invitation.org_id,
            user_id: caUserId,
          },
        },
      });

      if (existingMember) {
        throw new BadRequestException('You are already a member of this organization');
      }

      // Create CA membership
      const member = await tx.orgMember.create({
        data: {
          org_id: invitation.org_id,
          user_id: caUserId,
          role: 'ca',
          permissions: invitation.permissions as any,
          invited_by: null,
        },
      });

      // Update invitation status
      const updated = await tx.caInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          ca_user_id: caUserId,
        },
      });

      return { member, invitation: updated };
    });

    this.logger.log(
      `CA invitation accepted: user ${caUserId} joined org ${invitation.org_id}`,
    );

    return {
      message: 'Invitation accepted successfully',
      organization: invitation.organization,
      ...result,
    };
  }

  /**
   * Revoke a CA's access to the organization.
   */
  async revokeAccess(orgId: string, caUserId: string) {
    // Verify CA membership exists
    const member = await this.prisma.orgMember.findUnique({
      where: {
        org_id_user_id: {
          org_id: orgId,
          user_id: caUserId,
        },
      },
    });

    if (!member || member.role !== 'ca') {
      throw new NotFoundException('CA membership not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Remove the membership
      await tx.orgMember.delete({
        where: {
          org_id_user_id: {
            org_id: orgId,
            user_id: caUserId,
          },
        },
      });

      // Update any associated invitations to revoked
      await tx.caInvitation.updateMany({
        where: {
          org_id: orgId,
          ca_user_id: caUserId,
          status: 'accepted',
        },
        data: { status: 'revoked' },
      });
    });

    this.logger.log(`CA access revoked: user ${caUserId} from org ${orgId}`);
    return { message: 'CA access has been revoked' };
  }

  // ─── CA Client Views ────────────────────────────────────────

  /**
   * Get all organizations this CA has access to.
   */
  async getCAClients(caUserId: string) {
    const memberships = await this.prisma.orgMember.findMany({
      where: {
        user_id: caUserId,
        role: 'ca',
      },
      include: {
        organization: true,
      },
      orderBy: { joined_at: 'desc' },
    });

    return memberships.map((m) => ({
      orgId: m.org_id,
      name: m.organization.name,
      legalName: m.organization.legal_name,
      gstin: m.organization.gstin,
      businessType: m.organization.business_type,
      permissions: m.permissions,
      joinedAt: m.joined_at,
    }));
  }

  /**
   * Get client summary data for a CA.
   */
  async getClientData(orgId: string, caUserId: string) {
    await this.verifyCAAccess(orgId, caUserId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch summary data in parallel
    const [
      revenueData,
      expenseData,
      receivables,
      payables,
      recentEntries,
    ] = await Promise.all([
      // Revenue this month (sum of credit to income accounts)
      this.prisma.journalLine.aggregate({
        where: {
          entry: { org_id: orgId, is_posted: true, date: { gte: startOfMonth, lte: endOfMonth } },
          account: { type: 'income' },
        },
        _sum: { credit: true },
      }),
      // Expenses this month (sum of debit to expense accounts)
      this.prisma.journalLine.aggregate({
        where: {
          entry: { org_id: orgId, is_posted: true, date: { gte: startOfMonth, lte: endOfMonth } },
          account: { type: 'expense' },
        },
        _sum: { debit: true },
      }),
      // Outstanding receivables
      this.prisma.invoice.aggregate({
        where: { org_id: orgId, type: 'sales', status: { in: ['sent', 'overdue', 'partially_paid'] } },
        _sum: { balance_due: true },
        _count: true,
      }),
      // Outstanding payables
      this.prisma.invoice.aggregate({
        where: { org_id: orgId, type: 'purchase', status: { in: ['sent', 'overdue', 'partially_paid'] } },
        _sum: { balance_due: true },
        _count: true,
      }),
      // Recent journal entries count
      this.prisma.journalEntry.count({
        where: { org_id: orgId, date: { gte: startOfMonth } },
      }),
    ]);

    return {
      organization: {
        id: org.id,
        name: org.name,
        legalName: org.legal_name,
        gstin: org.gstin,
        pan: org.pan,
        businessType: org.business_type,
        fiscalYearStart: org.fiscal_year_start,
      },
      summary: {
        revenueThisMonth: Number(revenueData._sum.credit || 0),
        expensesThisMonth: Number(expenseData._sum.debit || 0),
        receivables: {
          total: Number(receivables._sum.balance_due || 0),
          count: receivables._count,
        },
        payables: {
          total: Number(payables._sum.balance_due || 0),
          count: payables._count,
        },
        journalEntriesThisMonth: recentEntries,
      },
    };
  }

  /**
   * Export annual data pack for a fiscal year.
   */
  async exportClientData(orgId: string, caUserId: string, fiscalYear: string) {
    const membership = await this.verifyCAAccess(orgId, caUserId);
    const permissions = (membership.permissions as any) || [];

    if (!permissions.includes('download_data')) {
      throw new ForbiddenException('You do not have permission to download data');
    }

    // Parse fiscal year (e.g., "2025-26")
    const [startYearStr] = fiscalYear.split('-');
    const startYear = parseInt(startYearStr, 10);
    if (isNaN(startYear)) {
      throw new BadRequestException('Invalid fiscal year format. Use YYYY-YY (e.g., 2025-26)');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const fyStartMonth = org.fiscal_year_start || 4; // April default
    const fyStart = new Date(startYear, fyStartMonth - 1, 1);
    const fyEnd = new Date(startYear + 1, fyStartMonth - 1, 0);

    // Gather all data for the fiscal year
    const [journalEntries, invoices, gstReturns, accounts] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where: { org_id: orgId, date: { gte: fyStart, lte: fyEnd } },
        include: { lines: { include: { account: true } } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: { org_id: orgId, date: { gte: fyStart, lte: fyEnd } },
        include: { contact: true, items: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.gstReturn.findMany({
        where: { org_id: orgId },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.account.findMany({
        where: { org_id: orgId, is_active: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    // Build Trial Balance
    const trialBalance = await this.buildTrialBalance(orgId, fyStart, fyEnd);

    // Build P&L
    const pnl = this.buildPnL(journalEntries);

    // Build Balance Sheet summary
    const balanceSheet = this.buildBalanceSheet(accounts, journalEntries);

    return {
      organization: {
        name: org.name,
        gstin: org.gstin,
        pan: org.pan,
      },
      fiscalYear,
      generatedAt: new Date().toISOString(),
      trialBalance,
      profitAndLoss: pnl,
      balanceSheet,
      gstReturns: gstReturns.map((r) => ({
        returnType: r.return_type,
        period: r.period,
        status: r.status,
        filedAt: r.filed_at,
        arn: r.arn,
      })),
      invoiceSummary: {
        totalSales: invoices.filter((i) => i.type === 'sales').length,
        totalPurchases: invoices.filter((i) => i.type === 'purchase').length,
        salesValue: invoices
          .filter((i) => i.type === 'sales')
          .reduce((sum, i) => sum + Number(i.total || 0), 0),
        purchaseValue: invoices
          .filter((i) => i.type === 'purchase')
          .reduce((sum, i) => sum + Number(i.total || 0), 0),
      },
      journalEntryCount: journalEntries.length,
    };
  }

  // ─── Annotations ────────────────────────────────────────────

  /**
   * Add an annotation (comment) on a financial entity.
   */
  async addAnnotation(
    orgId: string,
    caUserId: string,
    entityType: string,
    entityId: string,
    comment: string,
  ) {
    await this.verifyCAAccess(orgId, caUserId);

    const validEntityTypes = ['journal_entry', 'invoice', 'contact'];
    if (!validEntityTypes.includes(entityType)) {
      throw new BadRequestException(
        `Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`,
      );
    }

    // Verify the entity exists in this org
    await this.verifyEntityExists(orgId, entityType, entityId);

    const annotation = await this.prisma.caAnnotation.create({
      data: {
        org_id: orgId,
        ca_user_id: caUserId,
        entity_type: entityType,
        entity_id: entityId,
        comment,
      },
    });

    return annotation;
  }

  /**
   * Get annotations, optionally filtered by entity type and ID.
   */
  async getAnnotations(
    orgId: string,
    caUserId: string,
    entityType?: string,
    entityId?: string,
  ) {
    await this.verifyCAAccess(orgId, caUserId);

    const where: any = { org_id: orgId };
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = entityId;

    const annotations = await this.prisma.caAnnotation.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return annotations;
  }

  // ─── Approvals ──────────────────────────────────────────────

  /**
   * Get pending journal entries awaiting CA approval.
   */
  async getApprovalQueue(orgId: string, caUserId: string) {
    const membership = await this.verifyCAAccess(orgId, caUserId);
    const permissions = (membership.permissions as any) || [];

    if (!permissions.includes('approve_entries')) {
      throw new ForbiddenException('You do not have permission to approve entries');
    }

    // Get unposted journal entries (pending approval)
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        org_id: orgId,
        is_posted: false,
      },
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return entries.map((entry) => ({
      id: entry.id,
      entryNumber: entry.entry_number,
      date: entry.date,
      narration: entry.narration,
      reference: entry.reference,
      referenceType: entry.reference_type,
      createdAt: entry.created_at,
      lines: entry.lines.map((line) => ({
        accountName: line.account.name,
        accountCode: line.account.code,
        accountType: line.account.type,
        debit: Number(line.debit),
        credit: Number(line.credit),
        description: line.description,
      })),
      totalDebit: entry.lines.reduce((sum, l) => sum + Number(l.debit), 0),
      totalCredit: entry.lines.reduce((sum, l) => sum + Number(l.credit), 0),
    }));
  }

  /**
   * Approve or reject a journal entry.
   */
  async approveEntry(
    orgId: string,
    caUserId: string,
    journalEntryId: string,
    approved: boolean,
    comment?: string,
  ) {
    const membership = await this.verifyCAAccess(orgId, caUserId);
    const permissions = (membership.permissions as any) || [];

    if (!permissions.includes('approve_entries')) {
      throw new ForbiddenException('You do not have permission to approve entries');
    }

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: journalEntryId, org_id: orgId },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.is_posted && approved) {
      throw new BadRequestException('This entry has already been posted');
    }

    // If approved, post the entry
    if (approved) {
      await this.prisma.journalEntry.update({
        where: { id: journalEntryId },
        data: { is_posted: true },
      });
    }

    // Add an annotation recording the approval/rejection
    await this.prisma.caAnnotation.create({
      data: {
        org_id: orgId,
        ca_user_id: caUserId,
        entity_type: 'journal_entry',
        entity_id: journalEntryId,
        comment: comment || (approved ? 'Approved by CA' : 'Rejected by CA'),
      },
    });

    return {
      message: approved
        ? 'Journal entry approved and posted'
        : 'Journal entry rejected',
      journalEntryId,
      approved,
    };
  }

  // ─── Connected CAs (Business Side) ─────────────────────────

  /**
   * Get all CAs connected to an organization (for settings page).
   */
  async getConnectedCAs(orgId: string) {
    const [members, pendingInvites] = await Promise.all([
      this.prisma.orgMember.findMany({
        where: { org_id: orgId, role: 'ca' },
        orderBy: { joined_at: 'desc' },
      }),
      this.prisma.caInvitation.findMany({
        where: { org_id: orgId, status: 'pending' },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      activeCAs: members.map((m) => ({
        userId: m.user_id,
        permissions: m.permissions,
        joinedAt: m.joined_at,
      })),
      pendingInvitations: pendingInvites.map((inv) => ({
        id: inv.id,
        email: inv.ca_email,
        permissions: inv.permissions,
        status: inv.status,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
      })),
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  /**
   * Verify that a user has CA access to the given organization.
   */
  private async verifyCAAccess(orgId: string, caUserId: string) {
    const membership = await this.prisma.orgMember.findUnique({
      where: {
        org_id_user_id: {
          org_id: orgId,
          user_id: caUserId,
        },
      },
    });

    if (!membership || membership.role !== 'ca') {
      throw new ForbiddenException('You do not have CA access to this organization');
    }

    return membership;
  }

  /**
   * Verify a referenced entity actually exists.
   */
  private async verifyEntityExists(orgId: string, entityType: string, entityId: string) {
    let exists = false;

    switch (entityType) {
      case 'journal_entry':
        exists = !!(await this.prisma.journalEntry.findFirst({
          where: { id: entityId, org_id: orgId },
        }));
        break;
      case 'invoice':
        exists = !!(await this.prisma.invoice.findFirst({
          where: { id: entityId, org_id: orgId },
        }));
        break;
      case 'contact':
        exists = !!(await this.prisma.contact.findFirst({
          where: { id: entityId, org_id: orgId },
        }));
        break;
    }

    if (!exists) {
      throw new NotFoundException(
        `${entityType.replace('_', ' ')} not found in this organization`,
      );
    }
  }

  /**
   * Build trial balance data for a given period.
   */
  private async buildTrialBalance(orgId: string, from: Date, to: Date) {
    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId, is_active: true },
      include: {
        journal_lines: {
          where: {
            entry: { is_posted: true, date: { gte: from, lte: to } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return accounts
      .map((account) => {
        const totalDebit = account.journal_lines.reduce(
          (sum, line) => sum + Number(line.debit),
          0,
        );
        const totalCredit = account.journal_lines.reduce(
          (sum, line) => sum + Number(line.credit),
          0,
        );

        return {
          code: account.code,
          name: account.name,
          type: account.type,
          debit: totalDebit,
          credit: totalCredit,
          balance: totalDebit - totalCredit,
        };
      })
      .filter((a) => a.debit > 0 || a.credit > 0);
  }

  /**
   * Build a Profit & Loss summary from journal entries.
   */
  private buildPnL(journalEntries: any[]) {
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const entry of journalEntries) {
      if (!entry.is_posted) continue;
      for (const line of entry.lines) {
        if (line.account.type === 'income') {
          totalIncome += Number(line.credit) - Number(line.debit);
        } else if (line.account.type === 'expense') {
          totalExpenses += Number(line.debit) - Number(line.credit);
        }
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
    };
  }

  /**
   * Build a Balance Sheet summary.
   */
  private buildBalanceSheet(accounts: any[], journalEntries: any[]) {
    const balances: Record<string, number> = {};

    for (const account of accounts) {
      balances[account.id] = Number(account.opening_balance || 0);
    }

    for (const entry of journalEntries) {
      if (!entry.is_posted) continue;
      for (const line of entry.lines) {
        if (balances[line.account_id] !== undefined) {
          balances[line.account_id] += Number(line.debit) - Number(line.credit);
        }
      }
    }

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const summary = { assets: 0, liabilities: 0, equity: 0 };

    for (const [accountId, balance] of Object.entries(balances)) {
      const account = accountMap.get(accountId);
      if (!account) continue;
      if (account.type === 'asset') summary.assets += balance;
      else if (account.type === 'liability') summary.liabilities += Math.abs(balance);
      else if (account.type === 'equity') summary.equity += Math.abs(balance);
    }

    return summary;
  }

  /**
   * Build HTML for the CA invitation email.
   */
  private buildInviteEmailHtml(
    orgName: string,
    inviteUrl: string,
    permissions: CaPermission[],
  ): string {
    const permissionLabels: Record<CaPermission, string> = {
      view_reports: 'View Financial Reports',
      view_invoices: 'View Invoices & Bills',
      view_gst: 'View GST Returns',
      approve_entries: 'Approve Journal Entries',
      download_data: 'Download Annual Data Pack',
    };

    const permList = permissions
      .map((p) => `<li>${permissionLabels[p] || p}</li>`)
      .join('');

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #1e293b; color: white; width: 48px; height: 48px; border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: bold;">K</div>
        </div>
        <h1 style="font-size: 24px; color: #1e293b; margin-bottom: 16px; text-align: center;">CA Portal Invitation</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          You have been invited to access <strong>${orgName}</strong>'s financial data on Kontafy as their Chartered Accountant.
        </p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px;">Permissions granted:</p>
          <ul style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px;">
            ${permList}
          </ul>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #1e293b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center;">
          This invitation expires in 7 days. If you did not expect this, you can ignore this email.
        </p>
      </div>
    `;
  }
}
