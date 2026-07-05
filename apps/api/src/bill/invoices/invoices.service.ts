import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeLineItemGst, isInterStateSupply } from '../../common/utils/gst.util';
import { JournalPostingService } from '../../books/journal-posting/journal-posting.service';

// Map Indian state abbreviations (as used in place_of_supply) to GSTIN
// state codes (first two digits of a GSTIN). Used to decide intra-state
// vs inter-state supply automatically when the frontend doesn't send
// is_igst explicitly. Values cover all 38 codes published by GST.
const STATE_ABBR_TO_GSTIN_CODE: Record<string, string> = {
  JK: '01', HP: '02', PB: '03', CH: '04', UK: '05', HR: '06', DL: '07',
  RJ: '08', UP: '09', BR: '10', SK: '11', AR: '12', NL: '13', MN: '14',
  MZ: '15', TR: '16', ML: '17', AS: '18', WB: '19', JH: '20', OD: '21',
  CT: '22', MP: '23', GJ: '24', DN: '26', MH: '27', AP: '37', KA: '29',
  GA: '30', LD: '31', KL: '32', TN: '33', PY: '34', AN: '35', TG: '36',
  LA: '38',
};

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly journalPosting: JournalPostingService,
  ) {}

  /**
   * Best-effort journal post that swallows errors. Posting failures must
   * never block an invoice operation — the journal can be retried via
   * backfill if it fails.
   */
  private async tryPostJournal(invoiceId: string): Promise<void> {
    try {
      await this.journalPosting.postInvoice(invoiceId);
    } catch (err) {
      this.logger.error(`Journal post failed for invoice ${invoiceId}`, err as any);
    }
  }

  /**
   * List invoices with filtering, search, and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      status?: string;
      type?: string;
      contactId?: string;
      from?: string;
      to?: string;
      search?: string;
    },
  ) {
    const { status, type, contactId, from, to, search } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };

    if (status) where.status = status;
    if (type) where.type = type;
    if (contactId) where.contact_id = contactId;

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true, company_name: true, gstin: true },
          },
        },
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single invoice with all items and contact info.
   */
  async findOne(orgId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
        contact: true,
        payment_allocations: {
          include: {
            payment: {
              select: {
                id: true,
                type: true,
                amount: true,
                date: true,
                method: true,
                reference: true,
                notes: true,
                created_at: true,
              },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            legal_name: true,
            gstin: true,
            pan: true,
            address: true,
            phone: true,
            email: true,
            logo_url: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Create a new invoice with computed GST.
   */
  async create(
    orgId: string,
    userId: string,
    data: {
      type: string;
      contact_id: string;
      date: string;
      due_date?: string;
      place_of_supply?: string;
      is_igst?: boolean;
      notes?: string;
      terms?: string;
      items: Array<{
        product_id?: string;
        description: string;
        hsn_code?: string;
        quantity: number;
        unit?: string;
        rate: number;
        discount_pct?: number;
        cgst_rate?: number;
        sgst_rate?: number;
        igst_rate?: number;
        cess_rate?: number;
      }>;
    },
  ) {
    // Validate type
    const validTypes = ['sale', 'purchase', 'credit_note', 'debit_note'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException(`Invalid invoice type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate contact exists
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Invoice must have at least one item');
    }

    // Determine inter-state supply. If the frontend explicitly set is_igst,
    // respect it. Otherwise derive it by comparing the org's state (first
    // two digits of its GSTIN) against the buyer's place_of_supply state
    // abbreviation (e.g. HR, MH). Mismatch → IGST (inter-state).
    let isIgst: boolean;
    if (typeof data.is_igst === 'boolean') {
      isIgst = data.is_igst;
    } else {
      isIgst = await this.computeIsIgst(orgId, data.place_of_supply);
    }

    // The invoice number, FY and per-FY sequence are allocated inside the
    // same $transaction as the invoice.create() below — see
    // `allocateInvoiceNumber`. The FY suffix is derived from the invoice
    // date so back-dated entries land in the right register.
    const invoiceDate = data.date ? new Date(data.date) : new Date();

    // Preload referenced products so the line items can carry the
    // product's master unit (Hour / Project / MON / …) without the
    // frontend having to send it. Falls back to "pcs" only if the
    // product itself has no unit set.
    const productIds = Array.from(
      new Set(
        data.items
          .map((it) => it.product_id)
          .filter((id): id is string => !!id),
      ),
    );
    const productMap = new Map<string, { unit: string }>();
    if (productIds.length > 0) {
      const prods = await this.prisma.product.findMany({
        where: { id: { in: productIds }, org_id: orgId },
        select: { id: true, unit: true },
      });
      for (const p of prods) {
        productMap.set(p.id, { unit: p.unit || 'pcs' });
      }
    }

    // Compute totals for each item
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const computedItems = data.items.map((item) => {
      // Take the total GST rate the client sent regardless of which bucket
      // it used (cgst+sgst OR igst). Splitting into the right bucket based
      // on isIgst is computeLineItemGst's job — don't pre-filter here,
      // otherwise a Haryana→Maharashtra invoice arriving as cgst+sgst from
      // the form would end up with zero tax when we auto-detect IGST.
      const gstRate =
        (item.cgst_rate || 0) +
        (item.sgst_rate || 0) +
        (item.igst_rate || 0);
      const cessRate = item.cess_rate || 0;

      const computed = computeLineItemGst(
        item.quantity,
        item.rate,
        item.discount_pct || 0,
        gstRate,
        cessRate,
        isIgst,
      );

      subtotal += computed.subtotal;
      totalDiscount += computed.discountAmount;
      totalTax += computed.totalTax;

      // Unit resolution priority: explicit payload value → product's
      // master unit → 'pcs' fallback. This is what fixes the bug where
      // a SEO Monthly product (unit MON) ended up stored as "pcs" on
      // the invoice line.
      const productUnit = item.product_id
        ? productMap.get(item.product_id)?.unit
        : undefined;
      const resolvedUnit = item.unit || productUnit || 'pcs';

      return {
        product_id: item.product_id,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: resolvedUnit,
        rate: item.rate,
        discount_pct: item.discount_pct || 0,
        taxable_amount: computed.taxableAmount,
        cgst_rate: computed.cgstRate,
        cgst_amount: computed.cgstAmount,
        sgst_rate: computed.sgstRate,
        sgst_amount: computed.sgstAmount,
        igst_rate: computed.igstRate,
        igst_amount: computed.igstAmount,
        cess_rate: computed.cessRate,
        cess_amount: computed.cessAmount,
        total: computed.totalWithTax,
      };
    });

    const grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;

    // Defensive due_date computation. Frontend should already send a
    // computed value (invoice_date + customer.payment_terms), but if
    // it doesn't, derive from the contact's payment_terms here so the
    // saved invoice still has a sane due date. Computed in the same
    // local-day arithmetic the frontend uses to avoid TZ drift on
    // month boundaries.
    let resolvedDueDate: Date | null = data.due_date
      ? new Date(data.due_date)
      : null;
    if (!resolvedDueDate && data.contact_id) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: data.contact_id, org_id: orgId },
        select: { payment_terms: true },
      });
      const days = contact?.payment_terms || 30;
      const start = new Date(data.date);
      const due = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + days,
      );
      resolvedDueDate = due;
    }

    // Create invoice with items in a transaction. The number allocation
    // runs inside the same tx so a concurrent create can't steal our
    // sequence between the counter bump and the invoice insert.
    const invoice = await this.prisma.$transaction(async (tx) => {
      const allocated = await this.allocateInvoiceNumber(
        tx,
        orgId,
        data.type,
        invoiceDate,
      );
      const inv = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: allocated.number,
          fy: allocated.fy,
          sequence: allocated.sequence,
          type: data.type,
          status: 'draft',
          contact_id: data.contact_id,
          date: new Date(data.date),
          due_date: resolvedDueDate,
          place_of_supply: data.place_of_supply,
          is_igst: isIgst,
          reverse_charge: !!(data as any).reverse_charge,
          subtotal: subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total: grandTotal,
          amount_paid: 0,
          balance_due: grandTotal,
          notes: data.notes,
          terms: data.terms,
          created_by: userId,
        },
      });

      await tx.invoiceItem.createMany({
        data: computedItems.map((item) => ({
          invoice_id: inv.id,
          ...item,
        })),
      });

      return tx.invoice.findUnique({
        where: { id: inv.id },
        include: { items: true, contact: true },
      });
    });

    return invoice;
  }

  /**
   * Update a draft invoice.
   */
  async update(orgId: string, id: string, data: Record<string, any>) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Lock editing only for terminal / reconciled statuses where changing
    // totals would break books. Draft, sent, overdue can still be tweaked.
    const locked = ['paid', 'partially_paid', 'cancelled'];
    if (locked.includes(invoice.status)) {
      throw new BadRequestException(
        `This invoice is ${invoice.status} and cannot be edited. Create a credit note or reverse the payment first.`,
      );
    }

    // Items come in with the same shape as create. Replace them atomically
    // so totals stay consistent with the new lines.
    const { items, type: _type, invoice_number: _num, org_id: _org, ...rest } = data as any;
    void _type;
    void _num;
    void _org;

    // Prisma's Date columns need a JS Date / full ISO DateTime. Browser date
    // inputs send "YYYY-MM-DD" which Prisma rejects with "premature end of
    // input". Normalize anything date-ish before the update call.
    const toDate = (v: unknown): Date | undefined => {
      if (v == null || v === '') return undefined;
      if (v instanceof Date) return v;
      if (typeof v === 'string') {
        const iso = v.length === 10 ? `${v}T00:00:00.000Z` : v;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? undefined : d;
      }
      return undefined;
    };
    if ('date' in rest) {
      const d = toDate((rest as any).date);
      if (d) (rest as any).date = d;
      else delete (rest as any).date;
    }
    if ('due_date' in rest) {
      const d = toDate((rest as any).due_date);
      if (d) (rest as any).due_date = d;
      else (rest as any).due_date = null;
    }

    // Resolve intra-state vs inter-state based on (possibly new)
    // place_of_supply. If the caller explicitly set is_igst, respect that;
    // otherwise auto-compute from the org's GSTIN state vs the supply state.
    const placeOfSupply =
      (rest as any).place_of_supply ?? invoice.place_of_supply ?? undefined;
    let isIgst: boolean;
    if (typeof (rest as any).is_igst === 'boolean') {
      isIgst = (rest as any).is_igst;
    } else {
      isIgst = await this.computeIsIgst(orgId, placeOfSupply || undefined);
    }
    (rest as any).is_igst = isIgst;

    return this.prisma.$transaction(async (tx) => {
      if (Array.isArray(items)) {
        await tx.invoiceItem.deleteMany({ where: { invoice_id: id } });
        if (items.length > 0) {
          await tx.invoiceItem.createMany({
            data: items.map((it: any) => {
              const qty = Number(it.quantity) || 0;
              const rate = Number(it.rate) || 0;
              const discountPct = Number(it.discount_pct) || 0;

              // Normalize total GST rate from whatever the client sent
              // (either as cgst+sgst OR as igst). Then split it based on the
              // computed isIgst flag so the invoice's tax buckets match the
              // actual inter/intra-state supply classification.
              const totalGstRate =
                (Number(it.cgst_rate) || 0) +
                (Number(it.sgst_rate) || 0) +
                (Number(it.igst_rate) || 0);
              const cgst = isIgst ? 0 : totalGstRate / 2;
              const sgst = isIgst ? 0 : totalGstRate / 2;
              const igst = isIgst ? totalGstRate : 0;

              const taxable =
                Math.round(qty * rate * (1 - discountPct / 100) * 100) / 100;
              const cgstAmt = Math.round((taxable * cgst) / 100 * 100) / 100;
              const sgstAmt = Math.round((taxable * sgst) / 100 * 100) / 100;
              const igstAmt = Math.round((taxable * igst) / 100 * 100) / 100;
              const total =
                Math.round(
                  (taxable + cgstAmt + sgstAmt + igstAmt) * 100,
                ) / 100;
              return {
                invoice_id: id,
                product_id: it.product_id || null,
                description: it.description || '',
                hsn_code: it.hsn_code || null,
                quantity: qty,
                unit: it.unit || 'pcs',
                rate,
                discount_pct: discountPct,
                taxable_amount: taxable,
                cgst_rate: cgst,
                cgst_amount: cgstAmt,
                sgst_rate: sgst,
                sgst_amount: sgstAmt,
                igst_rate: igst,
                igst_amount: igstAmt,
                cess_rate: Number(it.cess_rate) || 0,
                cess_amount: Number(it.cess_amount) || 0,
                total,
              };
            }),
          });
        }

        // Re-aggregate parent totals from the fresh line set.
        const newItems = await tx.invoiceItem.findMany({
          where: { invoice_id: id },
        });
        const subtotal = newItems.reduce(
          (s, i) => s + Number(i.taxable_amount),
          0,
        );
        const taxAmount = newItems.reduce(
          (s, i) =>
            s +
            Number(i.cgst_amount) +
            Number(i.sgst_amount) +
            Number(i.igst_amount) +
            Number(i.cess_amount),
          0,
        );
        const additionalDiscount = Number((rest as any).discount_amount) || 0;
        const grandTotal =
          Math.round((subtotal + taxAmount - additionalDiscount) * 100) / 100;

        (rest as any).subtotal = Math.round(subtotal * 100) / 100;
        (rest as any).tax_amount = Math.round(taxAmount * 100) / 100;
        (rest as any).total = grandTotal;
        (rest as any).balance_due =
          Math.round((grandTotal - Number(invoice.amount_paid)) * 100) / 100;
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          ...rest,
          pdf_url: null, // invalidate cached PDF so the next download regenerates with the new data
          updated_at: new Date(),
        },
        include: { items: true, contact: true },
      });
      return updated;
    }).then(async (updated) => {
      // After commit, repost the journal so totals stay in sync. Only
      // affects invoices that are already past draft state.
      if (updated && !['draft', 'cancelled'].includes(updated.status)) {
        await this.tryPostJournal(id);
      }
      return updated;
    });
  }

  /**
   * Update invoice status.
   */
  async updateStatus(orgId: string, id: string, status: string) {
    const validStatuses = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Validate status transitions
    const allowedTransitions: Record<string, string[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['partially_paid', 'paid', 'overdue', 'cancelled'],
      partially_paid: ['paid', 'overdue', 'cancelled'],
      overdue: ['partially_paid', 'paid', 'cancelled'],
      paid: [],
      cancelled: [],
    };

    const allowed = allowedTransitions[invoice.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from "${invoice.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });

    // Status transitions trigger journal posting / reversal:
    // - moving away from draft  → post a fresh journal
    // - moving into cancelled   → reverse the existing journal
    // - moving back to draft    → reverse (rare; transitions table forbids it)
    if (status === 'cancelled' || status === 'draft') {
      await this.journalPosting.reverseInvoice(id).catch((err) =>
        this.logger.error(`Reverse failed for invoice ${id}`, err),
      );
    } else {
      await this.tryPostJournal(id);
    }

    return updated;
  }

  /**
   * Delete a draft invoice.
   */
  async remove(orgId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoice_id: id } });
      await tx.invoice.delete({ where: { id } });
    });

    return { message: 'Invoice deleted successfully' };
  }

  /**
   * Get or generate PDF URL for an invoice.
   */
  async getPdfUrl(orgId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.pdf_url) {
      return { url: invoice.pdf_url };
    }

    // TODO: Queue PDF generation job via BullMQ
    return {
      message: 'PDF generation queued',
      status: 'pending',
    };
  }

  /**
   * Duplicate an invoice as a new draft.
   */
  async duplicate(orgId: string, id: string, userId: string) {
    const original = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
      include: { items: true },
    });

    if (!original) {
      throw new NotFoundException('Invoice not found');
    }

    // Duplicate creates a fresh draft dated today, so today's FY is correct here.
    const dupDate = new Date();

    const invoice = await this.prisma.$transaction(async (tx) => {
      const allocated = await this.allocateInvoiceNumber(
        tx,
        orgId,
        original.type,
        dupDate,
      );
      const inv = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: allocated.number,
          fy: allocated.fy,
          sequence: allocated.sequence,
          type: original.type,
          status: 'draft',
          contact_id: original.contact_id,
          date: new Date(),
          due_date: original.due_date ? new Date(Date.now() + (new Date(original.due_date).getTime() - new Date(original.date).getTime())) : null,
          place_of_supply: original.place_of_supply,
          is_igst: original.is_igst,
          subtotal: original.subtotal,
          discount_amount: original.discount_amount,
          tax_amount: original.tax_amount,
          total: original.total,
          amount_paid: 0,
          balance_due: original.total,
          notes: original.notes,
          terms: original.terms,
          created_by: userId,
        },
      });

      if (original.items.length > 0) {
        await tx.invoiceItem.createMany({
          data: original.items.map((item) => ({
            invoice_id: inv.id,
            product_id: item.product_id,
            description: item.description,
            hsn_code: item.hsn_code,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            discount_pct: item.discount_pct,
            taxable_amount: item.taxable_amount,
            cgst_rate: item.cgst_rate,
            cgst_amount: item.cgst_amount,
            sgst_rate: item.sgst_rate,
            sgst_amount: item.sgst_amount,
            igst_rate: item.igst_rate,
            igst_amount: item.igst_amount,
            cess_rate: item.cess_rate,
            cess_amount: item.cess_amount,
            total: item.total,
          })),
        });
      }

      return tx.invoice.findUnique({
        where: { id: inv.id },
        include: { items: true, contact: true },
      });
    });

    return invoice;
  }

  /**
   * Return true if an invoice is an inter-state supply (IGST), false if it's
   * intra-state (CGST+SGST). Compares the seller's state (derived from the
   * org's GSTIN first two chars) with the buyer's place of supply (state
   * abbreviation like "HR", "MH"). Missing data defaults to intra-state so
   * legacy org setups don't silently flip tax buckets.
   */
  private async computeIsIgst(
    orgId: string,
    placeOfSupplyAbbr?: string,
  ): Promise<boolean> {
    if (!placeOfSupplyAbbr) return false;
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { gstin: true },
    });
    if (!org?.gstin || org.gstin.length < 2) return false;
    const sellerCode = org.gstin.slice(0, 2);
    const buyerCode = STATE_ABBR_TO_GSTIN_CODE[placeOfSupplyAbbr.toUpperCase()];
    if (!buyerCode) return false;
    return sellerCode !== buyerCode;
  }

  /**
   * Compute the Indian financial year (Apr 1 – Mar 31 by default, or
   * whatever `fiscal_year_start` month the org has set) that a date
   * belongs to. Returns "YYYY-YY", e.g. "2026-27".
   *
   * Back-dated invoices intentionally get the FY of their *date*, not
   * today's FY, so an invoice dated 05-Apr-2025 entered in 2026 still
   * belongs to FY 2025-26.
   */
  static computeFinancialYear(date: Date, fyStartMonth = 4): string {
    const refMonth = date.getMonth() + 1;
    const refYear = date.getFullYear();
    const fyStartYear = refMonth >= fyStartMonth ? refYear : refYear - 1;
    const fyEndYear = fyStartYear + 1;
    return `${fyStartYear}-${String(fyEndYear).slice(2)}`;
  }

  /**
   * Allocate the next invoice number for (orgId, type, invoiceDate) and
   * bump the counter in the same transaction.
   *
   * The sequence is per-financial-year and restarts at 1 at the start of
   * each FY — this is the GST-compliant convention. Counter increments
   * are done via a Postgres atomic UPSERT so concurrent creates never
   * collide on the same sequence.
   *
   * Number format:
   *   - When the org configures `settings.invoice_prefix` (sales only):
   *     `PREFIX/<zero-padded-seq>/<fy>`, e.g. "SYSCODEIT/01/2026-27".
   *   - Otherwise: `<type-default>/<fy>/<zero-padded-seq>`, e.g.
   *     "INV/2026-27/01".
   *   Zero-pad width is configurable via `settings.invoice_sequence_padding`
   *   (default 2, clamped to 1..6).
   */
  async allocateInvoiceNumber(
    tx: Prisma.TransactionClient,
    orgId: string,
    type: string,
    invoiceDate: Date,
  ): Promise<{ number: string; fy: string; sequence: number }> {
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: { settings: true, fiscal_year_start: true },
    });

    const settings = (org?.settings as Record<string, any>) || {};
    const configuredPrefix =
      typeof settings.invoice_prefix === 'string' &&
      settings.invoice_prefix.trim()
        ? (settings.invoice_prefix as string)
        : null;
    const padWidth = clampPadding(settings.invoice_sequence_padding);
    const fyStartMonth = org?.fiscal_year_start || 4;
    const fy = InvoicesService.computeFinancialYear(invoiceDate, fyStartMonth);

    // Atomic counter allocation: UPSERT + increment + RETURNING is the
    // only race-safe way to hand out a fresh sequence per FY under
    // concurrent inserts. Two concurrent creates for the same (org, type,
    // fy) will serialize on the row and each get a distinct number.
    const rows = await tx.$queryRaw<{ assigned: number }[]>`
      INSERT INTO invoice_counters (org_id, type, financial_year, next_sequence, updated_at)
      VALUES (${orgId}::uuid, ${type}, ${fy}, 2, now())
      ON CONFLICT (org_id, type, financial_year) DO UPDATE
      SET next_sequence = invoice_counters.next_sequence + 1,
          updated_at    = now()
      RETURNING (next_sequence - 1) AS assigned;
    `;
    const sequence = Number(rows[0]?.assigned ?? 1);
    const padded = String(sequence).padStart(padWidth, '0');

    // Unified format for every invoice type: PREFIX/<seq>/<fy>. If the
    // org has configured a prefix (sales-only), that takes precedence;
    // otherwise a type-default is used (INV / BILL / CN / DN).
    const rawPrefix =
      type === 'sale' && configuredPrefix
        ? configuredPrefix.replace(/[-\/_\s]+$/, '')
        : type === 'sale'
          ? 'INV'
          : type === 'purchase'
            ? 'BILL'
            : type === 'credit_note'
              ? 'CN'
              : 'DN';
    const invoiceNumber = `${rawPrefix}/${padded}/${fy}`;

    return { number: invoiceNumber, fy, sequence };
  }
}

/**
 * Clamp the invoice sequence padding to a sane range. Default 2 digits
 * (yields "01" .. "99" and rolls to "100" naturally). Users can raise
 * this via Settings → Invoice Config; anything <1 or >6 is coerced.
 */
function clampPadding(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return 2;
  return Math.max(1, Math.min(6, Math.trunc(n)));
}
