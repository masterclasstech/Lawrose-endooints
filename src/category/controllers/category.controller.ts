/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  //UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  //ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConsumes
} from '@nestjs/swagger';
import { CategoryService, CategoryWithCounts } from '../services/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryQueryDto } from '../dto/category-query.dto';
import { PaginatedResponseDto } from '../../common/dto/response.dto';
//import { AdminGuard } from '../../common/decorator/admin-only.decorator';
import { Category } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('imageFile'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new category',
    description: 'Creates a new category with automatic slug generation. Can accept either an image file or imageUrl.'
  })
  @ApiCreatedResponse({
    description: 'Category created successfully',
    type: CreateCategoryDto
  })
  async create(
    @Body(ValidationPipe) createCategoryDto: CreateCategoryDto,
    @UploadedFile() imageFile?: Express.Multer.File
  ): Promise<Category> {
    return this.categoryService.create(createCategoryDto, imageFile);
  }

  
  @Get()
  @ApiOperation({
    summary: 'Get all categories with pagination and filtering',
    description: 'Retrieves all categories with advanced filtering, pagination, and optional includes'
  })
  @ApiOkResponse({
    description: 'Categories retrieved successfully',
    example: {
      data: [
        {
          id: 'uuid-string',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices and accessories',
          imageUrl: 'https://example.com/electronics.jpg',
          metaTitle: 'Electronics - Shop Now',
          metaDescription: 'Browse our wide selection of electronic devices',
          sortOrder: 1,
          isActive: true,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          subcategoryCount: 5,
          productCount: 120
        }
      ],
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false
    }
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 50)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in name and description' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'sortOrder', 'createdAt'], description: 'Sort field (default: sortOrder)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' })
  @ApiQuery({ name: 'includeSubcategories', required: false, type: Boolean, description: 'Include subcategories data' })
  @ApiQuery({ name: 'includeProductCount', required: false, type: Boolean, description: 'Include product and subcategory counts' })
  async findAll(
    @Query(ValidationPipe) query: CategoryQueryDto
  ): Promise<PaginatedResponseDto<CategoryWithCounts>> {
    return this.categoryService.findAll(query);
  }

  @Get('statistics')
  //@UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get category statistics',
    description: 'Retrieves comprehensive statistics about categories, subcategories, and products. Admin access required.'
  })
  @ApiOkResponse({
    description: 'Statistics retrieved successfully',
    example: {
      totalCategories: 25,
      activeCategories: 22,
      totalSubcategories: 87,
      totalProducts: 1250
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async getStatistics(): Promise<{
    totalCategories: number;
    activeCategories: number;
    totalSubcategories: number;
    totalProducts: number;
  }> {
    return this.categoryService.getStatistics();
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get category by slug',
    description: 'Retrieves a category by its slug with subcategories and product counts'
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'Category slug',
    example: 'electronics'
  })
  @ApiOkResponse({
    description: 'Category found',
    example: {
      id: 'uuid-string',
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      imageUrl: 'https://example.com/electronics.jpg',
      metaTitle: 'Electronics - Shop Now',
      metaDescription: 'Browse our wide selection of electronic devices',
      sortOrder: 1,
      isActive: true,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      subcategories: [
        {
          id: 'uuid-string',
          name: 'Smartphones',
          slug: 'smartphones',
          description: 'Mobile phones and accessories',
          imageUrl: 'https://example.com/smartphones.jpg',
          sortOrder: 1,
          isActive: true
        }
      ],
      subcategoryCount: 5,
      productCount: 120
    }
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
    example: {
      statusCode: 404,
      message: "Category with slug 'invalid-slug' not found",
      error: 'Not Found'
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid slug format',
    example: {
      statusCode: 400,
      message: 'Invalid category slug',
      error: 'Bad Request'
    }
  })
  async findBySlug(@Param('slug') slug: string): Promise<CategoryWithCounts> {
    return this.categoryService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Retrieves a specific category by its ID with optional relations'
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Category ID',
    example: 'uuid-string'
  })
  @ApiQuery({
    name: 'includeRelations',
    required: false,
    type: Boolean,
    description: 'Include subcategories and counts (default: false)'
  })
  @ApiOkResponse({
    description: 'Category found',
    example: {
      id: 'uuid-string',
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      imageUrl: 'https://example.com/electronics.jpg',
      metaTitle: 'Electronics - Shop Now',
      metaDescription: 'Browse our wide selection of electronic devices',
      sortOrder: 1,
      isActive: true,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    }
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
    example: {
      statusCode: 404,
      message: 'Category with ID uuid-string not found',
      error: 'Not Found'
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID format',
    example: {
      statusCode: 400,
      message: 'Invalid category ID',
      error: 'Bad Request'
    }
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeRelations') includeRelations?: boolean
  ): Promise<CategoryWithCounts> {
    return this.categoryService.findOne(id, includeRelations);
  }

  @Patch(':id')
  //@UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update category',
    description: 'Updates an existing category. Slug is auto-generated if name changes. Admin access required.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Category ID to update',
    example: 'uuid-string'
  })
  @ApiOkResponse({
    description: 'Category updated successfully',
    example: {
      id: 'uuid-string',
      name: 'Updated Electronics',
      slug: 'updated-electronics',
      description: 'Updated electronic devices and accessories',
      imageUrl: 'https://example.com/updated-electronics.jpg',
      metaTitle: 'Updated Electronics - Shop Now',
      metaDescription: 'Browse our updated selection of electronic devices',
      sortOrder: 1,
      isActive: true,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T11:30:00Z'
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or UUID format',
    example: {
      statusCode: 400,
      message: ['name must be a string'],
      error: 'Bad Request'
    }
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
    example: {
      statusCode: 404,
      message: 'Category with ID uuid-string not found',
      error: 'Not Found'
    }
  })
  @ApiConflictResponse({
    description: 'Category with this name or slug already exists',
    example: {
      statusCode: 409,
      message: 'Category with this name already exists',
      error: 'Conflict'
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateCategoryDto: UpdateCategoryDto
  ): Promise<Category> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  //@UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete category',
    description: 'Deactivates a category (soft delete). Cannot delete categories with subcategories or products. Admin access required.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Category ID to delete',
    example: 'uuid-string'
  })
  @ApiOkResponse({
    description: 'Category deactivated successfully',
    example: {
      message: "Category 'Electronics' has been successfully deactivated"
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID format',
    example: {
      statusCode: 400,
      message: 'Invalid category ID',
      error: 'Bad Request'
    }
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
    example: {
      statusCode: 404,
      message: 'Category with ID uuid-string not found',
      error: 'Not Found'
    }
  })
  @ApiConflictResponse({
    description: 'Category has dependencies and cannot be deleted',
    example: {
      statusCode: 409,
      message: "Cannot delete category 'Electronics' because it has 5 subcategories",
      error: 'Conflict'
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.categoryService.remove(id);
  }

  @Delete(':id/hard')
  //@UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hard delete category',
    description: 'Permanently deletes a category from the database. Use with extreme caution. Admin access required.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Category ID to permanently delete',
    example: 'uuid-string'
  })
  @ApiOkResponse({
    description: 'Category permanently deleted',
    example: {
      message: "Category 'Electronics' has been permanently deleted"
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID format',
    example: {
      statusCode: 400,
      message: 'Invalid category ID',
      error: 'Bad Request'
    }
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
    example: {
      statusCode: 404,
      message: 'Category with ID uuid-string not found',
      error: 'Not Found'
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async hardDelete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.categoryService.hardDelete(id);
  }

  @Patch('bulk/sort-order')
  //@UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk update category sort orders',
    description: 'Updates sort order for multiple categories in a single operation. Admin access required.'
  })
  @ApiOkResponse({
    description: 'Sort orders updated successfully',
    example: {
      updated: 5
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    example: {
      statusCode: 400,
      message: 'Updates array cannot be empty',
      error: 'Bad Request'
    }
  })
  @ApiNotFoundResponse({
    description: 'One or more categories not found',
    example: {
      statusCode: 404,
      message: 'Categories not found: uuid-1, uuid-2',
      error: 'Not Found'
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async bulkUpdateSortOrder(
    @Body(ValidationPipe) updates: Array<{ id: string; sortOrder: number }>
  ): Promise<{ updated: number }> {
    return this.categoryService.bulkUpdateSortOrder(updates);
  }
}