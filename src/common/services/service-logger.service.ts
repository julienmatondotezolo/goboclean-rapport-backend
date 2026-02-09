import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { MonitoringService } from '../../monitoring/monitoring.service';

interface CrudContext {
  service: string;
  operation: 'create' | 'read' | 'update' | 'delete' | 'list';
  entity: string;
  entityId?: string | number;
  userId?: string;
  userRole?: string;
  data?: any;
  filters?: any;
  duration?: number;
  error?: Error;
  resultCount?: number;
  timestamp: string;
}

@Injectable()
export class ServiceLoggerService {
  private readonly logger = new Logger('CRUD');

  constructor(
    @Inject(forwardRef(() => MonitoringService))
    private readonly monitoringService: MonitoringService,
  ) {}

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Handle arrays
    if (Array.isArray(data)) {
      if (data.length > 10) {
        return {
          _type: 'array',
          _count: data.length,
          _sample: data.slice(0, 2).map(item => this.sanitizeData(item)),
          _truncated: true,
        };
      }
      return data.map(item => this.sanitizeData(item));
    }

    // Handle objects
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'access_token', 'refresh_token'];
      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      }

      // Truncate large text fields
      for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'string' && value.length > 200) {
          sanitized[key] = value.substring(0, 200) + '...[TRUNCATED]';
        }
      }

      return sanitized;
    }

    return data;
  }

  logCrudOperation(context: CrudContext): void {
    const emoji = {
      create: '➕',
      read: '👁️',
      update: '✏️',
      delete: '🗑️',
      list: '📋',
    };

    const logData = {
      ...context,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(context.data),
      filters: this.sanitizeData(context.filters),
    };

    if (context.error) {
      this.logger.error(
        `${emoji[context.operation]} ${context.service}.${context.operation} ${context.entity} FAILED`,
        context.error.stack,
        logData
      );
    } else {
      this.logger.log(
        `${emoji[context.operation]} ${context.service}.${context.operation} ${context.entity}${context.entityId ? ` (${context.entityId})` : ''} ${context.duration ? `(${context.duration}ms)` : ''}`,
        logData
      );
    }

    // Track CRUD operation in monitoring
    if (context.userId && this.monitoringService) {
      this.monitoringService.trackCrudOperation(
        context.userId,
        context.operation,
        context.entity,
        context.entityId?.toString(),
        context.duration,
        context.error?.message,
        {
          service: context.service,
          resultCount: context.resultCount,
          filters: context.filters,
        }
      );
    }
  }

  // Convenience methods for each operation
  logCreate(
    service: string, 
    entity: string, 
    data: any, 
    result?: any, 
    user?: { id: string; role: string }, 
    duration?: number,
    error?: Error
  ): void {
    this.logCrudOperation({
      service,
      operation: 'create',
      entity,
      entityId: result?.id,
      userId: user?.id,
      userRole: user?.role,
      data,
      duration,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  logRead(
    service: string, 
    entity: string, 
    entityId: string | number, 
    result?: any,
    user?: { id: string; role: string }, 
    duration?: number,
    error?: Error
  ): void {
    this.logCrudOperation({
      service,
      operation: 'read',
      entity,
      entityId,
      userId: user?.id,
      userRole: user?.role,
      duration,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  logUpdate(
    service: string, 
    entity: string, 
    entityId: string | number,
    data: any, 
    result?: any,
    user?: { id: string; role: string }, 
    duration?: number,
    error?: Error
  ): void {
    this.logCrudOperation({
      service,
      operation: 'update',
      entity,
      entityId,
      userId: user?.id,
      userRole: user?.role,
      data,
      duration,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  logDelete(
    service: string, 
    entity: string, 
    entityId: string | number,
    user?: { id: string; role: string }, 
    duration?: number,
    error?: Error
  ): void {
    this.logCrudOperation({
      service,
      operation: 'delete',
      entity,
      entityId,
      userId: user?.id,
      userRole: user?.role,
      duration,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  logList(
    service: string, 
    entity: string, 
    filters?: any,
    resultCount?: number,
    user?: { id: string; role: string }, 
    duration?: number,
    error?: Error
  ): void {
    this.logCrudOperation({
      service,
      operation: 'list',
      entity,
      userId: user?.id,
      userRole: user?.role,
      filters,
      resultCount,
      duration,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  // Helper method to time operations
  startTimer(): () => number {
    const startTime = Date.now();
    return () => Date.now() - startTime;
  }
}