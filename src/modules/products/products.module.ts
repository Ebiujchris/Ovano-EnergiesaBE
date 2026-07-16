import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { Sale } from '../../entities/sale.entity';
import { PurchaseOrder } from '../../entities/purchase-order.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PermissionsGuard } from '../auth/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Sale, PurchaseOrder])],
  controllers: [ProductsController],
  providers: [ProductsService, PermissionsGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
