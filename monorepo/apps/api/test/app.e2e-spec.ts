import type { INestApplication } from '@nestjs/common';
import { Body, Controller, Get, Module, Post, Query } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { IsInt, IsString } from 'class-validator';
import { LoggerModule } from 'nestjs-pino';
import { Writable } from 'node:stream';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuthModule } from '../src/auth/auth.module.js';
import { CurrentUser, Public } from '../src/auth/decorators.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { AUTH_COOKIE_NAME, validateEnv } from '../src/config/env.js';
import { loggingOptions } from '../src/config/logging.js';
import { configureApp } from '../src/configure-app.js';
import { HealthModule } from '../src/health/health.module.js';

import 'reflect-metadata';

class CreateDto {
  @IsString() name!: string;
}
class QueryDto {
  @IsInt() count!: number;
}
@Controller('test')
class TestController {
  @Get('protected') protected(@CurrentUser() user: unknown) {
    return user;
  }
  @Public() @Get('public') public() {
    return { ok: true };
  }
  @Public() @Post('validate') validate(@Body() body: CreateDto) {
    return body;
  }
  @Public() @Get('query') query(@Query() query: QueryDto) {
    return query;
  }
  @Public() @Get('throw') fail() {
    throw new Error('테스트 내부 오류');
  }
}
const lines: string[] = [];
const stream = new Writable({
  write(chunk, _encoding, done) {
    lines.push(String(chunk));
    done();
  },
});
const options = loggingOptions();
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: [options.pinoHttp as Exclude<typeof options.pinoHttp, unknown[]>, stream],
    }),
    AuthModule,
    HealthModule,
  ],
  controllers: [TestController],
  providers: [HttpExceptionFilter],
})
class E2eModule {}
function logs() {
  return lines
    .join('')
    .split('\n')
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as {
          req?: { id: string; headers: Record<string, string> };
          err?: { stack: string };
          level: number;
        },
    );
}
async function createApp(databaseUrl?: string) {
  const builder = Test.createTestingModule({ imports: [E2eModule] });
  if (databaseUrl)
    builder
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ ...process.env, DATABASE_URL: databaseUrl }));
  const module = await builder.compile();
  const app = module.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.init();
  return app;
}
let app: INestApplication;
beforeAll(async () => {
  app = await createApp();
});
afterAll(async () => {
  await app?.close();
});
describe('API 통합', () => {
  it('ValidationPipe가 정의되지 않은 필드를 400으로 거부', async () => {
    const response = await request(app.getHttpServer())
      .post('/test/validate')
      .send({ name: '이름', extra: true });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('HTTP_400');
  });
  it('타입이 틀린 쿼리는 400', async () => {
    await request(app.getHttpServer()).get('/test/query?count=abc').expect(400);
  });
  it('보호 라우트는 쿠키 없이 401·유효한 JWT 쿠키로 200', async () => {
    await request(app.getHttpServer()).get('/test/protected').expect(401);
    const token = new JwtService().sign(
      { sub: 'test-user' },
      { secret: process.env.JWT_SECRET, expiresIn: '1m' },
    );
    const response = await request(app.getHttpServer())
      .get('/test/protected')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
      .expect(200);
    expect(response.body.sub).toBe('test-user');
    await request(app.getHttpServer())
      .get('/test/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/test/protected')
      .set('Cookie', `${AUTH_COOKIE_NAME}=invalid`)
      .expect(401);
  });
  it('@Public 라우트는 쿠키 없이 200', async () => {
    await request(app.getHttpServer()).get('/test/public').expect(200);
  });
  it('응답의 X-Request-Id가 UUID이고 같은 요청의 로그 req.id와 같다', async () => {
    const response = await request(app.getHttpServer())
      .get('/test/public')
      .set('X-Request-Id', 'untrusted-client-id')
      .expect(200);
    const id = response.headers['x-request-id'] as string;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(logs().some((line) => line.req?.id === id)).toBe(true);
  });
  it('request log redacts auth cookie', async () => {
    const token = new JwtService().sign({ sub: 'redact-user' }, { secret: process.env.JWT_SECRET });
    const response = await request(app.getHttpServer())
      .get('/test/protected')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const entries = logs().filter((line) => line.req?.id === response.headers['x-request-id']);
    expect(entries.length).toBeGreaterThan(0);
    expect(JSON.stringify(entries)).not.toContain(token);
    expect(entries[0].req?.headers.cookie).toBe('[Redacted]');
    expect(entries[0].req?.headers.authorization).toBe('[Redacted]');
  });
  it('unhandled error is logged with stack', async () => {
    const response = await request(app.getHttpServer()).get('/test/throw').expect(500);
    expect(
      logs().some(
        (line) =>
          line.req?.id === response.headers['x-request-id'] &&
          line.level === 50 &&
          line.err?.stack.includes('테스트 내부 오류'),
      ),
    ).toBe(true);
  });
  it('허용 origin의 preflight가 통과한다', async () => {
    const response = await request(app.getHttpServer())
      .options('/test/protected')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    const get = await request(app.getHttpServer())
      .get('/test/public')
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    expect(get.headers['access-control-expose-headers']).toContain('X-Request-Id');
    const denied = await request(app.getHttpServer())
      .options('/test/protected')
      .set('Origin', 'http://untrusted.invalid')
      .set('Access-Control-Request-Method', 'GET');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('GET /health 200 (database up)', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.details.database.status).toBe('up');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(logs().some((line) => line.req?.id === response.headers['x-request-id'])).toBe(false);
  });
  it('DB가 내려가면 /health는 503 (database down)', async () => {
    const url = process.env.DATABASE_URL;
    let failing: INestApplication | undefined;
    try {
      process.env.DATABASE_URL = 'postgresql://template:template@127.0.0.1:1/template';
      failing = await createApp('postgresql://template:template@127.0.0.1:1/template');
      const response = await request(failing.getHttpServer()).get('/health').expect(503);
      expect(response.body.details.database.status).toBe('down');
      await request(failing.getHttpServer()).get('/test/public').expect(200);
    } finally {
      process.env.DATABASE_URL = url;
      await failing?.close();
    }
  });
});
