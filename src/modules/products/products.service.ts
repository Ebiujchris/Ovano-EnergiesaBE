import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Sale } from '../../entities/sale.entity';
import { PurchaseOrder } from '../../entities/purchase-order.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
  ) {}

  async create(createProductDto: CreateProductDto, shopId: string, userId: string): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      shopId,
      userId,
    });
    return await this.productRepository.save(product);
  }

  async findAll(shopId: string, category?: string): Promise<Product[]> {
    const where: any = { shopId };
    if (category) where.category = category;
    return await this.productRepository.find({
      where,
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  /** Returns distinct category values for this shop (null/empty mapped to 'Uncategorized') */
  async getCategories(shopId: string): Promise<string[]> {
    const rows = await this.productRepository
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.shopId = :shopId', { shopId })
      .getRawMany();

    const cats = rows
      .map((r) => r.category as string | null)
      .filter(Boolean) as string[];

    return cats.sort();
  }

  async findOne(id: string, shopId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, shopId },
    });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    return product;
  }

  async findByBarcode(barcode: string, shopId: string): Promise<Product | null> {
    return await this.productRepository.findOne({ where: { barcode, shopId } });
  }

  async findLowStock(shopId: string): Promise<Product[]> {
    return await this.productRepository
      .createQueryBuilder('product')
      .where('product.shopId = :shopId', { shopId })
      .andWhere('product.stockQuantity <= product.lowStockThreshold')
      .getMany();
  }

  async update(id: string, shopId: string, updateProductDto: UpdateProductDto): Promise<Product> {
    await this.productRepository.update({ id, shopId }, updateProductDto);
    return await this.findOne(id, shopId);
  }

  async updateStock(id: string, shopId: string, quantity: number): Promise<Product> {
    const product = await this.findOne(id, shopId);
    product.stockQuantity -= quantity;
    return await this.productRepository.save(product);
  }

  async remove(id: string, shopId: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id, shopId } });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);

    // Nullify FK on related records to avoid constraint violation
    await this.saleRepository.update({ productId: id }, { productId: null as any });
    await this.purchaseOrderRepository.update({ productId: id }, { productId: null as any });

    await this.productRepository.delete({ id, shopId });
  }
}
