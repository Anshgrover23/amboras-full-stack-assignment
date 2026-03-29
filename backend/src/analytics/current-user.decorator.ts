import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt-payload.interface';

export const CurrentStoreId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return req.user.store_id;
  },
);
