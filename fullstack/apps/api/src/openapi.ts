import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AUTH_COOKIE_NAME } from './config/env.js';

// 실행 중인 Swagger와 파일 생성이 같은 설정·라우트 메타데이터를 사용한다.
export function createOpenApiDocument(app: INestApplication) {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Template API')
      .setVersion('1.0')
      .addCookieAuth(AUTH_COOKIE_NAME)
      .build(),
  );
}
