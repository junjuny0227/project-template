import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from './http-exception.filter.js';

import 'reflect-metadata';

function run(exception: unknown) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const logger = { error: vi.fn(), warn: vi.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new HttpExceptionFilter(logger as unknown as PinoLogger).catch(exception, host);
  return { json, status, logger };
}
afterEach(() => vi.unstubAllEnvs());
describe('예외 필터', () => {
  it('예외 필터가 표준 에러 형식을 반환', () => {
    const { json, status, logger } = run(new BadRequestException('잘못된 요청'));
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ status: 400, code: 'HTTP_400', message: '잘못된 요청' });
    expect(logger.warn).toHaveBeenCalledOnce();
  });
  it('운영 모드에서 응답에 stack이 없다', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { json, logger } = run(new Error('비밀 내부 정보'));
    expect(json).toHaveBeenCalledWith({
      status: 500,
      code: 'HTTP_500',
      message: 'Internal server error',
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('비밀 내부 정보');
    expect(JSON.stringify(json.mock.calls)).not.toContain('stack');
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.objectContaining({ stack: expect.any(String) }) },
      '요청 처리 실패',
    );
  });
});
