import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';

import { AUTH_COOKIE_NAME } from '../config/env.js';
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
  validate(payload: Record<string, unknown>) {
    return payload;
  }
}
