import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { AUTH_COOKIE_NAME, type NodeEnv } from './config/env.js';
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
  // Swagger는 전역 JwtAuthGuard를 거치지 않고 Express에 직접 등록된다.
  // 운영에서는 API 명세가 공개되지 않도록 /docs와 /docs-json을 만들지 않는다.
  if (app.get(ConfigService).getOrThrow<NodeEnv>('NODE_ENV') !== 'production') setupSwagger(app);
  app.enableShutdownHooks();
}

function setupSwagger(app: INestApplication) {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Template API')
      .setVersion('1.0')
      .addCookieAuth(AUTH_COOKIE_NAME)
      .build(),
  );
  SwaggerModule.setup('docs', app, document, { customSiteTitle: 'Template API 문서' });
}
