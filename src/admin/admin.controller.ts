import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter (ISO format)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.adminService.getStatistics(startDate, endDate);
  }

  @Get('workers')
  @ApiOperation({ summary: 'Get all workers' })
  @ApiResponse({ status: 200, description: 'Workers retrieved successfully' })
  async getWorkers() {
    return await this.adminService.getWorkers();
  }

  @Get('workers/:id/reports')
  @ApiOperation({ summary: 'Get reports by worker ID' })
  @ApiParam({ name: 'id', description: 'Worker ID' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async getWorkerReports(@Param('id') id: string) {
    return await this.adminService.getReportsByWorker(id);
  }
}
