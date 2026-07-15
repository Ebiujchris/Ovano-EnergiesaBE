import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from '../../entities/product-category.entity';
import { Product } from '../../entities/product.entity';
import { CreateProductCategoryDto } from './dto/product-category.dto';

const DEFAULT_CATEGORIES = [
  'Solar Panels',
  'Inverters & Batteries',
  'Phones',
  'Computers',
  'Accessories',
  'Cables & Wiring',
];

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private categoryRepository: Repository<ProductCategory>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async ensureDefaults(shopId: string): Promise<void> {
    const count = await this.categoryRepository.count({ where: { shopId } });
    if (count > 0) return;

    const categories = DEFAULT_CATEGORIES.map((name) =>
      this.categoryRepository.create({ name, shopId, isDefault: true }),
    );
    await this.categoryRepository.save(categories);
  }

  async findManaged(shopId: string): Promise<ProductCategory[]> {
    await this.ensureDefaults(shopId);
    return this.categoryRepository.find({
      where: { shopId },
      order: { name: 'ASC' },
    });
  }

  async create(
    shopId: string,
    dto: CreateProductCategoryDto,
  ): Promise<ProductCategory> {
    const existing = await this.categoryRepository.findOne({
      where: { shopId, name: dto.name.trim() },
    });
    if (existing) return existing;

    const category = this.categoryRepository.create({
      name: dto.name.trim(),
      shopId,
      isDefault: false,
    });
    return this.categoryRepository.save(category);
  }

  async remove(id: string, shopId: string): Promise<{ message: string }> {
    const result = await this.categoryRepository.delete({ id, shopId });
    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }
    return { message: 'Category removed' };
  }

  /** Hybrid list: managed categories + custom names used on products */
  async getHybridCategories(shopId: string): Promise<{
    managed: ProductCategory[];
    custom: string[];
    all: string[];
  }> {
    const managed = await this.findManaged(shopId);
    const managedNames = new Set(managed.map((c) => c.name));

    const productRows = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.shopId = :shopId', { shopId })
      .andWhere('product.category IS NOT NULL')
      .andWhere("product.category != ''")
      .getRawMany<{ category: string }>();

    const custom = productRows
      .map((row) => row.category)
      .filter((name) => !managedNames.has(name))
      .sort((a, b) => a.localeCompare(b));

    const all = [...managed.map((c) => c.name), ...custom].sort((a, b) =>
      a.localeCompare(b),
    );

    return { managed, custom, all };
  }
}
