import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request>().user,
);
