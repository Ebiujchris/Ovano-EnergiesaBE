import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale, SaleStatus } from '../../entities/sale.entity';
import { Credit } from '../../entities/credit.entity';
import { ProductsService } from '../products/products.service';
import { CreateSaleDto, UpdateSaleDto, VoidSaleDto } from './dto/sale.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Credit)
    private creditRepository: Repository<Credit>,
    private productsService: ProductsService,
    private usersService: UsersService,
  ) {}

  async create(createSaleDto: CreateSaleDto, shopId: string): Promise<Sale> {
    const product = await this.productsService.findOne(createSaleDto.productId, shopId);
    
    if (product.stockQuantity < createSaleDto.quantity) {
      throw new BadRequestException('Insufficient stock quantity');
    }

    const totalAmount = createSaleDto.unitPrice * createSaleDto.quantity;
    
    // If userId is not provided or is invalid (e.g., staff ID), find the shop owner
    let finalUserId = createSaleDto.userId;
    if (finalUserId) {
      // Check if the userId exists in the users table
      try {
        await this.usersService.findOne(finalUserId);
      } catch {
        // Invalid userId (likely a staff ID), use shop owner instead
        finalUserId = undefined;
      }
    }
    
    if (!finalUserId) {
      try {
        const owner = await this.usersService.findByShopId(shopId);
        finalUserId = owner?.id;
      } catch {
        // If no owner found, leave userId empty (will be handled by nullable column in future)
      }
    }
    
    const sale = this.saleRepository.create({
      ...createSaleDto,
      userId: finalUserId,
      totalAmount,
      shopId,
    });

    const savedSale = await this.saleRepository.save(sale);
    
    await this.productsService.updateStock(createSaleDto.productId, shopId, createSaleDto.quantity);
    
    // If payment type is credit, create a credit record
    if (createSaleDto.paymentType === 'credit' && createSaleDto.customerName) {
      const credit = this.creditRepository.create({
        customerName: createSaleDto.customerName,
        customerPhone: createSaleDto.customerPhone,
        totalAmount: totalAmount,
        amountPaid: 0,
        description: `Credit sale for ${product.name} (Qty: ${createSaleDto.quantity})`,
        status: 'pending' as any,
        shopId: shopId,
        userId: finalUserId,
      });
      
      await this.creditRepository.save(credit);
    }
    
    return await this.findOne(savedSale.id, shopId);
  }

  async findAll(shopId: string): Promise<Sale[]> {
    return await this.saleRepository.find({
      where: { shopId },
      relations: ['shop', 'user', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findStaffSales(shopId: string, staffId: string, startDate: Date, endDate: Date): Promise<Sale[]> {
    return await this.saleRepository.find({
      where: {
        shopId,
        createdByStaffId: staffId,
        createdAt: Between(startDate, endDate),
      },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, shopId: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id, shopId },
      relations: ['shop', 'user', 'product'],
    });
    
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    
    return sale;
  }

  async findByDateRange(shopId: string, startDate: Date, endDate: Date): Promise<Sale[]> {
    return await this.saleRepository.find({
      where: { shopId, createdAt: Between(startDate, endDate) },
      relations: ['product'],
      select: {
        id: true, quantity: true, unitPrice: true, totalAmount: true,
        paymentType: true, customerName: true, status: true, createdAt: true,
        shopId: true, productId: true,
        product: { id: true, name: true, buyingPrice: true, sellingPrice: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getTodaysSales(shopId: string): Promise<Sale[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return await this.findByDateRange(shopId, startOfDay, endOfDay);
  }

  async getSalesStats(shopId: string, startDate: Date, endDate: Date) {
    const sales = await this.findByDateRange(shopId, startDate, endDate);
    
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalProfit = sales.reduce((sum, sale) => {
      const buyingPrice = sale.product?.buyingPrice || 0;
      const profit = (Number(sale.unitPrice) - Number(buyingPrice)) * Number(sale.quantity);
      return sum + profit;
    }, 0);
    const totalTransactions = sales.length;
    
    const cashSales = sales.filter(sale => sale.paymentType === 'cash')
      .reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    
    const creditSales = sales.filter(sale => sale.paymentType === 'credit')
      .reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

    return {
      totalSales,
      totalProfit,
      totalTransactions,
      cashSales,
      creditSales,
      profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
    };
  }

  async update(id: string, shopId: string, updateSaleDto: UpdateSaleDto): Promise<Sale> {
    await this.saleRepository.update({ id, shopId }, updateSaleDto);
    return await this.findOne(id, shopId);
  }

  async remove(id: string, shopId: string): Promise<void> {
    const result = await this.saleRepository.delete({ id, shopId });
    if (result.affected === 0) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
  }

  async removeAll(shopId: string): Promise<{ deleted: number }> {
    const result = await this.saleRepository.delete({ shopId });
    return { deleted: result.affected ?? 0 };
  }

  async voidSale(id: string, shopId: string, userId: string, voidSaleDto: VoidSaleDto): Promise<Sale> {
    const sale = await this.findOne(id, shopId);
    
    if (sale.status === SaleStatus.VOIDED) {
      throw new BadRequestException('Sale is already voided');
    }

    // Restore stock
    const product = await this.productsService.findOne(sale.productId, shopId);
    await this.productsService.updateStock(
      sale.productId,
      shopId,
      -sale.quantity // Negative to add back to stock
    );

    // Update sale status
    sale.status = SaleStatus.VOIDED;
    sale.voidReason = voidSaleDto.reason;
    sale.voidedBy = userId;
    sale.voidedAt = new Date();
    if (voidSaleDto.notes) {
      sale.notes = voidSaleDto.notes;
    }

    return await this.saleRepository.save(sale);
  }
}