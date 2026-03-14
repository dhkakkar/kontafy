import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bull';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../bill/pdf/pdf.service';
import { invoiceEmailTemplate } from './templates/invoice.template';
import { reminderEmailTemplate } from './templates/reminder.template';
import { receiptEmailTemplate } from './templates/receipt.template';
import { welcomeEmailTemplate } from './templates/welcome.template';
import { passwordResetEmailTemplate } from './templates/password-reset.template';
import * as nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  orgId?: string;
  type: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  /**
   * Send an email directly (used by the processor).
   */
  async sendMail(payload: EmailPayload): Promise<void> {
    const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'Kontafy');
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL', this.configService.get<string>('SMTP_USER', ''));
    const replyTo = this.configService.get<string>('SMTP_REPLY_TO', fromEmail);

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        replyTo,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });

      this.logger.log(`Email sent to ${payload.to} — ${payload.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${payload.to}`, error);
      throw error;
    }
  }

  /**
   * Queue an email for background processing.
   */
  private async queueEmail(payload: EmailPayload): Promise<string> {
    // Create email log
    const emailLog = await this.prisma.emailLog.create({
      data: {
        org_id: payload.orgId || null,
        to: payload.to,
        subject: payload.subject,
        type: payload.type,
        status: 'queued',
      },
    });

    // Add to BullMQ queue — attachments with Buffer need serialization
    const serializedPayload = {
      ...payload,
      emailLogId: emailLog.id,
      attachments: payload.attachments?.map((a) => ({
        ...a,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
        encoding: Buffer.isBuffer(a.content) ? 'base64' : undefined,
      })),
    };

    await this.emailQueue.add('send-email', serializedPayload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(`Email queued: ${payload.type} to ${payload.to} [${emailLog.id}]`);
    return emailLog.id;
  }

  /**
   * Send invoice email with PDF attachment.
   */
  async sendInvoiceEmail(
    invoiceId: string,
    orgId: string,
    toEmail: string,
  ): Promise<{ emailLogId: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      include: { contact: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Generate PDF buffer
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.pdfService.generateInvoicePdf(invoiceId, orgId);
    } catch (error) {
      this.logger.error(`Failed to generate PDF for invoice ${invoiceId}`, error);
      throw new InternalServerErrorException('Failed to generate invoice PDF for email');
    }

    const formatDate = (d: Date | null) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    const formatAmount = (val: any) => {
      return Number(val || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const html = invoiceEmailTemplate({
      orgName: org.name,
      contactName: invoice.contact?.name || 'Customer',
      invoiceNumber: invoice.invoice_number,
      invoiceDate: formatDate(invoice.date),
      dueDate: formatDate(invoice.due_date),
      total: formatAmount(invoice.total),
      balanceDue: formatAmount(invoice.balance_due),
      currency: org.currency || 'INR',
    });

    const safeNumber = invoice.invoice_number.replace(/\//g, '-');

    const emailLogId = await this.queueEmail({
      to: toEmail,
      subject: `Invoice ${invoice.invoice_number} from ${org.name}`,
      html,
      attachments: [
        {
          filename: `${safeNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
      orgId,
      type: 'invoice',
    });

    // Mark invoice as email_sent
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { email_sent: true },
    });

    return { emailLogId };
  }

  /**
   * Send payment receipt email.
   */
  async sendPaymentReceipt(
    paymentId: string,
    orgId: string,
    toEmail: string,
  ): Promise<{ emailLogId: string }> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, org_id: orgId },
      include: {
        contact: true,
        allocations: {
          include: { invoice: true },
          take: 1,
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const formatDate = (d: Date | null) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    const formatAmount = (val: any) => {
      return Number(val || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const firstAllocation = payment.allocations?.[0];

    const html = receiptEmailTemplate({
      orgName: org.name,
      contactName: payment.contact?.name || 'Customer',
      paymentAmount: formatAmount(payment.amount),
      currency: org.currency || 'INR',
      paymentDate: formatDate(payment.date),
      paymentMethod: payment.method || undefined,
      paymentReference: payment.reference || undefined,
      invoiceNumber: firstAllocation?.invoice?.invoice_number,
      remainingBalance: firstAllocation?.invoice
        ? formatAmount(firstAllocation.invoice.balance_due)
        : undefined,
    });

    const emailLogId = await this.queueEmail({
      to: toEmail,
      subject: `Payment Receipt — ${org.currency || 'INR'} ${formatAmount(payment.amount)} — ${org.name}`,
      html,
      orgId,
      type: 'receipt',
    });

    return { emailLogId };
  }

  /**
   * Send overdue payment reminder.
   */
  async sendPaymentReminder(
    invoiceId: string,
    orgId: string,
    toEmail: string,
  ): Promise<{ emailLogId: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      include: { contact: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const formatDate = (d: Date | null) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    const formatAmount = (val: any) => {
      return Number(val || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // Calculate days overdue
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date();
    const now = new Date();
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    const html = reminderEmailTemplate({
      orgName: org.name,
      contactName: invoice.contact?.name || 'Customer',
      invoiceNumber: invoice.invoice_number,
      invoiceDate: formatDate(invoice.date),
      dueDate: formatDate(invoice.due_date),
      total: formatAmount(invoice.total),
      balanceDue: formatAmount(invoice.balance_due),
      currency: org.currency || 'INR',
      daysOverdue,
    });

    const emailLogId = await this.queueEmail({
      to: toEmail,
      subject: `Payment Reminder: Invoice ${invoice.invoice_number} — ${org.name}`,
      html,
      orgId,
      type: 'reminder',
    });

    return { emailLogId };
  }

  /**
   * Send welcome email after signup.
   */
  async sendWelcomeEmail(
    userId: string,
    orgName: string,
  ): Promise<{ emailLogId: string }> {
    // Look up user info — in this system, we get it from org_members
    const member = await this.prisma.orgMember.findFirst({
      where: { user_id: userId },
      include: { organization: true },
    });

    // Fallback email retrieval — try to get from the org settings or use a known email
    const userEmail = member?.organization?.email;

    if (!userEmail) {
      throw new NotFoundException('User email not found');
    }

    const html = welcomeEmailTemplate({
      userName: orgName,
      orgName,
    });

    const emailLogId = await this.queueEmail({
      to: userEmail,
      subject: `Welcome to Kontafy — ${orgName}`,
      html,
      orgId: member?.org_id,
      type: 'welcome',
    });

    return { emailLogId };
  }

  /**
   * Send password reset email.
   */
  async sendPasswordReset(
    email: string,
    resetToken: string,
  ): Promise<{ emailLogId: string }> {
    const appUrl = this.configService.get<string>('APP_URL', 'https://app.kontafy.in');
    const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

    const html = passwordResetEmailTemplate({
      email,
      resetUrl,
      expiresInMinutes: 60,
    });

    const emailLogId = await this.queueEmail({
      to: email,
      subject: 'Reset Your Kontafy Password',
      html,
      type: 'password_reset',
    });

    return { emailLogId };
  }
}
