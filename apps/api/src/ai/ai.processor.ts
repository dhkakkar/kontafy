import { Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';

export interface AiJobPayload {
  type: 'forecast' | 'anomalies' | 'insights';
  orgId?: string; // If null, run for all orgs
}

@Processor('ai')
export class AiProcessor {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  async process(job: Job<AiJobPayload>): Promise<void> {
    const { type, orgId } = job.data;

    this.logger.log(
      `Processing AI job: ${type}${orgId ? ` for org ${orgId}` : ' for all orgs'}`,
    );

    try {
      const orgIds = orgId
        ? [orgId]
        : await this.getAllActiveOrgIds();

      for (const id of orgIds) {
        try {
          await this.processForOrg(type, id);
        } catch (error) {
          this.logger.error(
            `AI job ${type} failed for org ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // Continue processing other orgs
        }
      }

      this.logger.log(`AI job ${type} completed for ${orgIds.length} org(s)`);
    } catch (error) {
      this.logger.error(
        `AI job ${type} failed globally: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private async processForOrg(type: string, orgId: string): Promise<void> {
    // Check if AI features are enabled for this org
    const settings = await this.aiService.getSettings(orgId);

    switch (type) {
      case 'forecast':
        if (!settings.cashFlowForecast) return;
        await this.aiService.getCashFlowForecast(orgId);
        break;

      case 'anomalies':
        if (!settings.anomalyDetection) return;
        await this.aiService.detectAnomalies(orgId);
        break;

      case 'insights':
        if (!settings.insightGeneration) return;
        await this.aiService.generateInsights(orgId);
        break;
    }
  }

  private async getAllActiveOrgIds(): Promise<string[]> {
    const orgs = await this.prisma.organization.findMany({
      select: { id: true },
      where: {
        // Only process orgs with recent activity (members exist)
        members: { some: {} },
      },
    });

    return orgs.map((o) => o.id);
  }
}
