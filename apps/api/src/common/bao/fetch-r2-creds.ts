/**
 * OpenBao bootstrap for Cloudflare R2 credentials.
 *
 * Called from main.ts BEFORE NestFactory.create(). Logs in to
 * https://vault.syscode.in using an AppRole (kontafy-api-r2), reads the
 * `cloudflare/r2-delegated` secret, and writes the values into process.env
 * so the S3Client constructors in PdfService / SettingsService /
 * ProfileService pick them up naturally.
 *
 * We do this instead of pasting R2 access keys into .env so:
 *   1. Rotating the delegated R2 token in OpenBao is a single write; no
 *      redeploy is needed on the app side beyond a container restart.
 *   2. If the kontafy-api-r2 AppRole secret is leaked, the blast radius
 *      is bounded to that single delegated R2 token (revocable in Cloudflare
 *      without disturbing anything else).
 *
 * If BAO_* env vars are missing, we skip the fetch and let the process
 * continue — the R2 endpoints will 500 with SignatureDoesNotMatch, which
 * is the same failure mode as an out-of-date .env. That is intentional:
 * we do not silently fall back to hardcoded keys.
 */

const R2_FIELDS = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_BUCKET',
  'R2_PUBLIC_DEV_URL',
] as const;

interface BaoLoginResponse {
  auth?: { client_token?: string; lease_duration?: number };
  errors?: string[];
}

interface BaoSecretResponse {
  data?: { data?: Record<string, string> };
  errors?: string[];
}

export async function fetchR2CredentialsFromBao(): Promise<void> {
  const baoAddr = process.env.BAO_ADDR;
  const roleId = process.env.BAO_ROLE_ID;
  const secretId = process.env.BAO_SECRET_ID;

  if (!baoAddr || !roleId || !secretId) {
    // Not configured — leave process.env alone. R2 endpoints will fail
    // loudly on first use if the .env keys are also missing/stale.
    // eslint-disable-next-line no-console
    console.warn(
      '[bao] BAO_ADDR / BAO_ROLE_ID / BAO_SECRET_ID not all set — skipping R2 credential fetch',
    );
    return;
  }

  const path = process.env.BAO_R2_PATH || 'cloudflare/data/r2-delegated';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const loginRes = await fetch(`${baoAddr}/v1/auth/approle/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId, secret_id: secretId }),
      signal: controller.signal,
    });
    const loginJson = (await loginRes.json()) as BaoLoginResponse;
    const token = loginJson?.auth?.client_token;
    if (!loginRes.ok || !token) {
      throw new Error(
        `AppRole login failed (${loginRes.status}): ${JSON.stringify(loginJson?.errors || loginJson)}`,
      );
    }

    const secretRes = await fetch(`${baoAddr}/v1/${path}`, {
      headers: { 'X-Vault-Token': token },
      signal: controller.signal,
    });
    const secretJson = (await secretRes.json()) as BaoSecretResponse;
    const data = secretJson?.data?.data;
    if (!secretRes.ok || !data) {
      throw new Error(
        `read ${path} failed (${secretRes.status}): ${JSON.stringify(secretJson?.errors || secretJson)}`,
      );
    }

    for (const field of R2_FIELDS) {
      const value = data[field];
      if (value) process.env[field] = value;
    }

    const idPrefix = (data.R2_ACCESS_KEY_ID || '').slice(0, 8);
    // eslint-disable-next-line no-console
    console.log(
      `[bao] fetched R2 credentials from ${path} (access_key_id starts: ${idPrefix}…)`,
    );
  } catch (err) {
    // Don't kill the process — Nest will still boot; only R2-touching
    // endpoints will fail. Log loudly.
    // eslint-disable-next-line no-console
    console.error(
      '[bao] failed to fetch R2 credentials:',
      err instanceof Error ? err.message : err,
    );
  } finally {
    clearTimeout(timeout);
  }
}
