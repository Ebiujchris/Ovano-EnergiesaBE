import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    // Staff — always fetch live permissions from DB so changes apply immediately
    if (payload.type === 'staff') {
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
    }

    // Owner token — verify user still exists and is active
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or inactive user session');
    }

    return {
      id: user.id,
      userId: user.id,
      shopId: user.shopId,
      phone: user.phone,
      name: user.name,
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
