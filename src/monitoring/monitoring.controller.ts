import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MonitoringService, UserActivity, ActivityLog } from './monitoring.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller('api/monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('active-users')
  @ApiOperation({ summary: 'Get currently active users' })
  getActiveUsers(): { success: boolean; data: UserActivity[] } {
    return {
      success: true,
      data: this.monitoringService.getActiveUsers(),
    };
  }

  @Get('user-activity')
  @ApiOperation({ summary: 'Get activity for a specific user' })
  @ApiQuery({ name: 'userId', required: true })
  getUserActivity(@Query('userId') userId: string): { success: boolean; data: UserActivity | null } {
    const activity = this.monitoringService.getUserActivity(userId);
    return {
      success: true,
      data: activity,
    };
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent activities across all users' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getRecentActivities(@Query('limit') limit?: number): { success: boolean; data: ActivityLog[] } {
    return {
      success: true,
      data: this.monitoringService.getRecentActivities(limit ? parseInt(limit.toString()) : 100),
    };
  }

  @Get('activities-by-type')
  @ApiOperation({ summary: 'Get activities filtered by type' })
  @ApiQuery({ name: 'type', required: true, enum: ['page_load', 'api_call', 'crud_operation', 'error'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getActivitiesByType(
    @Query('type') type: 'page_load' | 'api_call' | 'crud_operation' | 'error',
    @Query('limit') limit?: number
  ): { success: boolean; data: ActivityLog[] } {
    return {
      success: true,
      data: this.monitoringService.getActivitiesByType(type, limit ? parseInt(limit.toString()) : 50),
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get monitoring statistics and metrics' })
  getStatistics(): { success: boolean; data: any } {
    return {
      success: true,
      data: this.monitoringService.getStatistics(),
    };
  }

  @Get('page-analytics')
  @ApiOperation({ summary: 'Get page load analytics' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPageAnalytics(@Query('limit') limit?: number): { success: boolean; data: any } {
    const pageLoads = this.monitoringService.getActivitiesByType('page_load', limit ? parseInt(limit.toString()) : 100);
    
    // Aggregate page visits
    const pageVisits = pageLoads.reduce((acc, log) => {
      const page = log.page || 'unknown';
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort by visit count
    const sortedPages = Object.entries(pageVisits)
      .sort(([, a], [, b]) => b - a)
      .map(([page, count]) => ({ page, count }));

    return {
      success: true,
      data: {
        totalPageLoads: pageLoads.length,
        uniquePages: Object.keys(pageVisits).length,
        pageVisits: sortedPages,
        recentPageLoads: pageLoads.slice(0, 20), // Last 20 page loads
      },
    };
  }

  @Get('error-analytics')
  @ApiOperation({ summary: 'Get error analytics' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getErrorAnalytics(@Query('limit') limit?: number): { success: boolean; data: any } {
    const errors = this.monitoringService.getActivitiesByType('error', limit ? parseInt(limit.toString()) : 100);
    
    // Aggregate errors by type
    const errorTypes = errors.reduce((acc, log) => {
      const errorType = log.error || 'unknown';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Aggregate errors by page
    const errorsByPage = errors.reduce((acc, log) => {
      const page = log.page || log.endpoint || 'unknown';
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        totalErrors: errors.length,
        errorTypes: Object.entries(errorTypes).sort(([, a], [, b]) => b - a),
        errorsByPage: Object.entries(errorsByPage).sort(([, a], [, b]) => b - a),
        recentErrors: errors.slice(0, 20), // Last 20 errors
      },
    };
  }

  @Get('performance-analytics')
  @ApiOperation({ summary: 'Get performance analytics' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPerformanceAnalytics(@Query('limit') limit?: number): { success: boolean; data: any } {
    const apiCalls = this.monitoringService.getActivitiesByType('api_call', limit ? parseInt(limit.toString()) : 100);
    const crudOps = this.monitoringService.getActivitiesByType('crud_operation', limit ? parseInt(limit.toString()) : 100);
    
    // API call performance
    const apiPerformance = apiCalls
      .filter(log => log.responseTime)
      .reduce((acc, log) => {
        const endpoint = log.endpoint || 'unknown';
        if (!acc[endpoint]) {
          acc[endpoint] = { totalTime: 0, count: 0, avgTime: 0 };
        }
        acc[endpoint].totalTime += log.responseTime!;
        acc[endpoint].count += 1;
        acc[endpoint].avgTime = Math.round(acc[endpoint].totalTime / acc[endpoint].count);
        return acc;
      }, {} as Record<string, { totalTime: number; count: number; avgTime: number }>);

    // CRUD operation performance
    const crudPerformance = crudOps
      .filter(log => log.responseTime)
      .reduce((acc, log) => {
        const operation = log.details?.entity || 'unknown';
        if (!acc[operation]) {
          acc[operation] = { totalTime: 0, count: 0, avgTime: 0 };
        }
        acc[operation].totalTime += log.responseTime!;
        acc[operation].count += 1;
        acc[operation].avgTime = Math.round(acc[operation].totalTime / acc[operation].count);
        return acc;
      }, {} as Record<string, { totalTime: number; count: number; avgTime: number }>);

    // Slowest operations
    const slowestAPIs = Object.entries(apiPerformance)
      .sort(([, a], [, b]) => b.avgTime - a.avgTime)
      .slice(0, 10);

    const slowestCRUD = Object.entries(crudPerformance)
      .sort(([, a], [, b]) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return {
      success: true,
      data: {
        apiCallCount: apiCalls.length,
        crudOperationCount: crudOps.length,
        slowestAPIs: slowestAPIs.map(([endpoint, stats]) => ({ endpoint, ...stats })),
        slowestCRUD: slowestCRUD.map(([operation, stats]) => ({ operation, ...stats })),
        averageApiTime: apiCalls.reduce((sum, log) => sum + (log.responseTime || 0), 0) / apiCalls.length || 0,
        averageCrudTime: crudOps.reduce((sum, log) => sum + (log.responseTime || 0), 0) / crudOps.length || 0,
      },
    };
  }
}