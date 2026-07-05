/**
 * One-off backfill: renumber every existing invoice into a clean per-FY
 * series and seed the invoice_counters rows so future creates continue
 * from where the backfill left off.
 *
 * For each (org_id, type, financial_year) bucket:
 *   1. Order the existing invoices by date ASC, then created_at ASC (stable).
 *   2. Reassign sequence = 1..N.
 *   3. Rebuild invoice_number using the same format the runtime uses:
 *        - sales with settings.invoice_prefix → `PREFIX/<padded>/<fy>`
 *        - otherwise → `<type-default>/<fy>/<padded>`.
 *      Padding respects settings.invoice_sequence_padding (default 2).
 *   4. UPDATE the invoice row.
 *   5. Clear pdf_url on renumbered rows so PDFs regenerate on next fetch.
 *   6. Upsert invoice_counters with next_sequence = N + 1.
 *
 * Run with `--dry-run` first to see the full old→new mapping; the script
 * exits without touching the database. Re-run without `--dry-run` to
 * apply. Everything runs in a single transaction, so a failure rolls
 * back cleanly.
 *
 * Usage:
 *   DATABASE_URL='<direct neon url>' node backfill-invoice-numbers.mjs --dry-run
 *   DATABASE_URL='<direct neon url>' node backfill-invoice-numbers.mjs
 */

import { PrismaClient } from '@prisma/client';

const DRY_RUN = process.argv.includes('--dry-run');
// When --sales-only, non-sales invoices keep their existing invoice_number
// unchanged. Their fy and sequence columns are still populated (from the
// existing number's ordinal in the bucket) and their counters are still
// seeded, so future creates continue the series correctly. Useful when
// non-sales bills like TechFlow's 65 purchase records have real-world
// references we don't want to churn.
const SALES_ONLY = process.argv.includes('--sales-only');
// Comma-separated list of invoice_number strings that must NOT be renumbered
// or otherwise touched — typically because the invoice has been sent to a
// customer externally and the number on their copy has to keep matching our
// books. Frozen rows keep their invoice_number and pdf_url unchanged. Their
// sequence is extracted from the existing string, and other invoices in the
// same (org, type, fy) bucket sort around them (i.e. the frozen seq is
// reserved; sorted-by-date rows fill 1, 2, 3, then skip 4 if 4 is frozen,
// then continue 5, 6, ...).
//
// Usage: --freeze=SYSCODEIT/04/2026-27,SYSCODE/07/2025-26
const FREEZE = process.argv
  .filter((a) => a.startsWith('--freeze='))
  .flatMap((a) => a.slice('--freeze='.length).split(','))
  .map((s) => s.trim())
  .filter(Boolean);
const FREEZE_SET = new Set(FREEZE);
const DEFAULT_PAD = 2;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL required — pass the direct (non-pooler) Neon URL.');
  process.exit(1);
}

const prisma = new PrismaClient();

function computeFinancialYear(date, fyStartMonth = 4) {
  const refMonth = date.getMonth() + 1;
  const refYear = date.getFullYear();
  const fyStartYear = refMonth >= fyStartMonth ? refYear : refYear - 1;
  const fyEndYear = fyStartYear + 1;
  return `${fyStartYear}-${String(fyEndYear).slice(2)}`;
}

function clampPad(raw) {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_PAD;
  return Math.max(1, Math.min(6, Math.trunc(n)));
}

function buildNumber(type, prefix, fy, seq, pad) {
  const padded = String(seq).padStart(pad, '0');
  const rawPrefix = resolvePrefix(type, prefix);
  return `${rawPrefix}/${padded}/${fy}`;
}

function resolvePrefix(type, prefix) {
  return type === 'sale' && prefix
    ? prefix.replace(/[-/_\s]+$/, '')
    : type === 'sale'
      ? 'INV'
      : type === 'purchase'
        ? 'BILL'
        : type === 'credit_note'
          ? 'CN'
          : 'DN';
}

/**
 * Recover the numeric sequence embedded in an existing invoice_number
 * string, e.g. "SYSCODEIT/04/2026-27" → 4. Returns null if the string
 * doesn't match the expected `PREFIX/SEQ/FY` shape for the given
 * (type, prefix, fy). Used only for --freeze processing.
 */
