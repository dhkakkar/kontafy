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
  @ApiOperation({
    summary: 'Send invoice via WhatsApp',
    description:
      'Sends an invoice to the supplied phone number via the WhatsApp Business API, attaching the invoice PDF and a short message. The send is logged against the customer contact so it shows up in `GET /whatsapp/messages/:contactId`. Delivery status flows back asynchronously through the webhook.',
  })
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
  @ApiOperation({
    summary: 'Send payment reminder via WhatsApp',
    description:
      'Pushes a polite payment-reminder message for an overdue invoice to the customer\'s registered WhatsApp number. Phone number is read from the customer record on the invoice; if missing, the request returns a 400. For batch reminders across every overdue invoice use `POST /whatsapp/bulk-reminders`.',
  })
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
  @ApiOperation({
    summary: 'Send payment receipt via WhatsApp',
    description:
      'Sends a payment confirmation receipt for a recorded payment to the customer\'s WhatsApp number. Useful as the final touch in a closed-loop billing flow — `send-invoice` → customer pays → `send-receipt`.',
  })
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
  @ApiOperation({
    summary: 'Send reminders for all overdue invoices',
    description:
      'Sweeps every overdue invoice for the org and fires a WhatsApp reminder to each customer that has a phone number on file. Customers without a phone number are skipped silently. Returns a summary of sent / skipped / failed counts.',
  })
  async bulkReminders(@OrgId() orgId: string) {
    return this.whatsappService.sendBulkReminders(orgId);
  }

  @Get('messages/:contactId')
  @ApiOperation({
    summary: 'Get WhatsApp message history for a contact',
    description:
      'Returns the chronological message log between this org and a single customer/vendor contact, including delivery status (`sent` / `delivered` / `read` / `failed`). Drives the per-contact conversation pane.',
  })
  async getMessageHistory(
    @OrgId() orgId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.whatsappService.getMessageHistory(contactId, orgId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get WhatsApp messaging stats',
    description:
      'Returns aggregate counters for the org — total messages sent, delivery rate, read rate and breakdown by message type (invoice / reminder / receipt). Used on the WhatsApp dashboard tab.',
  })
  async getStats(@OrgId() orgId: string) {
    return this.whatsappService.getStats(orgId);
  }

  @Get('recent')
  @ApiOperation({
    summary: 'Get recent WhatsApp messages',
    description:
      'Returns the latest WhatsApp messages across all contacts in the org, with recipient and delivery status. Powers the "Recent activity" feed on the WhatsApp dashboard.',
  })
  async getRecentMessages(@OrgId() orgId: string) {
    return this.whatsappService.getRecentMessages(orgId);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'WhatsApp delivery status webhook (public)',
    description:
      'Public callback URL invoked by the WhatsApp Business API to deliver message status updates (`sent` / `delivered` / `read` / `failed`) and inbound user replies. The handler updates the matching message log row so downstream stats and conversation panes stay in sync.',
  })
  async webhook(@Body() body: any) {
    const parsed = WebhookPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid webhook payload');
    }
    return this.whatsappService.handleWebhook(parsed.data as any);
  }
}
