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

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RoofReport API')
    .setDescription('API for GoBo Clean RoofReport PWA')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log('='.repeat(60));
  logger.log('🚀 Application is running on: http://localhost:' + port);
  logger.log('📚 Swagger docs available at: http://localhost:' + port + '/api');
  logger.log('🌍 CORS enabled for: ' + (process.env.FRONTEND_URL || 'http://localhost:3000'));
  logger.log('📊 Environment: ' + (process.env.NODE_ENV || 'development'));
  logger.log('='.repeat(60));
}

bootstrap();
