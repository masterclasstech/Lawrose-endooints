/* eslint-disable prettier/prettier */
// src/modules/product/controllers/product.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  //UsePipes,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from '../../products/services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductQueryDto } from '../dto/product-query.dto';

//import { BulkInventoryDto } from '../dto/bulk-inventory.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
// import { UserRole } from '@prisma/client';
import { UserRole } from '../../common/enums/user-role.enum';
import { ThrottlerGuard } from '@nestjs/throttler';


@ApiTags('Products')
@Controller('products')

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiBearerAuth()
  async create(
    @Body(ValidationPipe) dto: CreateProductDto,
    @UploadedFiles() imageFiles?: Express.Multer.File[],
  ) {
    return this.productService.create({
      ...dto,
      imageFile: imageFiles,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get products with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findMany(@Query(ValidationPipe) query: ProductQueryDto) {
    return this.productService.findMany(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  @ApiResponse({ status: 200, description: 'Featured products retrieved successfully' })
  async getFeatured(@Query('limit') limit?: number) {
    return this.productService.getFeatured(limit);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get available product filters' })
  @ApiResponse({ status: 200, description: 'Filters retrieved successfully' })
  async getFilters() {
    return this.productService.getFilters();
  }

  @Get('search/suggestions')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiResponse({ status: 200, description: 'Search suggestions retrieved successfully' })
  async searchSuggestions(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.productService.searchSuggestions(query, limit);
  }

  @Get('inventory/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get inventory statistics' })
  @ApiResponse({ status: 200, description: 'Inventory stats retrieved successfully' })
  @ApiBearerAuth()
  async getInventoryStats() {
    return this.productService.getInventoryStats();
  }

  @Get(':identifier')
  @ApiOperation({ summary: 'Get product by ID or slug' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('identifier') identifier: string) {
    // Check if identifier is UUID (ID) or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    return isUUID 
      ? this.productService.findById(identifier)
      : this.productService.findBySlug(identifier);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products' })
  @ApiResponse({ status: 200, description: 'Related products retrieved successfully' })
  async getRelated(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.productService.getRelated(id, limit);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiBearerAuth()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateProductDto,
    @UploadedFiles() imageFiles?: Express.Multer.File[],
  ) {
    return this.productService.update(id, {
      ...dto,
      imageFile: imageFiles,
    });
  }

  @Put(':id/toggle-featured')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle product featured status' })
  @ApiResponse({ status: 200, description: 'Featured status toggled successfully' })
  @ApiBearerAuth()
  async toggleFeatured(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.toggleFeatured(id);
  }

  @Put(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle product active status' })
  @ApiResponse({ status: 200, description: 'Active status toggled successfully' })
  @ApiBearerAuth()
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.toggleActive(id);
  }

  
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete product with active orders' })
  @ApiBearerAuth()
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.delete(id);
  }
}