import { Controller, Post, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post(':id/generate-pdf')
  @ApiOperation({ summary: 'Generate PDF and send email for a report (can be used to regenerate)' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'PDF generated and email sent successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async generatePdf(@Param('id') id: string) {
    return await this.reportsService.generateAndSendReport(id);
  }

  @Post(':id/regenerate-pdf')
  @ApiOperation({ summary: 'Regenerate PDF without sending email (for fixing broken PDFs)' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'PDF regenerated successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async regeneratePdf(@Param('id') id: string) {
    return await this.reportsService.regeneratePdfOnly(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a report by ID' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report found' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReport(@Param('id') id: string) {
    return await this.reportsService.getReport(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reports or filter by worker' })
  @ApiQuery({ name: 'workerId', required: false, description: 'Filter by worker ID' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async getReports(
    @Query('workerId') workerId?: string,
    @CurrentUser() user?: any,
  ) {
    // If user is not admin, only return their reports
    if (user && user.role !== 'admin') {
      return await this.reportsService.getReports(user.id);
    }
    return await this.reportsService.getReports(workerId);
  }
}
