import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../../entities/staff.entity';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
  ) {}

  async create(createStaffDto: CreateStaffDto & { shopId: string }): Promise<Staff> {
    const staffData = { ...createStaffDto };
    if (staffData.password) {
      staffData.password = await bcrypt.hash(staffData.password, 10);
    }
    const staff = this.staffRepository.create(staffData);
    return this.staffRepository.save(staff);
  }

  async findByPhone(phone: string): Promise<Staff | null> {
    return this.staffRepository.findOne({ where: { phone } });
  }

  async findAll(shopId: string): Promise<Staff[]> {
    return this.staffRepository.find({ where: { shopId } });
  }

  async findOne(id: string, shopId: string): Promise<Staff> {
    const staff = await this.staffRepository.findOne({ where: { id, shopId } });
    if (!staff) {
      throw new Error('Staff member not found');
    }
    return staff;
  }

  async update(id: string, shopId: string, updateStaffDto: UpdateStaffDto): Promise<Staff> {
    await this.staffRepository.update({ id, shopId }, updateStaffDto);
    return this.findOne(id, shopId);
  }

  async remove(id: string, shopId: string): Promise<{ message: string }> {
    const result = await this.staffRepository.delete({ id, shopId });
    if (result.affected === 0) {
      throw new Error('Staff member not found');
    }
    return { message: 'Staff member removed successfully' };
  }
}
