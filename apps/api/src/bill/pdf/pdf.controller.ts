import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { OrgId } from '../../common/decorators/org-id.decorator';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/invoices')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Get or generate invoice PDF URL' })
  async getPdfUrl(
    @OrgId() orgId: string,
    @Param('id') id: string,
  ) {
    const url = await this.pdfService.getOrGenerateInvoicePdf(id, orgId);
    return { url };
  }

  @Get(':id/pdf/download')
  @ApiOperation({ summary: 'Download invoice PDF directly' })
  async downloadPdf(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.pdfService.getInvoicePdfBuffer(id, orgId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-cache',
    });

    res.end(buffer);
  }

  @Post(':id/pdf/regenerate')
  @ApiOperation({ summary: 'Force regenerate invoice PDF' })
  async regeneratePdf(
    @OrgId() orgId: string,
    @Param('id') id: string,
  ) {
    const url = await this.pdfService.regenerateInvoicePdf(id, orgId);
    return { url, message: 'PDF regenerated successfully' };
  }
}
