import { Controller, Post, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post(':id/generate-pdf')
  @ApiOperation({ summary: 'Generate PDF and send email for a report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'PDF generated and email sent successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async generatePdf(@Param('id') id: string) {
    return await this.reportsService.generateAndSendReport(id);
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
  async getReports(@Query('workerId') workerId?: string) {
    return await this.reportsService.getReports(workerId);
  }
}
