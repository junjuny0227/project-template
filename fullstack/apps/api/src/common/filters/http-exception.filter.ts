import type { ExceptionFilter } from '@nestjs/common';
import { ArgumentsHost, Catch, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import type { NodeEnv } from '../../config/env.js';
@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly production: boolean;

  constructor(
    private readonly logger: PinoLogger,
    config: ConfigService,
  ) {
    this.production = config.getOrThrow<NodeEnv>('NODE_ENV') === 'production';
  }
  catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const err = exception instanceof Error ? exception : new Error('알 수 없는 예외');
    if (status >= 500) this.logger.error({ err }, '요청 처리 실패');
    else this.logger.warn({ status }, '요청 거부');
    const detail =
      typeof body === 'object' && body !== null && 'message' in body ? body.message : body;
    const message =
      status >= 500 && this.production
        ? 'Internal server error'
        : Array.isArray(detail)
          ? detail.join(', ')
          : typeof detail === 'string'
            ? detail
            : status >= 500
              ? 'Internal server error'
              : err.message;
    // health 상태는 클라이언트가 장애 원인을 확인할 수 있게 보존한다.
    const health =
      status === 503 && typeof body === 'object' && body !== null && 'details' in body ? body : {};
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ ...health, status, code: `HTTP_${status}`, message });
  }
}
