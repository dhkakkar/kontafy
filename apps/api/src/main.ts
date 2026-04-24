import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditService } from './audit/audit.service';
import { initSentry } from './common/sentry';

async function bootstrap() {
  // Initialize Sentry before anything else
  initSentry();
  const logger = pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Raise JSON/URL-encoded body limits so avatar uploads (base64 data URLs,
  // ~1.3 MB for a 1 MB image) and other small payloads fit comfortably.
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  const configService = app.get(ConfigService);

  // Pino HTTP logger middleware
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req: any) => req.url === '/health',
      },
    }),
  );

  // API versioning — routes become /v1/health, /v1/auth/signup, etc.
  // No global prefix since domain is already api.kontafy.com
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id'],
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors
  const auditService = app.get(AuditService);
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new AuditInterceptor(auditService, reflector),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kontafy API')
    .setDescription('Cloud-native accounting platform for Indian businesses')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase JWT token',
      },
      'access-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Org-Id',
        description: 'Organization ID for multi-tenant access',
      },
      'org-id',
    )
    .addTag('Auth', 'Authentication & Authorization')
    .addTag('Organizations', 'Organization & Member management')
    .addTag('Books', 'Chart of Accounts, Journal, Ledger')
    .addTag('Bill', 'Invoices & Contacts')
    .addTag('Health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('PORT', 5002);
  await app.listen(port);

  logger.info(`Kontafy API running on http://localhost:${port}`);
  logger.info(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
