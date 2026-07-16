import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../../entities/sale.entity';
import { Product } from '../../entities/product.entity';
import { Credit } from '../../entities/credit.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { ProductsModule } from '../products/products.module';
import { PermissionsGuard } from '../auth/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Product, Credit]), ProductsModule],
  controllers: [SalesController],
  providers: [SalesService, PermissionsGuard],
  exports: [SalesService],
})
export class SalesModule {}