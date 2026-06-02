/**
 * Build-time OpenAPI generator.
 *
 * Boots the Nest app (without listening on a port), produces the OpenAPI 3
 * document from the same DocumentBuilder used at runtime, and writes it to
 * `docs/openapi.json` at the repo root.
 *
 * Run via `pnpm --filter @kontafy/api gen:openapi`. We deliberately keep the
 * spec generation out of the running container — `SwaggerModule.createDocument`
 * has hung silently inside the prod container in the past, so production
 * serves the pre-built JSON instead of regenerating at runtime.
 */
import 'reflect-metadata';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generate() {
  const logger = new Logger('generate-openapi');

  // Quiet down: AppModule pulls in BullMQ which complains if Redis isn't
  // reachable during init. We never connect to Redis in this script — the
  // app is closed before any queue would run.
  const app = await NestFactory.create(AppModule, {
    logger: ['warn', 'error'],
    bufferLogs: false,
  });

  const config = new DocumentBuilder()
    .setTitle('Kontafy API')
    .setDescription(
      'REST API for Kontafy — cloud-native accounting for Indian businesses. ' +
        'All paths are versioned: prefix every request with `/v1`. ' +
        'Authenticated routes expect `Authorization: Bearer <access_token>` ' +
        'and most multi-tenant routes also expect `X-Org-Id: <organization id>`.',
    )
    .setVersion('1.0')
    .addServer('https://api.kontafy.com', 'Production')
    .addServer('http://localhost:5002', 'Local development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token returned by POST /v1/auth/login',
      },
      'access-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Org-Id',
        description: 'Organization id for multi-tenant routes',
      },
      'org-id',
    )
    .addTag('Auth', 'Sign-up, sign-in, sessions, password reset')
    .addTag('Profile', 'Current user profile + avatar')
    .addTag('Organizations', 'Organizations, members, invitations')
    .addTag('Settings', 'Org profile, invoice/tax config, capital, directors')
    .addTag('Books', 'Chart of accounts, journal, ledger, reports')
    .addTag('Bill', 'Invoices, purchases, payments, expenses, contacts')
    .addTag('Stock', 'Products, warehouses, stock movements')
    .addTag('Bank', 'Bank accounts, transactions, reconciliation')
    .addTag('Tax', 'GST returns, TDS')
    .addTag('Reports', 'Financial and operational reports')
    .addTag('Data Transfer', 'Bulk import / export from spreadsheets')
    .addTag('Superadmin', 'Platform administration (restricted)')
    .addTag('Support', 'Support tickets')
    .addTag('Subscription', 'Plans, billing, usage')
    .addTag('Notifications', 'In-app notifications')
    .addTag('AI', 'AI-assisted accounting features')
    .addTag('E-Invoice', 'GST e-invoicing (IRN) & e-way bills')
    .addTag('WhatsApp', 'WhatsApp messaging integration')
    .addTag('Commerce', 'Marketplace connectors')
    .addTag('CA Portal', 'Chartered accountant collaboration')
    .addTag('Audit', 'Activity audit log')
    .addTag('Email', 'Outbound email logs and templates')
    .addTag('Branch', 'Multi-branch organizations')
    .addTag('Budget', 'Budgets and variance tracking')
    .addTag('Dashboard', 'Aggregated dashboard widgets')
    .addTag('Health', 'Liveness / readiness probes')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Write to repo-root /docs/openapi.json. This script lives at
  // apps/api/scripts/generate-openapi.ts so the repo root is two levels up.
  const outPath = resolve(__dirname, '../../../docs/openapi.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(document, null, 2));

  const pathCount = Object.keys(document.paths || {}).length;
  const opCount = Object.values(document.paths || {}).reduce(
    (n: number, p: any) =>
      n +
      Object.keys(p).filter((k) =>
        ['get', 'post', 'put', 'patch', 'delete'].includes(k),
      ).length,
    0,
  );
  logger.log(`Wrote ${outPath}`);
  logger.log(`  ${pathCount} paths, ${opCount} operations`);

  await app.close();
  process.exit(0);
}

generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
