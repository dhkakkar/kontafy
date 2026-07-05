import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../books/accounts/accounts.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  private readonly s3: S3Client;
  private readonly bucket = 'syscode-uploads';
  private readonly keyPrefix = 'kontafy/logos';
  private readonly publicBaseUrl = 'https://pub-3c9b20f24ae34d4d935610c014f9ba51.r2.dev';

  constructor(
    private readonly prisma: PrismaService,
    // Used when saving Invoice Config bank accounts — each row can
    // optionally carry an opening balance which we mirror into a
    // 1102.NNN sub-ledger via AccountsService.createBankSubLedger.
    private readonly accountsService: AccountsService,
  ) {
    // R2_* env vars populated at boot from OpenBao — see
    // apps/api/src/common/bao/fetch-r2-creds.ts.
    this.s3 = new S3Client({
      region: 'auto',
      endpoint:
        process.env.R2_ENDPOINT ||
        'https://08c5215e60e39dc2fbb3fb67ae7359a5.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
      forcePathStyle: true,
    });
  }

  // ───────────────────────────────────────────────────────
  // Organization Settings
  // ───────────────────────────────────────────────────────

  async getOrganization(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganization(
    orgId: string,
    userId: string,
    data: {
      name?: string;
      legal_name?: string;
      gstin?: string;
      pan?: string;
      cin?: string;
      address?: Record<string, any>;
      phone?: string;
      email?: string;
      logo_url?: string;
      fiscal_year_start?: number;
      business_type?: string;
      industry?: string;
      currency?: string;
      tan?: string;
      website?: string;
      date_of_incorporation?: string;
      gst_registration_date?: string;
      books_begin_from?: string;
    },
  ) {
    await this.verifyMembership(orgId, userId);

    // Split incoming fields into proper schema columns vs. settings JSON.
    // TAN/website/dates don't have dedicated columns yet, so they ride on
    // the existing Organization.settings Json under a "profile" namespace —
    // this avoids a Prisma migration against prod Neon for a UI-only field.
    const {
      tan,
      website,
      date_of_incorporation,
      gst_registration_date,
      books_begin_from,
      ...columns
    } = data;

    const profileExtras: Record<string, unknown> = {};
    if (tan !== undefined) profileExtras.tan = tan || null;
    if (website !== undefined) profileExtras.website = website || null;
    if (date_of_incorporation !== undefined)
      profileExtras.date_of_incorporation = date_of_incorporation || null;
    if (gst_registration_date !== undefined)
      profileExtras.gst_registration_date = gst_registration_date || null;
    if (books_begin_from !== undefined)
      profileExtras.books_begin_from = books_begin_from || null;

    let nextSettings: Record<string, unknown> | undefined;
    if (Object.keys(profileExtras).length > 0) {
      const existing = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });
      const prevSettings = (existing?.settings as Record<string, unknown>) || {};
      const prevProfile =
        (prevSettings.profile as Record<string, unknown>) || {};
      nextSettings = {
        ...prevSettings,
        profile: { ...prevProfile, ...profileExtras },
      };
    }

    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...columns,
        // Prisma's JSON column expects InputJsonValue, which is a narrowed
        // structural type that doesn't accept `Record<string, unknown>`.
        // Our shape is plain JSON (no Decimal/Date instances inside) so
        // casting here is sound.
        ...(nextSettings
          ? { settings: nextSettings as Prisma.InputJsonValue }
          : {}),
        updated_at: new Date(),
      },
    });

    return org;
  }

  /**
   * Upload an organization logo. Takes a data URL from the client,
   * validates, uploads to the Cloudflare R2 `syscode-uploads` bucket
   * under `kontafy/logos/`, and stores the public URL on
   * Organization.logo_url. Returns the saved URL.
   */
  async uploadLogo(orgId: string, userId: string, dataUrl: string) {
    await this.verifyMembership(orgId, userId);

    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new BadRequestException('Image data is required');
    }

    const match = /^data:(image\/(png|jpeg|jpg|webp|svg\+xml));base64,(.+)$/i.exec(
      dataUrl,
    );
    if (!match) {
      throw new BadRequestException(
        'Invalid image data. Expected a PNG, JPEG, WEBP, or SVG data URL.',
      );
    }
    const mime = match[1].toLowerCase();
    const rawExt = match[2].toLowerCase();
    const ext =
      rawExt === 'jpg'
        ? 'jpg'
        : rawExt === 'svg+xml'
          ? 'svg'
          : rawExt;
    const buffer = Buffer.from(match[3], 'base64');

    if (buffer.length === 0) {
      throw new BadRequestException('Image data is empty');
    }
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Image too large. Max 2MB.');
    }

    const key = `${this.keyPrefix}/${orgId}/logo-${Date.now()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mime,
          // Each upload gets a timestamped key, so the URL itself changes
          // when the logo changes — content at this key never mutates.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.logger.error('Logo upload failed', err);
      throw new BadRequestException('Logo upload failed');
    }

    const logo_url = `${this.publicBaseUrl}/${key}`;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { logo_url, updated_at: new Date() },
    });

    return { logo_url };
  }

  /**
   * Upload a director KYC document (PAN / Aadhaar / DIN letter / signature
   * image / photograph) to R2 and return the public URL. The caller is
   * responsible for stitching the URL onto the right director record and
   * PATCHing /settings/directors. Accepts PNG, JPEG, WEBP and PDF up to 2MB.
   */
  async uploadDirectorDocument(
    orgId: string,
    userId: string,
    body: { director_id: string; doc_type: string; data_url: string },
  ) {
    await this.verifyMembership(orgId, userId);

    const { director_id, doc_type, data_url } = body || ({} as any);
    if (!director_id || !doc_type || !data_url) {
      throw new BadRequestException(
        'director_id, doc_type and data_url are required',
      );
    }
    const allowedDocTypes = new Set([
      'pan',
      'aadhaar',
      'din_letter',
      'signature',
      'photograph',
    ]);
    if (!allowedDocTypes.has(doc_type)) {
      throw new BadRequestException(`Unsupported doc_type: ${doc_type}`);
    }

    // Accept the same image MIME set as logos plus PDF for legal docs.
    const match =
      /^data:(image\/(png|jpeg|jpg|webp)|application\/pdf);base64,(.+)$/i.exec(
        data_url,
      );
    if (!match) {
      throw new BadRequestException(
        'Invalid file data. Expected a PNG, JPEG, WEBP or PDF data URL.',
      );
    }
    const mime = match[1].toLowerCase();
    const rawExt = match[2].toLowerCase();
    const ext =
      mime === 'application/pdf' ? 'pdf' : rawExt === 'jpg' ? 'jpg' : rawExt;
    const buffer = Buffer.from(match[3], 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('File too large. Max 2MB.');
    }

    // Directories: kontafy/directors/{orgId}/{directorId}/{docType}-{ts}.{ext}
    // Each upload gets a timestamped key so URLs are content-addressed and
    // the CDN cache doesn't serve a stale doc after replacement.
    const safeDirId = director_id.replace(/[^A-Za-z0-9_-]/g, '');
    const key = `kontafy/directors/${orgId}/${safeDirId}/${doc_type}-${Date.now()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mime,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.logger.error('Director document upload failed', err);
      throw new BadRequestException('Director document upload failed');
    }

    return { url: `${this.publicBaseUrl}/${key}` };
  }

  // ───────────────────────────────────────────────────────
  // Team / User Management
  // ───────────────────────────────────────────────────────

  async listMembers(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const members = await this.prisma.orgMember.findMany({
      where: { org_id: orgId },
      orderBy: { joined_at: 'asc' },
    });

    const userIds = members.map((m) => m.user_id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return members.map((member) => {
      const u = userMap.get(member.user_id);
      return {
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        permissions: member.permissions,
        joined_at: member.joined_at,
        name: u?.name || null,
        email: u?.email || null,
        phone: u?.phone || null,
      };
    });
  }

  async inviteUser(
    orgId: string,
    userId: string,
    data: { email: string; role: string },
  ) {
    await this.verifyMembership(orgId, userId);

    const targetEmail = data.email.trim().toLowerCase();
    const targetUser = await this.prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!targetUser) {
      throw new NotFoundException(
        'No user found with this email. They must sign up first.',
      );
    }

    const existing = await this.prisma.orgMember.findUnique({
      where: {
        org_id_user_id: {
          org_id: orgId,
          user_id: targetUser.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const member = await this.prisma.orgMember.create({
      data: {
        org_id: orgId,
        user_id: targetUser.id,
        role: data.role,
        permissions: {},
        invited_by: userId,
      },
    });

    return {
      ...member,
      name: targetUser.name,
      email: targetUser.email,
    };
  }

  async updateMemberRole(
    orgId: string,
    memberId: string,
    data: { role: string },
  ) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, org_id: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Prevent changing the last owner
    if (member.role === 'owner' && data.role !== 'owner') {
      const ownerCount = await this.prisma.orgMember.count({
        where: { org_id: orgId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot change role of the last owner');
      }
    }

    return this.prisma.orgMember.update({
      where: { id: memberId },
      data: { role: data.role },
    });
  }

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

  // ───────────────────────────────────────────────────────
  // Invoice Configuration
  // ───────────────────────────────────────────────────────

  /**
   * Convert whatever bank data lives in settings into a stable array shape
   * for the client. Settings histories include three formats:
   *   1. New: settings.bank_accounts = [ {id, bank_name, ...} ]
   *   2. Mid: settings.bank_details = { bank_name, account_number, ifsc, ... }
   *   3. Old: settings.bank_name / .bank_account_number / .bank_ifsc / .bank_branch
   * If only formats 2 or 3 are present we synthesize a single primary
   * entry so the multi-bank UI has something to render.
   */
  private extractBankAccounts(
    settings: Record<string, any>,
  ): Array<Record<string, any>> {
    if (Array.isArray(settings.bank_accounts) && settings.bank_accounts.length > 0) {
      // Ensure exactly one is_primary even if older saved data forgot it
      const accounts = settings.bank_accounts.map(
        (b: Record<string, any>, idx: number) => ({
          id: b.id || `bank-${idx + 1}`,
          bank_name: b.bank_name || '',
          account_name: b.account_name || '',
          account_number: b.account_number || '',
          ifsc: b.ifsc || '',
          branch: b.branch || '',
          account_type: b.account_type || 'current',
          upi_id: b.upi_id || '',
          swift_code: b.swift_code || '',
          is_primary: !!b.is_primary,
          show_full_number: !!b.show_full_number,
          // Opening-balance fields. account_id is set by the backend
          // once we auto-create the 1102.NNN sub-ledger, so the page
          // can show "linked to Sub-ledger X" once it exists.
          opening_balance: Number(b.opening_balance) || 0,
          opening_dr_cr: b.opening_dr_cr || 'Dr',
          opening_date: b.opening_date || null,
          account_id: b.account_id || null,
        }),
      );
      if (!accounts.some((b: any) => b.is_primary)) accounts[0].is_primary = true;
      return accounts;
    }

    const legacyName =
      settings.bank_name || settings.bank_details?.bank_name || '';
    const legacyAcct =
      settings.bank_account_number || settings.bank_details?.account_number || '';
    const legacyIfsc =
      settings.bank_ifsc || settings.bank_details?.ifsc || '';
    if (!legacyName && !legacyAcct && !legacyIfsc) return [];

    return [
      {
        id: 'bank-1',
        bank_name: legacyName,
        account_name:
          settings.bank_account_name || settings.bank_details?.account_name || '',
        account_number: legacyAcct,
        ifsc: legacyIfsc,
        branch: settings.bank_branch || settings.bank_details?.branch || '',
        account_type: 'current',
        upi_id: settings.bank_upi_id || settings.bank_details?.upi_id || '',
        swift_code: '',
        is_primary: true,
        show_full_number: false,
      },
    ];
  }

  async getInvoiceConfig(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const settings = (org.settings as Record<string, any>) || {};
    const bank_accounts = this.extractBankAccounts(settings);

    return {
      invoice_prefix: settings.invoice_prefix || 'INV-',
      next_invoice_number: settings.next_invoice_number || 1,
      // Zero-pad width for the per-FY sequence. Legal range 1..6, default 2.
      // See InvoicesService.allocateInvoiceNumber.
      invoice_sequence_padding: Math.max(
        1,
        Math.min(6, Number(settings.invoice_sequence_padding) || 2),
      ),
      default_payment_terms: settings.default_payment_terms || 30,
      default_terms_conditions: settings.default_terms_conditions || '',
      default_notes: settings.default_notes || '',
      bank_accounts,
      // Legacy flat fields, retained so older PDF code paths keep working
      // until everything is moved over to bank_accounts.
      bank_name: settings.bank_name || '',
      bank_account_number: settings.bank_account_number || '',
      bank_ifsc: settings.bank_ifsc || '',
      bank_branch: settings.bank_branch || '',
    };
  }

  async updateInvoiceConfig(
    orgId: string,
    userId: string,
    data: {
      invoice_prefix?: string;
      next_invoice_number?: number;
      invoice_sequence_padding?: number;
      default_payment_terms?: number;
      default_terms_conditions?: string;
      default_notes?: string;
      bank_name?: string;
      bank_account_number?: string;
      bank_ifsc?: string;
      bank_branch?: string;
      bank_accounts?: Array<{
        id?: string;
        bank_name: string;
        account_name?: string;
        account_number: string;
        ifsc: string;
        branch?: string;
        account_type?: string;
        upi_id?: string;
        swift_code?: string;
        is_primary?: boolean;
        show_full_number?: boolean;
        opening_balance?: number;
        opening_dr_cr?: 'Dr' | 'Cr';
        opening_date?: string;
        account_id?: string | null;
      }>;
    },
  ) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const currentSettings = (org.settings as Record<string, any>) || {};

    // Normalise bank_accounts before persisting: enforce exactly one primary,
    // strip empties, and mirror the primary's identity into the flat fields
    // so the existing PDF rendering path doesn't go blank for clients that
    // upgrade UI before we update the template reader.
    let nextBankAccounts: Array<Record<string, any>> | undefined;
    let mirroredFlat: Record<string, string> | undefined;
    if (Array.isArray(data.bank_accounts)) {
      // Dedupe by (account_number + IFSC). Same business identity =
      // same bank — surfaces in two ways: (a) the user accidentally
      // pasted the same account twice in the form, (b) a double-submit
      // races the existing row past the dedup-by-id logic. Last
      // occurrence wins so edits to the duplicate row don't get
      // silently dropped.
      const seenKeys = new Map<string, number>();
      const deduped: typeof data.bank_accounts = [];
      data.bank_accounts.forEach((b) => {
        if (!b) return;
        const acct = (b.account_number || '').trim();
        const ifsc = (b.ifsc || '').trim().toUpperCase();
        if (!acct || !ifsc) {
          deduped.push(b);
          return;
        }
        const key = `${acct}|${ifsc}`;
        if (seenKeys.has(key)) {
          // Replace prior occurrence with this one (last write wins).
          deduped[seenKeys.get(key) as number] = b;
          this.logger.warn(
            `Dedup: dropped duplicate bank ${acct.slice(-4)} / ${ifsc} from invoice-config payload (org ${orgId})`,
          );
          return;
        }
        seenKeys.set(key, deduped.length);
        deduped.push(b);
      });

      const cleaned = deduped
        .filter(
          (b) =>
            b && (b.bank_name?.trim() || b.account_number?.trim() || b.ifsc?.trim()),
        )
        .map((b, idx) => ({
          id: b.id || `bank-${Date.now()}-${idx}`,
          bank_name: (b.bank_name || '').trim(),
          account_name: (b.account_name || '').trim(),
          account_number: (b.account_number || '').trim(),
          ifsc: (b.ifsc || '').trim().toUpperCase(),
          branch: (b.branch || '').trim(),
          account_type: b.account_type || 'current',
          upi_id: (b.upi_id || '').trim(),
          swift_code: (b.swift_code || '').trim().toUpperCase(),
          is_primary: !!b.is_primary,
          show_full_number: !!b.show_full_number,
          // Opening balance fields. Default Dr/Cr by account type:
          // OD / CC accounts behave as liabilities when negative so we
          // default them to Cr; current / savings / foreign default Dr.
          opening_balance: Math.max(0, Number(b.opening_balance) || 0),
          opening_dr_cr:
            (b.opening_dr_cr === 'Cr' || b.opening_dr_cr === 'Dr'
              ? b.opening_dr_cr
              : b.account_type === 'od' || b.account_type === 'cc'
                ? 'Cr'
                : 'Dr') as 'Dr' | 'Cr',
          opening_date: b.opening_date || null,
          account_id: b.account_id || null,
        }));

      if (cleaned.length > 0) {
        // Force exactly one primary: first explicitly-marked wins, else first row.
        const firstPrimaryIdx = cleaned.findIndex((b) => b.is_primary);
        const winner = firstPrimaryIdx === -1 ? 0 : firstPrimaryIdx;
        cleaned.forEach((b, i) => (b.is_primary = i === winner));

        const primary = cleaned[winner];
        mirroredFlat = {
          bank_name: primary.bank_name,
          bank_account_name: primary.account_name,
          bank_account_number: primary.account_number,
          bank_ifsc: primary.ifsc,
          bank_branch: primary.branch,
          bank_upi_id: primary.upi_id,
        };
      } else {
        // Empty array → wipe flat fields too so the PDF doesn't show stale info.
        mirroredFlat = {
          bank_name: '',
          bank_account_name: '',
          bank_account_number: '',
          bank_ifsc: '',
          bank_branch: '',
          bank_upi_id: '',
        };
      }
      nextBankAccounts = cleaned;
    }

    // Auto-create / refresh the matching 1102.NNN sub-ledger per bank.
    // Done before the settings.update so we can capture the new
    // account_id back into the JSON payload — that way the next page
    // load knows which sub-ledger each bank is bound to and can call
    // createBankSubLedger() with existingAccountId on subsequent edits
    // (preventing duplicate ledgers when banks are renamed).
    if (nextBankAccounts) {
      for (const b of nextBankAccounts) {
        try {
          const last4 = b.account_number ? b.account_number.slice(-4) : undefined;
          const ledger = await this.accountsService.createBankSubLedger(
            orgId,
            b.bank_name || 'Bank',
            last4,
            b.opening_balance,
            b.opening_dr_cr,
            b.opening_date,
            b.account_id || undefined,
          );
          if (ledger) b.account_id = ledger.id;
        } catch (err) {
          this.logger.warn(
            `Bank "${b.bank_name}" saved but sub-ledger sync failed: ${(err as Error).message}`,
          );
        }
      }

      // Mirror each bank into the `bank_accounts` table so the
      // Record Payment / Receipt dropdown (which reads from that
      // table, not from settings JSON) sees them. The JSON form
      // shipped before the bank_accounts table existed, so until
      // this sync landed users had to add banks twice — once here
      // for the PDF, once at /bank/accounts for payments. account_id
      // is the natural key: every bank has a 1102.NNN sub-ledger, no
      // two banks share one, so we use it for the upsert. Inactive-
      // sweep at the end so banks the user removed don't keep
      // appearing in the dropdown.
      try {
        const existingRows = await this.prisma.bankAccount.findMany({
          where: { org_id: orgId },
          select: { id: true, account_id: true },
        });
        const byAccountId = new Map<string, string>();
        for (const r of existingRows) {
          if (r.account_id) byAccountId.set(r.account_id, r.id);
        }

        const keptIds = new Set<string>();
        for (const b of nextBankAccounts) {
          if (!b.account_id) continue;
          const payload = {
            org_id: orgId,
            account_name: b.account_name || b.bank_name || 'Bank',
            bank_name: b.bank_name || null,
            account_number: b.account_number || null,
            ifsc: b.ifsc || null,
            account_type: b.account_type || 'current',
            opening_balance: b.opening_balance || 0,
            // current_balance: keep in sync with opening on
            // create; we don't recompute the running balance here
            // because bank-transactions ingestion owns that field.
            account_id: b.account_id,
            is_active: true,
          };

          const existing = byAccountId.get(b.account_id);
          if (existing) {
            await this.prisma.bankAccount.update({
              where: { id: existing },
              data: {
                account_name: payload.account_name,
                bank_name: payload.bank_name,
                account_number: payload.account_number,
                ifsc: payload.ifsc,
                account_type: payload.account_type,
                opening_balance: payload.opening_balance,
                is_active: true,
              },
            });
            keptIds.add(existing);
          } else {
            const created = await this.prisma.bankAccount.create({
              data: { ...payload, current_balance: payload.opening_balance },
            });
            keptIds.add(created.id);
          }
        }

        // Soft-deactivate any rows that aren't in the new settings
        // list — hard delete would cascade-null payment FKs and lose
        // the audit trail. updateMany is idempotent so even already-
        // inactive rows are fine.
        const toDeactivate = existingRows.filter((r) => !keptIds.has(r.id));
        if (toDeactivate.length > 0) {
          await this.prisma.bankAccount.updateMany({
            where: { id: { in: toDeactivate.map((r) => r.id) } },
            data: { is_active: false },
          });
        }
      } catch (err) {
        this.logger.warn(
          `bank_accounts table sync failed for org ${orgId}: ${(err as Error).message}`,
        );
      }
    }

    const { bank_accounts: _ignore, ...flatInputs } = data;
    const updatedSettings: Record<string, any> = {
      ...currentSettings,
      ...flatInputs,
      ...(nextBankAccounts !== undefined
        ? { bank_accounts: nextBankAccounts }
        : {}),
      ...(mirroredFlat || {}),
    };

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: updatedSettings as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });

    return this.getInvoiceConfig(orgId, userId);
  }

  // ───────────────────────────────────────────────────────
  // Capital Structure
  // ───────────────────────────────────────────────────────
  // Stored in Organization.settings.capital so we can roll out the page
  // without a schema migration. Phase 2 will hook Paid-Up Capital writes
  // to the COA "Share Capital" ledger; for now the data is captured here
  // and read back unmodified.

  async getCapitalStructure(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const settings = (org.settings as Record<string, any>) || {};
    const cap = (settings.capital as Record<string, any>) || {};
    return {
      authorized_capital: Number(cap.authorized_capital) || 0,
      authorized_shares: Number(cap.authorized_shares) || 0,
      face_value: Number(cap.face_value) || 10,
      paid_up_capital: Number(cap.paid_up_capital) || 0,
      issued_shares: Number(cap.issued_shares) || 0,
      share_type: cap.share_type || 'equity',
      capital_events: Array.isArray(cap.capital_events) ? cap.capital_events : [],
    };
  }

  async updateCapitalStructure(
    orgId: string,
    userId: string,
    data: {
      authorized_capital?: number;
      authorized_shares?: number;
      face_value?: number;
      paid_up_capital?: number;
      issued_shares?: number;
      share_type?: string;
    },
  ) {
    await this.verifyMembership(orgId, userId);

    // Hard rule: Paid-up cannot exceed Authorized. Issuing more shares than
    // authorized requires increasing Authorized Capital first per MCA rules.
    const authorized = Number(data.authorized_capital) || 0;
    const paidUp = Number(data.paid_up_capital) || 0;
    if (authorized > 0 && paidUp > authorized) {
      throw new BadRequestException(
        'Paid-up capital cannot exceed authorized capital',
      );
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const settings = (org.settings as Record<string, any>) || {};
    const prevCap = (settings.capital as Record<string, any>) || {};
    const nextCap = {
      ...prevCap,
      authorized_capital: authorized,
      authorized_shares: Number(data.authorized_shares) || 0,
      face_value: Number(data.face_value) || 10,
      paid_up_capital: paidUp,
      issued_shares: Number(data.issued_shares) || 0,
      share_type: data.share_type || 'equity',
      // capital_events stays as-is; Phase 2 will append entries on changes.
      capital_events: Array.isArray(prevCap.capital_events)
        ? prevCap.capital_events
        : [],
    };

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: { ...settings, capital: nextCap } as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });

    // Phase 2: keep the COA "Owner's Capital" ledger (code 3001) in sync
    // with paid-up capital. We update its opening_balance — not a journal
    // entry — because the share-issue cash receipt belongs to the bank
    // ledger separately, and using opening_balance avoids double-counting.
    // Best-effort: if the org hasn't seeded a chart of accounts yet we just
    // skip rather than fail the save.
    try {
      const existing = await this.prisma.account.findFirst({
        where: { org_id: orgId, code: '3001' },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.account.update({
          where: { id: existing.id },
          data: { opening_balance: paidUp },
        });
      } else {
        // Auto-create only if the equity group (3000) already exists —
        // otherwise the org has no chart yet and superadmin should seed it.
        const parent = await this.prisma.account.findFirst({
          where: { org_id: orgId, code: '3000' },
          select: { id: true },
        });
        if (parent) {
          await this.prisma.account.create({
            data: {
              org_id: orgId,
              code: '3001',
              name: "Owner's Capital",
              type: 'equity',
              sub_type: 'capital',
              parent_id: parent.id,
              is_system: true,
              is_active: true,
              opening_balance: paidUp,
            },
          });
        }
      }
    } catch (err) {
      this.logger.warn(
        `Capital structure saved but Share Capital ledger sync failed for org ${orgId}: ${(err as Error).message}`,
      );
    }

    return this.getCapitalStructure(orgId, userId);
  }

  // ───────────────────────────────────────────────────────
  // Directors / Signatories
  // ───────────────────────────────────────────────────────
  // Directors are stored as an array under Organization.settings.directors
  // — same JSON-blob pattern as bank_accounts. The array is replaced
  // wholesale on each PATCH so the frontend owns ordering and identity.

  async getDirectors(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const settings = (org.settings as Record<string, any>) || {};
    const directors = Array.isArray(settings.directors) ? settings.directors : [];
    return { directors };
  }

  async updateDirectors(
    orgId: string,
    userId: string,
    directors: Array<Record<string, any>>,
  ) {
    await this.verifyMembership(orgId, userId);
    if (!Array.isArray(directors)) {
      throw new BadRequestException('directors must be an array');
    }

    // DIN uniqueness across the array. Empty DINs are allowed (rare cases
    // like newly-appointed directors awaiting DIN allotment) so we only
    // collide on actual values.
    const dinSeen = new Set<string>();
    for (const d of directors) {
      const din = (d?.din || '').trim();
      if (!din) continue;
      if (dinSeen.has(din)) {
        throw new BadRequestException(`Duplicate DIN: ${din}`);
      }
      dinSeen.add(din);
    }

    // Resignation date must not be before appointment date.
    for (const d of directors) {
      if (d?.appointed_on && d?.resigned_on && d.resigned_on < d.appointed_on) {
        throw new BadRequestException(
          `Resignation date cannot be before appointment date for ${d.full_name || 'director'}`,
        );
      }
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const settings = (org.settings as Record<string, any>) || {};

    const cleaned = directors.map((d, idx) => ({
      id:
        d.id ||
        `dir-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      full_name: (d.full_name || '').trim(),
      father_or_spouse_name: (d.father_or_spouse_name || '').trim(),
      din: (d.din || '').trim(),
      pan: (d.pan || '').trim().toUpperCase(),
      aadhaar_last4: (d.aadhaar_last4 || '').trim().slice(0, 4),
      date_of_birth: d.date_of_birth || null,
      email: (d.email || '').trim(),
      phone: (d.phone || '').trim(),
      designation: d.designation || 'director',
      appointed_on: d.appointed_on || null,
      resigned_on: d.resigned_on || null,
      // Status is derived from resigned_on but stored explicitly so callers
      // can override (e.g. "disqualified") without losing the resignation date.
      status: d.status || (d.resigned_on ? 'resigned' : 'active'),
      dir3_kyc_filed_on: d.dir3_kyc_filed_on || null,
      dir3_kyc_due_on: d.dir3_kyc_due_on || null,
      dsc_valid_until: d.dsc_valid_until || null,
      can_sign_cheques: d.can_sign_cheques || 'no',
      co_signatory_threshold: Number(d.co_signatory_threshold) || 0,
      can_sign_invoices: !!d.can_sign_invoices,
      bank_authority_type: d.bank_authority_type || 'sole',
      permanent_address: (d.permanent_address || '').trim(),
      current_address: (d.current_address || '').trim(),
      // Phase 2: KYC document URLs, set by /settings/director-documents.
      // Empty/missing keys are normalised to null so the client gets a
      // predictable shape it can render conditionally.
      documents: {
        pan: d?.documents?.pan || null,
        aadhaar: d?.documents?.aadhaar || null,
        din_letter: d?.documents?.din_letter || null,
        signature: d?.documents?.signature || null,
        photograph: d?.documents?.photograph || null,
      },
    }));

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...settings,
          directors: cleaned,
        } as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });

    return { directors: cleaned };
  }

  // ───────────────────────────────────────────────────────
  // Tax / GST Settings
  // ───────────────────────────────────────────────────────

  async getTaxSettings(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { gstin: true, pan: true, settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const settings = (org.settings as Record<string, any>) || {};

    return {
      gstin: org.gstin || '',
      pan: org.pan || '',
      gst_registration_type: settings.gst_registration_type || 'regular',
      filing_frequency: settings.filing_frequency || 'monthly',
      place_of_supply: settings.place_of_supply || '',
      enable_tds: settings.enable_tds || false,
      tds_tan: settings.tds_tan || '',
      default_tds_section: settings.default_tds_section || '',
    };
  }

  async updateTaxSettings(
    orgId: string,
    userId: string,
    data: {
      gstin?: string;
      pan?: string;
      gst_registration_type?: string;
      filing_frequency?: string;
      place_of_supply?: string;
      enable_tds?: boolean;
      tds_tan?: string;
      default_tds_section?: string;
    },
  ) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const currentSettings = (org.settings as Record<string, any>) || {};

    // Separate top-level fields from settings fields
    const topLevelData: Record<string, any> = {};
    const settingsData: Record<string, any> = {};

    if (data.gstin !== undefined) topLevelData.gstin = data.gstin;
    if (data.pan !== undefined) topLevelData.pan = data.pan;

    if (data.gst_registration_type !== undefined) settingsData.gst_registration_type = data.gst_registration_type;
    if (data.filing_frequency !== undefined) settingsData.filing_frequency = data.filing_frequency;
    if (data.place_of_supply !== undefined) settingsData.place_of_supply = data.place_of_supply;
    if (data.enable_tds !== undefined) settingsData.enable_tds = data.enable_tds;
    if (data.tds_tan !== undefined) settingsData.tds_tan = data.tds_tan;
    if (data.default_tds_section !== undefined) settingsData.default_tds_section = data.default_tds_section;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...topLevelData,
        settings: { ...currentSettings, ...settingsData },
        updated_at: new Date(),
      },
    });

    return this.getTaxSettings(orgId, userId);
  }

  // ───────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────

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
}
