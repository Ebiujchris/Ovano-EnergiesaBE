import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSION_KEY = 'permission';

/** Decorator — attach to a controller or route handler */
export function RequirePermission(permission: string): MethodDecorator & ClassDecorator {
  return (target: any, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSION_KEY, permission, descriptor.value);
    } else {
      Reflect.defineMetadata(PERMISSION_KEY, permission, target);
    }
    return descriptor ?? target;
  };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string>(PERMISSION_KEY, context.getHandler())
      ?? this.reflector.get<string>(PERMISSION_KEY, context.getClass());

    if (!required) return true; // No permission required

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Not authenticated');

    // Owners bypass all permission checks
    if (user.accountType === 'owner' || user.role === 'owner') return true;

    // Check named permission on staff
    const perms = user.permissions ?? {};
    if (required === 'ownerOnly') {
      throw new ForbiddenException('Only the shop owner can perform this action');
    }

    if (perms[required] === true) return true;

    throw new ForbiddenException(`You don't have permission: ${required}`);
  }
}
