import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthUser } from './auth-user.js';

// JwtAuthGuard를 통과한 요청에서만 쓴다. @Public() 라우트에서는 user가 없다.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<Request>().user as AuthUser,
);