function extractSequenceFromNumber(invoiceNumber, prefix, type, fy) {
  const rawPrefix = resolvePrefix(type, prefix);
  const escaped = rawPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}/(\\d+)/${fy.replace('-', '\\-')}$`);
  const m = invoiceNumber.match(re);
  return m ? parseInt(m[1], 10) : null;
}

async function main() {
  console.log(
    (DRY_RUN ? '=== DRY RUN — no writes' : '=== APPLYING backfill') +
      (SALES_ONLY ? ' [--sales-only: non-sales invoice_number unchanged]' : '') +
      ' ===',
  );

  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, settings: true, fiscal_year_start: true },
  });

  const changes = [];
  const counters = [];

  for (const org of orgs) {
    const settings = (org.settings ?? {});
    const prefix =
      typeof settings.invoice_prefix === 'string' &&
      settings.invoice_prefix.trim()
        ? settings.invoice_prefix
        : null;
    const pad = clampPad(settings.invoice_sequence_padding);
    const fyStartMonth = org.fiscal_year_start || 4;

    // Every invoice for this org, ordered so buckets stay grouped.
    const invoices = await prisma.invoice.findMany({
      where: { org_id: org.id },
      orderBy: [{ type: 'asc' }, { date: 'asc' }, { created_at: 'asc' }],
      select: {
        id: true,
        type: true,
        date: true,
        created_at: true,
        invoice_number: true,
      },
    });

    // Group by (type, fy). Within each bucket:
    //  1. Identify frozen rows (invoice_number ∈ FREEZE). Reserve the seq
    //     embedded in each frozen invoice_number (e.g. "SYSCODEIT/04/2026-27"
    //     → 4). Frozen rows keep their number unchanged.
    //  2. Assign the remaining rows to positions 1, 2, 3, ... in date-order,
    //     skipping any reserved seqs.
    // Counter is seeded to max(all seqs in bucket) + 1.
    const bucketMap = new Map(); // key = type|fy → { rows: [], reservedSeqs: Set, prefix }
    for (const inv of invoices) {
      const fy = computeFinancialYear(new Date(inv.date), fyStartMonth);
      const key = `${inv.type}|${fy}`;
      let bucket = bucketMap.get(key);
      if (!bucket) {
        bucket = { rows: [], reservedSeqs: new Set(), fy, type: inv.type };
        bucketMap.set(key, bucket);
      }
      bucket.rows.push(inv);
    }

    for (const [, bucket] of bucketMap) {
      // Split frozen vs mutable
      const frozenRows = [];
      const mutableRows = [];
      for (const inv of bucket.rows) {
        if (FREEZE_SET.has(inv.invoice_number)) {
          const seq = extractSequenceFromNumber(
            inv.invoice_number,
            prefix,
            inv.type,
            bucket.fy,
          );
          if (seq == null) {
            throw new Error(
              `--freeze ${inv.invoice_number}: cannot extract sequence from that number in bucket (${bucket.type}, ${bucket.fy}). ` +
                `Expected format like "${buildNumber(bucket.type, prefix, bucket.fy, 4, pad)}".`,
            );
          }
          if (bucket.reservedSeqs.has(seq)) {
            throw new Error(
              `--freeze conflict: two rows in (${bucket.type}, ${bucket.fy}) both claim seq ${seq}.`,
            );
          }
          bucket.reservedSeqs.add(seq);
          frozenRows.push({ inv, seq });
        } else {
          mutableRows.push(inv);
        }
      }

      // Emit frozen rows first — number and pdf_url stay put, but fy /
      // sequence still get written so future creates can seed correctly.
      for (const { inv, seq } of frozenRows) {
        changes.push({
          id: inv.id,
          org: org.name,
          type: inv.type,
          fy: bucket.fy,
          old: inv.invoice_number,
          new_: inv.invoice_number,
          seq,
          noNumberChange: true,
          frozen: true,
        });
      }

      // Assign next-available seq (skipping reserved) to each mutable row,
      // walking mutableRows in the original date/created_at order. Track
      // the max seq handed out so we can seed the counter afterwards.
      let nextSeq = 0;
      let maxSeqAssigned = frozenRows.reduce(
        (m, f) => Math.max(m, f.seq),
        0,
      );
      for (const inv of mutableRows) {
        do {
          nextSeq += 1;
        } while (bucket.reservedSeqs.has(nextSeq));
        const seq = nextSeq;
        if (seq > maxSeqAssigned) maxSeqAssigned = seq;
        const computedNumber = buildNumber(
          inv.type,
          prefix,
          bucket.fy,
          seq,
          pad,
        );
        const keepOldNumber = SALES_ONLY && inv.type !== 'sale';
        const targetNumber = keepOldNumber ? inv.invoice_number : computedNumber;
        const noNumberChange = targetNumber === inv.invoice_number;
        changes.push({
          id: inv.id,
          org: org.name,
          type: inv.type,
          fy: bucket.fy,
          old: inv.invoice_number,
          new_: targetNumber,
          seq,
          noNumberChange,
        });
      }

      counters.push({
        org_id: org.id,
        type: bucket.type,
        financial_year: bucket.fy,
        next_sequence: maxSeqAssigned + 1,
      });
    }
  }

  // Print the mapping table.
  const frozenCount = changes.filter((c) => c.frozen).length;
  const renumberCount = changes.filter((c) => !c.noNumberChange).length;
  console.log(
    `\n${changes.length} invoices to touch: ` +
      `${renumberCount} with a NEW number, ` +
      `${frozenCount} FROZEN (kept intact), ` +
      `${counters.length} counter rows.\n`,
  );
  if (FREEZE.length > 0) {
    console.log(`Frozen list (--freeze): ${FREEZE.join(', ')}\n`);
  }
  const sample = changes.slice(0, 200);
  for (const c of sample) {
    const marker = c.frozen ? 'F' : c.noNumberChange ? ' ' : '*';
    console.log(
      `  ${marker} [${c.org.trim()}] ${c.type.padEnd(9)} ${c.fy} #${String(
        c.seq,
      ).padStart(3)} : ${c.old.padEnd(28)} -> ${c.new_}`,
    );
  }
  if (changes.length > sample.length) {
    console.log(`  ... ${changes.length - sample.length} more`);
  }
  console.log('\nCounters to seed:');
  for (const c of counters) {
    console.log(
      `  ${c.type.padEnd(9)} ${c.financial_year}  next_sequence=${c.next_sequence}  (org=${c.org_id})`,
    );
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN — no writes. Re-run without --dry-run to apply.');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('\nApplying...');
  // Prisma's default 5s interactive-transaction timeout is too tight for
  // ~300+ update statements against a remote Neon. Bump both timeout and
  // maxWait so the transaction doesn't get killed mid-flight.
  await prisma.$transaction(
    async (tx) => {
    // Two-phase renumber: first move rows whose invoice_number will change
    // to temporary placeholders so we don't hit the (org_id, invoice_number)
    // unique index while a pair briefly swap numbers.
    const willChange = changes.filter((c) => !c.noNumberChange);
    const nowMs = Date.now();
    for (const c of willChange) {
      await tx.invoice.update({
        where: { id: c.id },
        data: { invoice_number: `__renum_${nowMs}_${c.id}` },
      });
    }
    for (const c of changes) {
      // Frozen rows: only populate fy + sequence, never touch invoice_number
      // or pdf_url. Renumbered rows: rewrite invoice_number + clear pdf_url
      // so the PDF regenerates with the new number on next fetch.
      if (c.frozen) {
        await tx.invoice.update({
          where: { id: c.id },
          data: { fy: c.fy, sequence: c.seq },
        });
      } else {
        await tx.invoice.update({
          where: { id: c.id },
          data: {
            invoice_number: c.new_,
            fy: c.fy,
            sequence: c.seq,
            pdf_url: c.noNumberChange ? undefined : null,
          },
        });
      }
    }
    // Seed / reset counters.
    for (const c of counters) {
      await tx.invoiceCounter.upsert({
        where: {
          org_id_type_financial_year: {
            org_id: c.org_id,
            type: c.type,
            financial_year: c.financial_year,
          },
        },
        update: { next_sequence: c.next_sequence },
        create: {
          org_id: c.org_id,
          type: c.type,
          financial_year: c.financial_year,
          next_sequence: c.next_sequence,
        },
      });
    }
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
  console.log(
    `\nDone. Renumbered ${changes.filter((c) => !c.noNumberChange).length} invoices, seeded ${counters.length} counters.`,
  );
  console.log('pdf_url cleared on renumbered rows — PDFs will regenerate on next /pdf fetch.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('backfill failed:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
