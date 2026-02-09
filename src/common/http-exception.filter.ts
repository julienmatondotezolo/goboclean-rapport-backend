import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  // Common security probe paths to handle silently
  private readonly SECURITY_PROBES = [
    '/.env',
    '/.git',
    '/wp-admin',
    '/admin',
    '/phpmyadmin',
    '/wp-login.php',
    '/wp-config.php',
    '/.htaccess',
    '/robots.txt',
    '/sitemap.xml',
    '/.well-known',
    '/favicon.ico',
    '/apple-touch-icon',
  ];

  private isSecurityProbe(url: string): boolean {
    return this.SECURITY_PROBES.some(probe => url.startsWith(probe));
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Don't log security probes or favicon requests
    const shouldLog = !this.isSecurityProbe(request.url) || status !== HttpStatus.NOT_FOUND;

    if (shouldLog) {
      // Log the error with details
      this.logger.error(
        `❌ ${request.method} ${request.url} - Status: ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      
      this.logger.error(`📋 Error Details: ${message}`);
      
      if (request.body && Object.keys(request.body).length > 0) {
        this.logger.error(`📦 Request Body: ${JSON.stringify(request.body, null, 2)}`);
      }
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    });
  }
}
