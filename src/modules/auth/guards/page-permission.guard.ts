import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  hasAnyPageAccess,
  hasPageAccess,
  PageKey,
} from '../../../common/page-permissions';
import {
  REQUIRE_ANY_PAGE_KEY,
  REQUIRE_PAGE_KEY,
} from '../decorators/require-page.decorator';

@Injectable()
export class PagePermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPage = this.reflector.getAllAndOverride<PageKey | undefined>(
      REQUIRE_PAGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAny = this.reflector.getAllAndOverride<PageKey[] | undefined>(
      REQUIRE_ANY_PAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPage && (!requiredAny || requiredAny.length === 0)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.accountType === 'owner') return true;

    if (requiredPage && !hasPageAccess(user, requiredPage)) {
      throw new ForbiddenException('You do not have access to this section');
    }

    if (requiredAny && !hasAnyPageAccess(user, requiredAny)) {
      throw new ForbiddenException('You do not have access to this section');
    }

    return true;
  }
}
