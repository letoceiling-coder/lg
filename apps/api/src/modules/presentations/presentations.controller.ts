import { Controller, Get, Param, ParseIntPipe, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../auth/decorators';
import { PresentationsService } from './presentations.service';

@ApiTags('Presentations')
@Controller('presentations')
export class PresentationsController {
  constructor(private readonly service: PresentationsService) {}

  @Public()
  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Public: get presentation payload by listing id (any object type)' })
  getListing(@Param('listingId', ParseIntPipe) listingId: number) {
    return this.service.getListingPresentation(listingId);
  }

  @Public()
  @Get('listing/:listingId/pdf')
  @ApiOperation({ summary: 'Public: download listing presentation PDF (photos + plans)' })
  async downloadListingPdf(
    @Param('listingId', ParseIntPipe) listingId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buf = await this.service.generateListingPdf(listingId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=\"listing-${listingId}.pdf\"`);
    res.setHeader('Content-Length', String(buf.length));
    return new StreamableFile(buf);
  }

  @Public()
  @Get(':slug/pdf')
  @ApiOperation({ summary: 'Public: download presentation PDF by block slug' })
  async downloadPdf(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    const buf = await this.service.generatePdf(slug);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=\"presentation-${slug}.pdf\"`);
    res.setHeader('Content-Length', String(buf.length));
    return new StreamableFile(buf);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Public: get presentation payload by block slug' })
  getBySlug(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }
}

