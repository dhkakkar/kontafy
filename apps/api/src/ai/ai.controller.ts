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
  @ApiOperation({ summary: 'Get AI-powered 30/60/90 day cash flow forecast' })
  async getCashFlowForecast(@OrgId() orgId: string) {
    return this.aiService.getCashFlowForecast(orgId);
  }

  // ─── Business Insights ────────────────────────────────────────

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-generated business insights feed' })
  async getInsights(@OrgId() orgId: string) {
    return this.aiService.generateInsights(orgId);
  }

  // ─── Anomaly Detection ────────────────────────────────────────

  @Get('anomalies')
  @ApiOperation({ summary: 'Detect anomalies in recent transactions' })
  async getAnomalies(@OrgId() orgId: string) {
    return this.aiService.detectAnomalies(orgId);
  }

  // ─── Transaction Categorization ───────────────────────────────

  @Post('categorize-transaction')
  @ApiOperation({ summary: 'AI-suggest account category for a bank transaction' })
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
  @ApiOperation({ summary: 'Suggest matching journal entries for bank reconciliation' })
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
  @ApiOperation({ summary: 'Get AI feature toggle states' })
  async getSettings(@OrgId() orgId: string) {
    return this.aiService.getSettings(orgId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Enable/disable individual AI features' })
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
  @ApiOperation({ summary: 'Get persisted AI insights for dashboard widget' })
  async getStoredInsights(
    @OrgId() orgId: string,
    @Query('limit') limit: number = 5,
  ) {
    return this.aiService.getStoredInsights(orgId, limit);
  }

  @Post('dismiss-insight')
  @ApiOperation({ summary: 'Dismiss an AI insight' })
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
