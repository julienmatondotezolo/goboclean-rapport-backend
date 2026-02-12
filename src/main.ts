import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLogger } from './common/logger.service';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const customLogger = new CustomLogger();
  const app = await NestFactory.create(AppModule, {
    logger: customLogger,
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',').map(u => u.trim()) || ['http://localhost:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    exposedHeaders: ['Authorization'],
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation (development only)
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle('GoBo Clean API')
      .setDescription(`
# GoBo Clean RoofReport API

Complete API for the GoBo Clean roof cleaning PWA application.

## Authentication
All endpoints require Bearer token authentication. Get a token by logging in via \`POST /api/auth/login\`.

## Mission Workflow
1. **Create Mission** - Admin creates mission and assigns workers
2. **Start Mission** - Worker starts mission (status: assigned → in_progress)
3. **Submit Before Pictures** - Worker uploads before photos (status: in_progress → waiting_completion)
4. **Complete Mission** - Worker uploads after photos + signatures (status: waiting_completion → completed)

## Photo Storage
- Before/after pictures are stored in Supabase storage
- Photos are linked to missions via report_id (single report with both before and after photos)
- Mission responses include before_pictures and after_pictures arrays

## Email System  
- Resend API (info@goboclean.be)
- Automatic notifications for mission events
- PDF reports generated and emailed on completion
- All emails sent to emjisolutions@gmail.com and client email
      `)
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Bearer token',
        in: 'header',
      })
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Missions', 'Mission management')
      .addTag('Admin', 'Admin-only endpoints')
      .addTag('Email', 'Email testing (admin only)')
      .addTag('Reports', 'PDF report generation')
      .addTag('Notifications', 'Push notifications')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log('='.repeat(60));
  logger.log('🚀 Application is running on: http://localhost:' + port);
  if (isDevelopment) {
    logger.log('📚 Swagger docs available at: http://localhost:' + port + '/api');
    logger.log('🧪 Admin test endpoints available for debugging');
  } else {
    logger.log('📚 Swagger disabled in production');
  }
  logger.log('🌍 CORS enabled for: ' + (process.env.FRONTEND_URL || 'http://localhost:3000'));
  logger.log('📊 Environment: ' + (process.env.NODE_ENV || 'development'));
  logger.log('📧 Email: Resend API ' + (process.env.RESEND_API_KEY ? '✅' : '❌ not configured'));
  logger.log('='.repeat(60));
}

bootstrap();
