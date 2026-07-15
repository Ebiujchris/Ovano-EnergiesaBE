import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    // Staff tokens carry all permission data in the payload — trust it
    if (payload.type === 'staff') {
      return {
        id: payload.sub,
        userId: payload.sub,
        shopId: payload.shopId,
        phone: payload.phone,
        accountType: 'staff',
        role: payload.role,
        permissions: payload.permissions ?? {
          canAccessInventory: false,
          canApproveCredits: false,
          canViewReports: false,
          pagePermissions: {},
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
      accountType: 'owner',
      role: 'owner',
      permissions: {
        canAccessInventory: true,
        canApproveCredits: true,
        canViewReports: true,
        pagePermissions: {},
      },
    };
  }
}
