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
  @ApiOperation({
    summary: 'Get or generate invoice PDF URL',
    description:
      'Returns a public R2 / S3 URL to the invoice PDF, generating and uploading it on the first call. Subsequent calls return the cached URL (with a cache-buster query string) so browsers always pick up the latest version. Response shape: `{ url: string }`.',
  })
  async getPdfUrl(
    @OrgId() orgId: string,
    @Param('id') id: string,
  ) {
    const url = await this.pdfService.getOrGenerateInvoicePdf(id, orgId);
    return { url };
  }

  @Get(':id/pdf/download')
  @ApiOperation({
    summary: 'Download invoice PDF directly',
    description:
      'Streams the invoice PDF as an `application/pdf` attachment (filename derived from the invoice number) rather than returning a URL. Useful for server-side fetches that need the bytes directly. `Cache-Control: no-cache` is set so each download reflects the latest render.',
  })
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
  @ApiOperation({
    summary: 'Force regenerate invoice PDF',
    description:
      'Re-renders the invoice PDF from current data and overwrites the cached object in R2 — useful after edits to invoice details, contact info or org branding. Returns `{ url, message }` with the new URL (already cache-busted).',
  })
  async regeneratePdf(
    @OrgId() orgId: string,
    @Param('id') id: string,
  ) {
    const url = await this.pdfService.regenerateInvoicePdf(id, orgId);
    return { url, message: 'PDF regenerated successfully' };
  }
}

/**
 * Parallel PDF routes for purchase bills. The underlying PdfService
 * methods are type-agnostic (look up by `id` only, render the
 * Invoice with its stored `type`), so a purchase bill renders with
 * the "Purchase Bill" title and the same line-item layout as a
 * sales invoice. We just need the bill/purchases-prefixed paths so
 * the frontend's existing api.get / api.download calls match.
 */
@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/purchases')
export class PurchasesPdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get(':id/pdf')
  @ApiOperation({
    summary: 'Get or generate purchase bill PDF URL',
    description:
      'Parallel of the sales-invoice PDF URL endpoint for purchase bills. Returns a cached R2 URL, generating and uploading on first call. The renderer keys off the stored `type` so the document is titled "Purchase Bill" but uses the same line-item layout. Response shape: `{ url: string }`.',
  })
  async getPdfUrl(
    @OrgId() orgId: string,
    @Param('id') id: string,
  ) {
    const url = await this.pdfService.getOrGenerateInvoicePdf(id, orgId);
    return { url };
  }

  @Get(':id/pdf/download')
  @ApiOperation({
    summary: 'Download purchase bill PDF directly',
    description:
      'Streams the purchase bill PDF as an `application/pdf` attachment. Same behaviour as the sales-invoice download endpoint — `no-cache` headers, filename from the bill number — but renders under the "Purchase Bill" title.',
  })
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
  @ApiOperation({
    summary: 'Force regenerate purchase bill PDF',
    description:
      'Re-renders the purchase bill PDF and overwrites the cached object. Use after editing bill line items, vendor info or branding. Returns `{ url, message }` with the new cache-busted URL.',
  })
  async regeneratePdf(
    @OrgId() orgId: string,
    @Param('id') id: string,
  ) {
    const url = await this.pdfService.regenerateInvoicePdf(id, orgId);
    return { url, message: 'PDF regenerated successfully' };
  }
}
