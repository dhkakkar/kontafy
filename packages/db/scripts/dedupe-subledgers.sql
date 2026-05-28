-- ════════════════════════════════════════════════════════════════════
-- Dedupe duplicate sub-ledgers (Banks / Customers / Vendors)
-- ════════════════════════════════════════════════════════════════════
-- Background: until createBankSubLedger gained name-based reuse, a
-- double-submit of the Bank Accounts form could mint two 1102.NNN rows
-- with identical display names. Each gets its own opening-balance
-- journal, so the Trial Balance double-counts the opening. Same
-- failure mode is theoretically possible for 1103.NNN customers and
-- 2101.NNN vendors prior to their name-reuse logic landing.
--
-- This script is split into:
--   1. DIAGNOSE  — read-only, lists duplicate groups.
--   2. APPLY     — wrapped in BEGIN/COMMIT; merges journal lines onto
--                  the winner (lowest code = earliest created) and
--                  deletes the loser rows.
--
-- Run order:
--   psql "$DIRECT_URL" -f dedupe-subledgers.sql                  -- diagnose
--   PSQL_APPLY=1 psql "$DIRECT_URL" -f dedupe-subledgers.sql     -- apply
--
-- Or paste the relevant block into Neon SQL Editor.
--
-- Idempotent: re-running APPLY after a successful run is a no-op
-- because the duplicate groups will be empty.
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. DIAGNOSE ────────────────────────────────────────────────────
-- Show all duplicate sub-ledger groups (same org + parent + name).
-- Only considers child accounts (parent_id IS NOT NULL); the seeded
-- chart of accounts uses parent_id = NULL for top-level rows so this
-- never flags them.

WITH dupes AS (
  SELECT
    org_id,
    parent_id,
    name,
    COUNT(*) AS dup_count,
    ARRAY_AGG(id ORDER BY code, created_at) AS account_ids,
    ARRAY_AGG(code ORDER BY code, created_at) AS codes
  FROM accounts
  WHERE parent_id IS NOT NULL
  GROUP BY org_id, parent_id, name
  HAVING COUNT(*) > 1
)
SELECT
  d.org_id,
  p.code AS parent_code,
  p.name AS parent_name,
  d.name AS dup_name,
  d.dup_count,
  d.codes,
  d.account_ids
FROM dupes d
JOIN accounts p ON p.id = d.parent_id
ORDER BY p.code, d.name;


-- ─── 2. APPLY (uncomment the BEGIN/COMMIT block to run) ─────────────
-- For each duplicate group:
--   • Pick the winner: lowest code, ties broken by created_at.
--   • Reassign every journal_lines.account_id from losers → winner.
--   • Delete the loser accounts. (No FK cascade needed — once their
--     journal lines have been re-pointed, nothing else references them.)
--
-- Wrap in a transaction so a mid-script failure rolls back cleanly.
-- COMMENT OUT the COMMIT and add ROLLBACK at the end first if you want
-- a dry-run on the apply path.

/*
BEGIN;

WITH dupes AS (
  SELECT
    org_id,
    parent_id,
    name,
    ARRAY_AGG(id ORDER BY code, created_at) AS account_ids
  FROM accounts
  WHERE parent_id IS NOT NULL
  GROUP BY org_id, parent_id, name
  HAVING COUNT(*) > 1
),
mapping AS (
  -- For each duplicate group, the first id (lowest code) is the winner;
  -- the rest are losers.
  SELECT
    account_ids[1] AS winner_id,
    UNNEST(account_ids[2:array_length(account_ids,1)]) AS loser_id
  FROM dupes
)
UPDATE journal_lines jl
SET account_id = m.winner_id
FROM mapping m
WHERE jl.account_id = m.loser_id;

-- Now safe to delete the loser accounts.
WITH dupes AS (
  SELECT
    org_id,
    parent_id,
    name,
    ARRAY_AGG(id ORDER BY code, created_at) AS account_ids
  FROM accounts
  WHERE parent_id IS NOT NULL
  GROUP BY org_id, parent_id, name
  HAVING COUNT(*) > 1
)
DELETE FROM accounts
WHERE id IN (
  SELECT UNNEST(account_ids[2:array_length(account_ids,1)])
  FROM dupes
);

-- After deletion, re-run the diagnose query inside the transaction to
-- verify zero rows returned, then COMMIT. If anything looks off,
-- ROLLBACK and inspect.

COMMIT;
*/


-- ─── 3. POST-APPLY: rebuild opening-balance journals ────────────────
-- The winner sub-ledger may have inherited duplicate OB journals from
-- the loser (one was posted per duplicate at creation time). Run the
-- API's postOpeningBalanceJournal idempotency path against each
-- affected winner to collapse them to a single canonical journal:
--
--   curl -X POST https://api.kontafy.com/v1/books/accounts/{id}/repost-opening \
--     -H "Authorization: Bearer ..." -H "X-Org-Id: ..."
--
-- Or simpler — open the Edit Account modal on the winner and click
-- Save without changing anything; the existing save handler re-posts
-- the OB journal which DELETES prior OB journals on that account
-- before inserting one fresh.
--
-- For the ICICI Bank ₹8,75,000 case specifically, after running APPLY
-- the user should edit the surviving "ICICI Bank - XXXX" sub-ledger
-- and re-save its opening balance to force the journal rebuild.
