import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('Email')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send-invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send invoice email with PDF attachment',
    description:
      'Queues an outbound email to the supplied address with the rendered invoice PDF attached. Returns the `emailLogId` so the caller can poll delivery status via the email logs. Dispatch is asynchronous — the response only confirms the email is in the send queue.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['invoiceId', 'toEmail'],
      properties: {
        invoiceId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        toEmail: { type: 'string', format: 'email', example: 'client@example.com' },
      },
    },
  })
  async sendInvoiceEmail(
    @OrgId() orgId: string,
    @Body() body: { invoiceId: string; toEmail: string },
  ) {
    const result = await this.emailService.sendInvoiceEmail(
      body.invoiceId,
      orgId,
      body.toEmail,
    );
    return {
      message: 'Invoice email queued successfully',
      emailLogId: result.emailLogId,
    };
  }

  @Post('send-reminder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send payment reminder email',
    description:
      'Queues a payment-reminder email for an outstanding invoice. The body uses the configured reminder template with merge fields for due date, outstanding amount, and a payment link. Each call is logged for audit and the reminder count on the invoice is incremented.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['invoiceId', 'toEmail'],
      properties: {
        invoiceId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        toEmail: { type: 'string', format: 'email', example: 'client@example.com' },
      },
    },
  })
  async sendReminderEmail(
    @OrgId() orgId: string,
    @Body() body: { invoiceId: string; toEmail: string },
  ) {
    const result = await this.emailService.sendPaymentReminder(
      body.invoiceId,
      orgId,
      body.toEmail,
    );
    return {
      message: 'Reminder email queued successfully',
      emailLogId: result.emailLogId,
    };
  }

  @Post('send-receipt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send payment receipt email',
    description:
      'Queues a receipt email with the rendered payment receipt PDF attached, addressed to `toEmail`. Returns the `emailLogId` for delivery tracking. Typically called automatically after a customer payment is recorded, but exposed here for manual re-sends.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentId', 'toEmail'],
      properties: {
        paymentId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        toEmail: { type: 'string', format: 'email', example: 'client@example.com' },
      },
    },
  })
  async sendReceiptEmail(
    @OrgId() orgId: string,
    @Body() body: { paymentId: string; toEmail: string },
  ) {
    const result = await this.emailService.sendPaymentReceipt(
      body.paymentId,
      orgId,
      body.toEmail,
    );
    return {
      message: 'Receipt email queued successfully',
      emailLogId: result.emailLogId,
    };
  }
}
