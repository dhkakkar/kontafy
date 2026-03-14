import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { CommerceService } from './commerce.service';
import { OrgId } from '../common/decorators/org-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  connectPlatformSchema,
  ConnectPlatformDto,
  syncTriggerSchema,
  SyncTriggerDto,
  ordersQuerySchema,
  OrdersQueryDto,
  syncHistoryQuerySchema,
  SyncHistoryQueryDto,
  Platform,
  platformEnum,
} from './dto/commerce.dto';

@ApiTags('Commerce')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('commerce')
export class CommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  // ─── Connection Management ──────────────────────────────────────────

  @Post('connect')
  @ApiOperation({ summary: 'Connect an e-commerce platform' })
  async connectPlatform(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(connectPlatformSchema)) body: ConnectPlatformDto,
  ) {
    return this.commerceService.connectPlatform(orgId, body);
  }

  @Delete('disconnect/:platform')
  @ApiOperation({ summary: 'Disconnect an e-commerce platform' })
  async disconnectPlatform(
    @OrgId() orgId: string,
    @Param('platform') platform: string,
  ) {
    const parsed = platformEnum.parse(platform);
    return this.commerceService.disconnectPlatform(orgId, parsed);
  }

  // ─── Sync ──────────────────────────────────────────────────────────

  @Post('sync/:platform')
  @ApiOperation({ summary: 'Manually trigger a sync for a platform' })
  async syncPlatform(
    @OrgId() orgId: string,
    @Param('platform') platform: string,
    @Body(new ZodValidationPipe(syncTriggerSchema)) body: SyncTriggerDto,
  ) {
    const parsed = platformEnum.parse(platform);
    if (body.type === 'settlements') {
      return this.commerceService.syncSettlements(orgId, parsed, body);
    }
    return this.commerceService.syncOrders(orgId, parsed, body);
  }

  // ─── Read Endpoints ────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'Get connection status for all platforms' })
  async getStatus(@OrgId() orgId: string) {
    return this.commerceService.getConnectionStatus(orgId);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List synced e-commerce orders' })
  async getOrders(
    @OrgId() orgId: string,
    @Query(new ZodValidationPipe(ordersQuerySchema)) query: OrdersQueryDto,
  ) {
    return this.commerceService.getOrders(orgId, query);
  }

  @Get('sync-history/:platform')
  @ApiOperation({ summary: 'Get sync run history for a platform' })
  async getSyncHistory(
    @OrgId() orgId: string,
    @Param('platform') platform: string,
    @Query(new ZodValidationPipe(syncHistoryQuerySchema)) query: SyncHistoryQueryDto,
  ) {
    const parsed = platformEnum.parse(platform);
    return this.commerceService.getSyncHistory(orgId, parsed, query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'E-commerce dashboard analytics' })
  async getDashboard(@OrgId() orgId: string) {
    return this.commerceService.getDashboard(orgId);
  }
}
