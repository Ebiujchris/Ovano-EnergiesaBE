import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { StaffService } from '../staff/staff.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly staffService: StaffService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    // Staff — fetch live permissions from DB
    if (payload.type === 'staff') {
      try {
        const staff = await this.staffService.findByPhone(payload.phone);
        if (!staff || staff.status !== 'active') {
          throw new UnauthorizedException('Staff account is inactive or not found');
        }
        return {
          id: staff.id,
          userId: staff.id,
          shopId: staff.shopId,
          phone: staff.phone,
          accountType: 'staff' as const,
          role: staff.role,
          permissions: {
            canViewDashboard:   staff.canViewDashboard   ?? true,
            canMakeSales:       staff.canMakeSales       ?? true,
            canAccessInventory: staff.canAccessInventory ?? false,
            canApproveCredits:  staff.canApproveCredits  ?? false,
            canManageExpenses:  staff.canManageExpenses  ?? false,
            canViewReports:     staff.canViewReports     ?? false,
            pagePermissions:    {},
          },
        };
      } catch (e: any) {
        throw new UnauthorizedException(e?.message || 'Staff validation failed');
      }
    }

    // Owner — trust the JWT payload directly, no DB lookup
    // This avoids NotFoundException crashing the guard
    if (!payload.sub || !payload.shopId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      userId: payload.sub,
      shopId: payload.shopId,
      phone: payload.phone,
      name: payload.name,
      accountType: 'owner' as const,
      role: 'owner',
      permissions: {
        canViewDashboard:   true,
        canMakeSales:       true,
        canAccessInventory: true,
        canApproveCredits:  true,
        canManageExpenses:  true,
        canViewReports:     true,
        pagePermissions:    {},
      },
    };
  }
}
