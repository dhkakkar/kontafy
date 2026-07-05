/**
 * Live integration probe for the atomic per-FY invoice counter.
 *
 * Spins up a throwaway org, fires N concurrent invoice-counter allocations
 * inside real Prisma transactions, and asserts:
 *   1. Every allocation returned a distinct sequence.
 *   2. The sequences are consecutive 1..N with no gaps.
 *   3. The invoice_counters.next_sequence lands at N+1.
 *
 * Then tears down the throwaway org.
 *
 * Usage:
 *   DATABASE_URL='postgresql://…direct…' node invoice-numbering-concurrency.mjs
 *
 * Runs against whatever Neon URL you point it at — including production,
 * because it cleans up after itself. Use the direct (non-pooler) URL so
 * transactions don't get pinned by PgBouncer.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const N = Number(process.env.CONCURRENCY || 20);
const FY = '2099-00'; // A far-future FY to guarantee we don't collide with real data
const TYPE = 'sale';

const prisma = new PrismaClient();

async function allocate(orgId) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      INSERT INTO invoice_counters (org_id, type, financial_year, next_sequence, updated_at)
      VALUES (${orgId}::uuid, ${TYPE}, ${FY}, 2, now())
      ON CONFLICT (org_id, type, financial_year) DO UPDATE
      SET next_sequence = invoice_counters.next_sequence + 1,
          updated_at    = now()
      RETURNING (next_sequence - 1) AS assigned;
    `;
    return Number(rows[0].assigned);
  });
}

async function main() {
  console.log(`Concurrency probe: N=${N}, FY=${FY}`);

  const org = await prisma.organization.create({
    data: { name: '__concurrency_probe__' + Date.now() },
  });
  console.log(`Ephemeral org id=${org.id}`);

  try {
    const promises = Array.from({ length: N }, () => allocate(org.id));
    const results = await Promise.all(promises);
    results.sort((a, b) => a - b);

    console.log(`Allocated sequences: ${results.join(', ')}`);

    const set = new Set(results);
    if (set.size !== N) {
      throw new Error(`DUPLICATE detected. Got ${set.size} unique seqs for ${N} calls.`);
    }
    for (let i = 0; i < N; i++) {
      if (results[i] !== i + 1) {
        throw new Error(`GAP at position ${i}: expected ${i + 1}, got ${results[i]}`);
      }
    }

    const counter = await prisma.invoiceCounter.findUnique({
      where: {
        org_id_type_financial_year: {
          org_id: org.id,
          type: TYPE,
          financial_year: FY,
        },
      },
    });
    if (counter?.next_sequence !== N + 1) {
      throw new Error(
        `Counter drift: expected next_sequence=${N + 1}, got ${counter?.next_sequence}`,
      );
    }

    console.log(`\n✅ pass: ${N} concurrent allocations produced sequences 1..${N} with no dups, no gaps.`);
    console.log(`✅ pass: counter landed at next_sequence=${counter.next_sequence}.`);
  } finally {
    // Clean up: remove the counter row and the ephemeral org.
    await prisma.invoiceCounter
      .deleteMany({ where: { org_id: org.id } })
      .catch(() => undefined);
    await prisma.organization
      .delete({ where: { id: org.id } })
      .catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error('❌ FAIL:', err.message);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
