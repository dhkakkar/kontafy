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
  @ApiOperation({ summary: 'Send invoice email with PDF attachment' })
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
  @ApiOperation({ summary: 'Send payment reminder email' })
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
  @ApiOperation({ summary: 'Send payment receipt email' })
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
