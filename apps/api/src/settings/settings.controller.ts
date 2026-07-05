import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { OrgId } from '../common/decorators/org-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';

@ApiTags('Settings')
@ApiBearerAuth('access-token')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ───────────────────────────────────────────────────────
  // Organization
  // ───────────────────────────────────────────────────────

  @Get('organization')
  @ApiOperation({
    summary: 'Get organization profile',
    description:
      'Returns the organization\'s identity block — legal name, GSTIN/PAN/CIN, address, contacts, fiscal year start and the extended profile metadata stashed in `settings.profile` (TAN, website, incorporation date, etc.). Drives the "Organization" tab in Settings.',
  })
  @ApiSecurity('org-id')
  async getOrganization(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.getOrganization(orgId, userId);
  }

  @Patch('organization')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Update organization profile',
    description:
      'Patches identity, contact and accounting fields on the org. Fields without dedicated columns (TAN, website, incorporation/registration dates, books-begin-from) are persisted under `settings.profile` so the schema stays stable while the surface area grows. Restricted to `owner` and `admin`.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Acme Pvt Ltd' },
        legal_name: { type: 'string', example: 'Acme Private Limited' },
        gstin: { type: 'string', example: '29ABCDE1234F1Z5' },
        pan: { type: 'string', example: 'ABCDE1234F' },
        cin: { type: 'string', example: 'U72200KA2010PTC053718' },
        address: { type: 'object', additionalProperties: true },
        phone: { type: 'string', example: '+919876543210' },
        email: { type: 'string', format: 'email', example: 'contact@acme.com' },
        logo_url: { type: 'string', format: 'uri', example: 'https://cdn.kontafy.com/logos/abc.png' },
        fiscal_year_start: { type: 'number', example: 4 },
        business_type: { type: 'string', example: 'Private Limited' },
        industry: { type: 'string', example: 'Technology' },
        currency: { type: 'string', example: 'INR' },
        tan: { type: 'string', example: 'BLRA12345B' },
        website: { type: 'string', format: 'uri', example: 'https://acme.com' },
        date_of_incorporation: { type: 'string', format: 'date', example: '2010-04-15' },
        gst_registration_date: { type: 'string', format: 'date', example: '2017-07-01' },
        books_begin_from: { type: 'string', format: 'date', example: '2025-04-01' },
      },
    },
  })
  async updateOrganization(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
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
      // Identity metadata that doesn't justify dedicated schema columns yet
      // — TAN, dates and website are persisted in the existing
      // Organization.settings JSON blob under a `profile` namespace.
      tan?: string;
      website?: string;
      date_of_incorporation?: string;
      gst_registration_date?: string;
      books_begin_from?: string;
    },
  ) {
    return this.settingsService.updateOrganization(orgId, userId, body);
  }

  @Post('organization/logo')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Upload organization logo (data URL)',
    description:
      'Accepts a base64 data URL, uploads the image to R2 and writes the resulting URL to `Organization.logo_url`. The logo is embedded in invoice PDFs, share links and the docs portal. Restricted to `owner` and `admin`.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['data_url'],
      properties: {
        data_url: {
          type: 'string',
          description: 'Image as a base64 data URL',
          example: 'data:image/png;base64,iVBORw0KGgo...',
        },
      },
    },
  })
  async uploadLogo(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { data_url: string },
  ) {
    return this.settingsService.uploadLogo(orgId, userId, body?.data_url);
  }

  // ───────────────────────────────────────────────────────
  // Team Members
  // ───────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({
    summary: 'List organization members with roles',
    description:
      'Returns each member of the org along with their role, joined date and last activity. Pending invitations also appear (with status `invited`) so the Team Members screen can show "Invite sent" rows.',
  })
  @ApiSecurity('org-id')
  async listMembers(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.listMembers(orgId, userId);
  }

  @Post('users/invite')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Invite user by email',
    description:
      'Sends a signed invite link to the supplied email. If the user already has a Kontafy account they are added as a member directly; otherwise the invite carries through to a one-click sign-up flow. Restricted to `owner` and `admin`.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'role'],
      properties: {
        email: { type: 'string', format: 'email', example: 'newuser@example.com' },
        role: { type: 'string', example: 'accountant' },
      },
    },
  })
  async inviteUser(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { email: string; role: string },
  ) {
    return this.settingsService.inviteUser(orgId, userId, body);
  }

  @Patch('users/:id/role')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Change member role',
    description:
      'Promotes or demotes a member between `owner`, `admin`, `accountant` and `viewer`. Demoting the last `owner` is rejected — promote someone else first. Restricted to `owner` and `admin`.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: { type: 'string', example: 'admin' },
      },
    },
  })
  async updateMemberRole(
    @OrgId() orgId: string,
    @Param('id') memberId: string,
    @Body() body: { role: string },
  ) {
    return this.settingsService.updateMemberRole(orgId, memberId, body);
  }

  @Delete('users/:id')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Remove member from organization',
    description:
      'Revokes the user\'s access to this org but keeps their platform account intact. The user is signed out of the org on their next request. The last `owner` cannot be removed. Restricted to `owner` and `admin`.',
  })
  @ApiSecurity('org-id')
  async removeMember(
    @OrgId() orgId: string,
    @Param('id') memberId: string,
  ) {
    return this.settingsService.removeMember(orgId, memberId);
  }

  // ───────────────────────────────────────────────────────
  // Invoice Configuration
  // ───────────────────────────────────────────────────────

  @Get('invoice-config')
  @ApiOperation({
    summary: 'Get invoice numbering, prefix, terms, bank details',
    description:
      'Returns the invoice configuration block: prefix, next sequence number, payment terms, default T&C / notes, and the multi-bank account list. These values populate the New Invoice form and the PDF template.',
  })
  @ApiSecurity('org-id')
  async getInvoiceConfig(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.getInvoiceConfig(orgId, userId);
  }

  @Patch('invoice-config')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin', 'accountant')
  @ApiOperation({
    summary: 'Update invoice configuration',
    description:
      'Updates invoice prefix, sequence, terms and bank accounts. When `bank_accounts` is supplied the primary entry is mirrored into the legacy flat `bank_*` fields so older PDF templates still render. Any new bank with a non-zero `opening_balance` auto-creates a 1102.NNN sub-ledger under "Bank Accounts" and posts an opening journal entry. Restricted to `owner`, `admin` and `accountant`.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        invoice_prefix: { type: 'string', example: 'INV-' },
        next_invoice_number: { type: 'number', example: 1001 },
        invoice_sequence_padding: {
          type: 'integer',
          minimum: 1,
          maximum: 6,
          example: 2,
          description:
            'Zero-pad width for the per-FY sequence. Default 2 → "01", "02", … Values <1 or >6 are clamped.',
        },
        default_payment_terms: { type: 'number', example: 30 },
        default_terms_conditions: { type: 'string', example: 'Payment due within 30 days.' },
        default_notes: { type: 'string', example: 'Thank you for your business.' },
        bank_name: { type: 'string', example: 'HDFC Bank' },
        bank_account_number: { type: 'string', example: '50100123456789' },
        bank_ifsc: { type: 'string', example: 'HDFC0001234' },
        bank_branch: { type: 'string', example: 'MG Road, Bangalore' },
        bank_accounts: {
          type: 'array',
          items: {
            type: 'object',
            required: ['bank_name', 'account_number', 'ifsc'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              bank_name: { type: 'string', example: 'HDFC Bank' },
              account_name: { type: 'string', example: 'Acme Pvt Ltd' },
              account_number: { type: 'string', example: '50100123456789' },
              ifsc: { type: 'string', example: 'HDFC0001234' },
              branch: { type: 'string', example: 'MG Road, Bangalore' },
              account_type: { type: 'string', example: 'current' },
              upi_id: { type: 'string', example: 'acme@hdfcbank' },
              swift_code: { type: 'string', example: 'HDFCINBB' },
              is_primary: { type: 'boolean', example: true },
              show_full_number: { type: 'boolean', example: false },
              opening_balance: { type: 'number', example: 0 },
              opening_dr_cr: { type: 'string', enum: ['Dr', 'Cr'], example: 'Dr' },
              opening_date: { type: 'string', format: 'date', example: '2025-04-01' },
              account_id: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  })
  async updateInvoiceConfig(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      invoice_prefix?: string;
      next_invoice_number?: number;
      invoice_sequence_padding?: number;
      default_payment_terms?: number;
      default_terms_conditions?: string;
      default_notes?: string;
      // Legacy flat single-bank fields, kept for backward compatibility
      // with older clients and the PDF template fallback path.
      bank_name?: string;
      bank_account_number?: string;
      bank_ifsc?: string;
      bank_branch?: string;
      // New multi-bank array. When provided, the service writes the
      // array plus mirrors the primary entry into the flat fields so
      // existing PDF templates that read the old keys continue to work.
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
        // Optional opening balance — when > 0 a 1102.NNN sub-ledger is
        // auto-created (or reused) under "Bank Accounts" and a journal
        // entry is posted against the suspense account.
        opening_balance?: number;
        opening_dr_cr?: 'Dr' | 'Cr';
        opening_date?: string;
        account_id?: string | null;
      }>;
    },
  ) {
    return this.settingsService.updateInvoiceConfig(orgId, userId, body);
  }

  // ───────────────────────────────────────────────────────
  // Capital Structure
  // ───────────────────────────────────────────────────────

  @Get('capital')
  @ApiOperation({
    summary: 'Get authorized / paid-up capital structure',
    description:
      'Returns the company\'s share-capital block (authorized capital, authorized shares, face value, paid-up capital, issued shares, share type). Persisted under `settings.capital` and surfaced on statutory documents and the ROC compliance dashboard.',
  })
  @ApiSecurity('org-id')
  async getCapitalStructure(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.getCapitalStructure(orgId, userId);
  }

  @Patch('capital')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Update authorized / paid-up capital structure',
    description:
      'Replaces the share-capital settings on the organization. No journal entries are auto-posted — capital ledger movements must still be recorded via Journal Entries. Restricted to `owner` and `admin`.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        authorized_capital: { type: 'number', example: 1000000 },
        authorized_shares: { type: 'number', example: 100000 },
        face_value: { type: 'number', example: 10 },
        paid_up_capital: { type: 'number', example: 500000 },
        issued_shares: { type: 'number', example: 50000 },
        share_type: { type: 'string', example: 'equity' },
      },
    },
  })
  async updateCapitalStructure(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      authorized_capital?: number;
      authorized_shares?: number;
      face_value?: number;
      paid_up_capital?: number;
      issued_shares?: number;
      share_type?: string;
    },
  ) {
    return this.settingsService.updateCapitalStructure(orgId, userId, body);
  }

  // ───────────────────────────────────────────────────────
  // Directors / Signatories
  // ───────────────────────────────────────────────────────

  @Get('directors')
  @ApiOperation({
    summary: 'List directors / signatories',
    description:
      'Returns the configured directors / authorised signatories with their identity details and KYC document links. The list feeds compliance forms (DIR-3 KYC, board resolutions) and signature blocks on outgoing PDFs.',
  })
  @ApiSecurity('org-id')
  async getDirectors(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.getDirectors(orgId, userId);
  }

  @Patch('directors')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Replace the directors list (whole-array PATCH)',
    description:
      'Overwrites the entire `settings.directors` array — there is no per-director PATCH, callers must merge their changes client-side and submit the full list. Document URLs already uploaded via `POST /settings/director-documents` should be preserved verbatim. Restricted to `owner` and `admin`.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['directors'],
      properties: {
        directors: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
      },
    },
  })
  async updateDirectors(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { directors: Array<Record<string, any>> },
  ) {
    return this.settingsService.updateDirectors(orgId, userId, body?.directors || []);
  }

  @Post('director-documents')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary:
      'Upload a director KYC document (PAN/Aadhaar/DIN letter/signature/photo) to R2',
    description:
      'Accepts a base64 data URL, uploads the file to R2 under the org/director namespace and returns the public URL. Persist the returned URL inside the director object yourself and call `PATCH /settings/directors` to save — this endpoint only handles the upload, not the linkage. Restricted to `owner` and `admin`.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['director_id', 'doc_type', 'data_url'],
      properties: {
        director_id: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        doc_type: { type: 'string', example: 'pan' },
        data_url: {
          type: 'string',
          description: 'Document as a base64 data URL',
          example: 'data:application/pdf;base64,JVBERi0xLjQK...',
        },
      },
    },
  })
  async uploadDirectorDocument(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: { director_id: string; doc_type: string; data_url: string },
  ) {
    return this.settingsService.uploadDirectorDocument(orgId, userId, body);
  }

  // ───────────────────────────────────────────────────────
  // Tax / GST Settings
  // ───────────────────────────────────────────────────────

  @Get('tax')
  @ApiOperation({
    summary: 'Get tax/GST settings',
    description:
      'Returns the org\'s GST registration block (GSTIN, PAN, registration type, filing frequency, place of supply) plus TDS flags. These settings drive default tax computation on new invoices/bills and gate the TDS module.',
  })
  @ApiSecurity('org-id')
  async getTaxSettings(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.getTaxSettings(orgId, userId);
  }

  @Patch('tax')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin', 'accountant')
  @ApiOperation({
    summary: 'Update tax/GST settings',
    description:
      'Updates GSTIN/PAN, GST registration type, filing frequency, place of supply and TDS toggles. Flipping `enable_tds` from false to true activates TDS section selectors on bill forms. Restricted to `owner`, `admin` and `accountant`.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        gstin: { type: 'string', example: '29ABCDE1234F1Z5' },
        pan: { type: 'string', example: 'ABCDE1234F' },
        gst_registration_type: { type: 'string', example: 'regular' },
        filing_frequency: { type: 'string', example: 'monthly' },
        place_of_supply: { type: 'string', example: '29-Karnataka' },
        enable_tds: { type: 'boolean', example: false },
        tds_tan: { type: 'string', example: 'BLRA12345B' },
        default_tds_section: { type: 'string', example: '194J' },
      },
    },
  })
  async updateTaxSettings(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
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
    return this.settingsService.updateTaxSettings(orgId, userId, body);
  }
}
