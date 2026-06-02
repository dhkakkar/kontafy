import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('AI')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ─── Cash Flow Forecast ───────────────────────────────────────

  @Get('cash-flow-forecast')
  @ApiOperation({
    summary: 'Get AI-powered 30/60/90 day cash flow forecast',
    description:
      'Returns projected cash inflows and outflows for the next 30, 60 and 90 days based on historical receivables/payables patterns and pending invoices. Powered by Anthropic Claude — gated by the `cashFlowForecast` AI setting, so disabling it on `/ai/settings` causes this endpoint to return an empty forecast.',
  })
  async getCashFlowForecast(@OrgId() orgId: string) {
    return this.aiService.getCashFlowForecast(orgId);
  }

  // ─── Business Insights ────────────────────────────────────────

  @Get('insights')
  @ApiOperation({
    summary: 'Get AI-generated business insights feed',
    description:
      'Generates a fresh batch of narrative insights (revenue trends, expense anomalies, customer concentration, etc.) by analysing the org\'s recent transactional data. Each insight is also persisted so it can be surfaced as a dashboard widget via `GET /ai/stored-insights`.',
  })
  async getInsights(@OrgId() orgId: string) {
    return this.aiService.generateInsights(orgId);
  }

  // ─── Anomaly Detection ────────────────────────────────────────

  @Get('anomalies')
  @ApiOperation({
    summary: 'Detect anomalies in recent transactions',
    description:
      'Scans the most recent journal entries, invoices and bills for outliers — unusually large amounts, duplicate-looking entries, atypical vendors, etc. Returns a flagged list with severity and a suggested action. Gated by the `anomalyDetection` AI setting.',
  })
  async getAnomalies(@OrgId() orgId: string) {
    return this.aiService.detectAnomalies(orgId);
  }

  // ─── Transaction Categorization ───────────────────────────────

  @Post('categorize-transaction')
  @ApiOperation({
    summary: 'AI-suggest account category for a bank transaction',
    description:
      'Takes a bank transaction narration and amount and returns the most likely chart-of-accounts category plus a confidence score. Used by the bank-import wizard to pre-fill the account column. Gated by the `transactionCategorization` AI setting.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description', 'amount'],
      properties: {
        description: { type: 'string', example: 'UPI/AMAZON RETAIL/STATIONERY' },
        amount: { type: 'number', example: 1499 },
      },
    },
  })
  async categorizeTransaction(
    @OrgId() orgId: string,
    @Body() body: { description: string; amount: number },
  ) {
    return this.aiService.categorizeTransaction(
      body.description,
      body.amount,
      orgId,
    );
  }

  // ─── Reconciliation Suggestions ───────────────────────────────

  @Post('reconciliation-suggest')
  @ApiOperation({
    summary: 'Suggest matching journal entries for bank reconciliation',
    description:
      'Given an unmatched bank-statement line (`transactionId`), returns the most plausible book-side journal entries to reconcile against, scored by amount and date proximity. Used by the bank reconciliation screen to speed up manual matching. Gated by the `reconciliationAssist` AI setting.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['transactionId'],
      properties: {
        transactionId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
      },
    },
  })
  async suggestReconciliation(
    @OrgId() orgId: string,
    @Body() body: { transactionId: string },
  ) {
    return this.aiService.suggestReconciliationMatch(body.transactionId, orgId);
  }

  // ─── AI Settings ──────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({
    summary: 'Get AI feature toggle states',
    description:
      'Returns the per-feature AI toggles for the org (`cashFlowForecast`, `anomalyDetection`, `insightGeneration`, `transactionCategorization`, `reconciliationAssist`). Disabled features still respond to API calls but return empty payloads — surface these flags in the UI to keep users in sync.',
  })
  async getSettings(@OrgId() orgId: string) {
    return this.aiService.getSettings(orgId);
  }

  @Patch('settings')
  @ApiOperation({
    summary: 'Enable/disable individual AI features',
    description:
      'Patches the AI feature toggles. Disabling a feature stops upstream Claude calls immediately; re-enabling does not retroactively backfill data — new insights are generated only on subsequent requests. Useful for orgs that want to control AI spend or comply with data-residency policies.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cashFlowForecast: { type: 'boolean', example: true },
        anomalyDetection: { type: 'boolean', example: true },
        insightGeneration: { type: 'boolean', example: true },
        transactionCategorization: { type: 'boolean', example: true },
        reconciliationAssist: { type: 'boolean', example: true },
      },
    },
  })
  async updateSettings(
    @OrgId() orgId: string,
    @Body()
    body: {
      cashFlowForecast?: boolean;
      anomalyDetection?: boolean;
      insightGeneration?: boolean;
      transactionCategorization?: boolean;
      reconciliationAssist?: boolean;
    },
  ) {
    return this.aiService.updateSettings(orgId, body);
  }

  // ─── Stored Insights (for widgets) ────────────────────────────

  @Get('stored-insights')
  @ApiOperation({
    summary: 'Get persisted AI insights for dashboard widget',
    description:
      'Returns the most recent non-dismissed insights persisted by previous `/ai/insights` calls, capped by `limit` (default 5). Cheap to call repeatedly — no Claude tokens are spent. Use this to render the dashboard widget without triggering a fresh AI run on every page load.',
  })
  async getStoredInsights(
    @OrgId() orgId: string,
    @Query('limit') limit: number = 5,
  ) {
    return this.aiService.getStoredInsights(orgId, limit);
  }

  @Post('dismiss-insight')
  @ApiOperation({
    summary: 'Dismiss an AI insight',
    description:
      'Marks an insight as dismissed so it stops appearing in the dashboard widget. Dismissal is per-org, not per-user — once any team member dismisses an insight it is hidden for everyone. The insight row is retained for analytics, just flagged.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['insightId'],
      properties: {
        insightId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
      },
    },
  })
  async dismissInsight(
    @OrgId() orgId: string,
    @Body() body: { insightId: string },
  ) {
    return this.aiService.dismissInsight(body.insightId, orgId);
  }
}
