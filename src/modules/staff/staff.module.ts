import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from '../../entities/staff.entity';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { PermissionsGuard } from '../auth/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Staff])],
  controllers: [StaffController],
  providers: [StaffService, PermissionsGuard],
  exports: [StaffService],
})
export class StaffModule {}
