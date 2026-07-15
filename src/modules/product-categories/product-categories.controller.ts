import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/product-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PagePermissionGuard } from '../auth/guards/page-permission.guard';
import { RequireAnyPage, RequirePage } from '../auth/decorators/require-page.decorator';
import { OwnerGuard } from '../auth/guards/owner.guard';

@Controller('product-categories')
@UseGuards(JwtAuthGuard, PagePermissionGuard)
export class ProductCategoriesController {
  constructor(private readonly categoriesService: ProductCategoriesService) {}

  @Get()
  @RequireAnyPage('inventory', 'restock', 'sales')
  findManaged(@Req() req: any) {
    return this.categoriesService.findManaged(req.user.shopId);
  }

  @Get('hybrid')
  @RequireAnyPage('inventory', 'restock', 'sales')
  findHybrid(@Req() req: any) {
    return this.categoriesService.getHybridCategories(req.user.shopId);
  }

  @Post()
  @UseGuards(OwnerGuard)
  @RequirePage('inventory')
  create(@Body() dto: CreateProductCategoryDto, @Req() req: any) {
    return this.categoriesService.create(req.user.shopId, dto);
  }

  @Delete(':id')
  @UseGuards(OwnerGuard)
  @RequirePage('inventory')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.categoriesService.remove(id, req.user.shopId);
  }
}
