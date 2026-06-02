import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { OrgId } from '../common/decorators/org-id.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  SendInvoiceSchema,
  SendReminderSchema,
  SendReceiptSchema,
  WebhookPayloadSchema,
} from './dto/whatsapp.dto';

@ApiTags('WhatsApp')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('send-invoice')
  @ApiOperation({ summary: 'Send invoice via WhatsApp' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['invoiceId', 'phoneNumber'],
      properties: {
        invoiceId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        phoneNumber: { type: 'string', example: '+919876543210' },
      },
    },
  })
  async sendInvoice(
    @OrgId() orgId: string,
    @Body() body: { invoiceId: string; phoneNumber: string },
  ) {
    const parsed = SendInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.whatsappService.sendInvoice(
      parsed.data.invoiceId,
      orgId,
      parsed.data.phoneNumber,
    );
  }

  @Post('send-reminder')
  @ApiOperation({ summary: 'Send payment reminder via WhatsApp' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['invoiceId'],
      properties: {
        invoiceId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
      },
    },
  })
  async sendReminder(
    @OrgId() orgId: string,
    @Body() body: { invoiceId: string },
  ) {
    const parsed = SendReminderSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.whatsappService.sendPaymentReminder(parsed.data.invoiceId, orgId);
  }

  @Post('send-receipt')
  @ApiOperation({ summary: 'Send payment receipt via WhatsApp' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentId'],
      properties: {
        paymentId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
      },
    },
  })
  async sendReceipt(
    @OrgId() orgId: string,
    @Body() body: { paymentId: string },
  ) {
    const parsed = SendReceiptSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.whatsappService.sendPaymentReceipt(parsed.data.paymentId, orgId);
  }

  @Post('bulk-reminders')
  @ApiOperation({ summary: 'Send reminders for all overdue invoices' })
  async bulkReminders(@OrgId() orgId: string) {
    return this.whatsappService.sendBulkReminders(orgId);
  }

  @Get('messages/:contactId')
  @ApiOperation({ summary: 'Get WhatsApp message history for a contact' })
  async getMessageHistory(
    @OrgId() orgId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.whatsappService.getMessageHistory(contactId, orgId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get WhatsApp messaging stats' })
  async getStats(@OrgId() orgId: string) {
    return this.whatsappService.getStats(orgId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent WhatsApp messages' })
  async getRecentMessages(@OrgId() orgId: string) {
    return this.whatsappService.getRecentMessages(orgId);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'WhatsApp delivery status webhook (public)' })
  async webhook(@Body() body: any) {
    const parsed = WebhookPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid webhook payload');
    }
    return this.whatsappService.handleWebhook(parsed.data as any);
  }
}
