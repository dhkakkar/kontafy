import { Processor } from "@nestjs/bull";
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CommerceService } from './commerce.service';
import { Platform } from './dto/commerce.dto';

export interface CommerceSyncJobData {
  org_id: string;
  platform?: Platform;
  type?: 'orders' | 'settlements';
}

@Processor('commerce-sync')
export class CommerceProcessor  {
  private readonly logger = new Logger(CommerceProcessor.name);

  constructor(
    private readonly commerceService: CommerceService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<CommerceSyncJobData>): Promise<void> {
    const { org_id, platform, type } = job.data;

    this.logger.log(
      `Processing commerce sync job ${job.id} — org: ${org_id}, platform: ${platform ?? 'all'}`,
    );

    try {
      if (platform) {
        // Single platform sync
        if (type === 'settlements') {
          await this.commerceService.syncSettlements(org_id, platform);
        } else {
          await this.commerceService.syncOrders(org_id, platform);
        }
      } else {
        // Sync all connected platforms
        await this.commerceService.syncAllPlatforms(org_id);
      }

      this.logger.log(`Commerce sync job ${job.id} completed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Commerce sync job ${job.id} failed: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Called by a scheduled CRON trigger to sync all orgs.
   * In production, this would be triggered by a separate scheduled job
   * that enqueues individual org sync jobs.
   */
  async scheduledSyncAll(): Promise<void> {
    this.logger.log('Starting scheduled sync for all organizations...');

    const connections = await this.prisma.marketplaceConnection.findMany({
      where: { is_active: true },
      select: { org_id: true },
      distinct: ['org_id'],
    });

    this.logger.log(`Found ${connections.length} orgs with active connections`);

    for (const conn of connections) {
      try {
        await this.commerceService.syncAllPlatforms(conn.org_id);
      } catch (error) {
        this.logger.error(
          `Scheduled sync failed for org ${conn.org_id}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log('Scheduled sync complete');
  }
}
