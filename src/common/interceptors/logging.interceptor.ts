import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { MonitoringService } from '../../monitoring/monitoring.service';

interface LogContext {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  userRole?: string;
  timestamp: string;
  responseTime?: number;
  statusCode?: number;
  errorMessage?: string;
  requestBody?: any;
  responseBody?: any;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API');

  constructor(
    @Inject(forwardRef(() => MonitoringService))
    private readonly monitoringService: MonitoringService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();
    
    // Generate unique request ID
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Extract user info from request (assumes auth middleware sets request.user)
    const user = request.user;
    
    // Create base log context
    const logContext: LogContext = {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection.remoteAddress,
      userId: user?.id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
    };

    // Log request body for POST/PUT/PATCH (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      logContext.requestBody = this.sanitizeRequestBody(request.body);
    }

    // Log incoming request
    this.logger.log(`📥 ${request.method} ${request.url}`, {
      ...logContext,
      action: 'request_start',
    });

    // Track user session if authenticated
    if (user) {
      this.monitoringService.trackUserSession(
        user.id,
        requestId,
        {
          role: user.role,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        logContext.ip,
        logContext.userAgent
      );
    }

    return next.handle().pipe(
      tap((responseBody) => {
        const responseTime = Date.now() - startTime;
        
        // Log successful response
        this.logger.log(`📤 ${request.method} ${request.url} - ${response.statusCode} (${responseTime}ms)`, {
          ...logContext,
          action: 'request_success',
          statusCode: response.statusCode,
          responseTime,
          responseBody: this.sanitizeResponseBody(responseBody),
        });

        // Track API call in monitoring
        if (user) {
          this.monitoringService.trackApiCall(
            user.id,
            request.method,
            request.url,
            response.statusCode,
            responseTime,
            undefined,
            { requestId }
          );
        }
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        
        // Log error response
        this.logger.error(`🚨 ${request.method} ${request.url} - ERROR (${responseTime}ms)`, error.stack, {
          ...logContext,
          action: 'request_error',
          statusCode: error.status || 500,
          responseTime,
          errorMessage: error.message,
          errorName: error.name,
          errorStack: error.stack,
        });

        // Track API error in monitoring
        if (user) {
          this.monitoringService.trackApiCall(
            user.id,
            request.method,
            request.url,
            error.status || 500,
            responseTime,
            error.message,
            { requestId, errorName: error.name }
          );
        }

        return throwError(() => error);
      }),
    );
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return body;

    // Create a copy to avoid mutating original
    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Truncate large bodies
    const serialized = JSON.stringify(sanitized);
    if (serialized.length > 1000) {
      return {
        ...sanitized,
        _truncated: true,
        _originalSize: serialized.length,
      };
    }

    return sanitized;
  }

  private sanitizeResponseBody(body: any): any {
    if (!body) return body;

    // Don't log large responses
    const serialized = JSON.stringify(body);
    if (serialized.length > 1000) {
      return {
        _dataType: Array.isArray(body) ? 'array' : typeof body,
        _itemCount: Array.isArray(body) ? body.length : 'N/A',
        _size: serialized.length,
        _truncated: true,
      };
    }

    // Create a copy and remove sensitive fields
    const sanitized = JSON.parse(serialized);
    this.removeSensitiveFields(sanitized);
    
    return sanitized;
  }

  private removeSensitiveFields(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'access_token', 'refresh_token'];
    
    for (const field of sensitiveFields) {
      if (obj[field]) {
        obj[field] = '[REDACTED]';
      }
    }

    // Recursively process nested objects and arrays
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        if (Array.isArray(obj[key])) {
          obj[key].forEach((item: any) => this.removeSensitiveFields(item));
        } else {
          this.removeSensitiveFields(obj[key]);
        }
      }
    }
  }
}