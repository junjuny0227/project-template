import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';

import { AUTH_COOKIE_NAME } from '../config/env.js';
import type { AuthUser } from './auth-user.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        const cookies = req.cookies as Record<string, unknown> | undefined;
        const token = cookies?.[AUTH_COOKIE_NAME];
        return typeof token === 'string' ? token : null;
      },
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  // 서명이 맞아도 payload 모양은 따로 확인한다. AuthUser에 정의한 클레임만 넘긴다.
  validate(payload: Record<string, unknown>): AuthUser {
    if (typeof payload.sub !== 'string' || payload.sub === '') throw new UnauthorizedException();
    return { sub: payload.sub };
  }
}
