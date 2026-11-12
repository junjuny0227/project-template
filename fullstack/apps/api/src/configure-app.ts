import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
export function configureApp(app: INestApplication) {
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: app.get(ConfigService).getOrThrow<string>('CORS_ORIGINS').split(','),
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Template API')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build(),
  );
  SwaggerModule.setup('docs', app, document, { customSiteTitle: 'Template API 문서' });
  app.enableShutdownHooks();
}
