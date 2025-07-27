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
import { FileInterceptor } from '@nestjs/platform-express';
import { SubcategoryService, SubcategoryWithCounts } from '../services/subcategory.service';
import { CreateSubcategoryDto } from '../dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from '../dto/update-subcategory.dto';
import { SubcategoryQueryDto } from '../dto/subcategory-query.dto';
import { PaginatedResponseDto } from '../../common/dto/response.dto';
//import { AdminGuard } from '../guards/admin.guard';
import { Subcategory } from '@prisma/client';

@ApiTags('Subcategories')
@Controller('subcategories')
export class SubcategoryController {
  constructor(private readonly subcategoryService: SubcategoryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('imageFile'))
  @ApiConsumes('multipart/form-data')
  //@UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new subcategory',
    description: 'Creates a new subcategory within a category with automatic slug generation. Can accept either an image file or imageUrl. Admin access required.'
  })
  @ApiCreatedResponse({
    description: 'Subcategory created successfully',
    example: {
      id: 'uuid-string',
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Mobile phones and accessories',
      imageUrl: 'https://example.com/smartphones.jpg',
      metaTitle: 'Smartphones - Mobile Devices',
      metaDescription: 'Browse our collection of smartphones',
      sortOrder: 1,
      isActive: true,
      categoryId: 'category-uuid',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or image upload failed',
    example: {
      statusCode: 400,
      message: ['name should not be empty', 'categoryId must be a UUID', 'Image upload failed: Invalid file format'],
      error: 'Bad Request'
    }
  })
  @ApiNotFoundResponse({
    description: 'Parent category not found',
    example: {
      statusCode: 404,
      message: 'Category with ID category-uuid not found or inactive',
      error: 'Not Found'
    }
  })
  @ApiConflictResponse({
    description: 'Subcategory with this name or slug already exists in this category',
    example: {
      statusCode: 409,
      message: 'Subcategory with this name already exists in this category',
      error: 'Conflict'
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async create(
    @Body(ValidationPipe) createSubcategoryDto: CreateSubcategoryDto,
    @UploadedFile() imageFile?: Express.Multer.File
  ): Promise<Subcategory> {
    return this.subcategoryService.create(createSubcategoryDto, imageFile);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all subcategories with pagination and filtering',
    description: 'Retrieves all subcategories with advanced filtering, pagination, and optional includes'
  })
  @ApiOkResponse({
    description: 'Subcategories retrieved successfully',
    example: {
      data: [
        {
          id: 'uuid-string',
          name: 'Smartphones',
          slug: 'smartphones',
          description: 'Mobile phones and accessories',
          imageUrl: 'https://example.com/smartphones.jpg',
          metaTitle: 'Smartphones - Mobile Devices',
          metaDescription: 'Browse our collection of smartphones',
          sortOrder: 1,
          isActive: true,
          categoryId: 'category-uuid',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          category: {
            id: 'category-uuid',
            name: 'Electronics',
            slug: 'electronics'
          },
          productCount: 45
        }
      ],
      total: 15,
      page: 1,
      limit: 10,
      totalPages: 2,
      hasNextPage: true,
      hasPrevPage: false
    }
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 50)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in name and description' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category ID' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'sortOrder', 'createdAt'], description: 'Sort field (default: sortOrder)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' })
  @ApiQuery({ name: 'includeProductCount', required: false, type: Boolean, description: 'Include product counts' })
  async findAll(
    @Query(ValidationPipe) query: SubcategoryQueryDto
  ): Promise<PaginatedResponseDto<SubcategoryWithCounts>> {
    return this.subcategoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get subcategory by ID',
    description: 'Retrieves a specific subcategory by its ID with category info and product count'
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Subcategory ID',
    example: 'uuid-string'
  })
  @ApiOkResponse({
    description: 'Subcategory found',
    example: {
      id: 'uuid-string',
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Mobile phones and accessories',
      imageUrl: 'https://example.com/smartphones.jpg',
      metaTitle: 'Smartphones - Mobile Devices',
      metaDescription: 'Browse our collection of smartphones',
      sortOrder: 1,
      isActive: true,
      categoryId: 'category-uuid',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      category: {
        id: 'category-uuid',
        name: 'Electronics',
        slug: 'electronics'
      },
      productCount: 45
    }
  })
  @ApiNotFoundResponse({
    description: 'Subcategory not found',
    example: {
      statusCode: 404,
      message: 'Subcategory with ID uuid-string not found',
      error: 'Not Found'
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID format',
    example: {
      statusCode: 400,
      message: 'Invalid subcategory ID',
      error: 'Bad Request'
    }
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<SubcategoryWithCounts> {
    return this.subcategoryService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('imageFile'))
  @ApiConsumes('multipart/form-data')
  //@UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update subcategory',
    description: 'Updates an existing subcategory. Slug is auto-generated if name changes. Can accept image file or remove image. Admin access required.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Subcategory ID to update',
    example: 'uuid-string'
  })
  @ApiOkResponse({
    description: 'Subcategory updated successfully',
    example: {
      id: 'uuid-string',
      name: 'Updated Smartphones',
      slug: 'updated-smartphones',
      description: 'Updated mobile phones and accessories',
      imageUrl: 'https://example.com/updated-smartphones.jpg',
      metaTitle: 'Updated Smartphones - Mobile Devices',
      metaDescription: 'Browse our updated collection of smartphones',
      sortOrder: 1,
      isActive: true,
      categoryId: 'category-uuid',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T11:30:00Z'
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or UUID format',
    example: {
      statusCode: 400,
      message: ['name must be a string', 'Image upload failed: Invalid file format'],
      error: 'Bad Request'
    }
  })
  @ApiNotFoundResponse({
    description: 'Subcategory not found',
    example: {
      statusCode: 404,
      message: 'Subcategory with ID uuid-string not found',
      error: 'Not Found'
    }
  })
  @ApiConflictResponse({
    description: 'Subcategory with this name or slug already exists in this category',
    example: {
      statusCode: 409,
      message: 'Subcategory with this name already exists in this category',
      error: 'Conflict'
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateSubcategoryDto: UpdateSubcategoryDto,
    @UploadedFile() imageFile?: Express.Multer.File
  ): Promise<Subcategory> {
    // Check for removeImage flag in the DTO
    const removeImage =
      (typeof updateSubcategoryDto.removeImage === 'string' && updateSubcategoryDto.removeImage === 'true') ||
      (typeof updateSubcategoryDto.removeImage === 'boolean' && updateSubcategoryDto.removeImage === true);
    return this.subcategoryService.update(id, updateSubcategoryDto, imageFile, removeImage);
  }

  @Delete(':id')
  //@UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete subcategory',
    description: 'Deactivates a subcategory (soft delete). Cannot delete subcategories with products. Admin access required.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Subcategory ID to delete',
    example: 'uuid-string'
  })
  @ApiOkResponse({
    description: 'Subcategory deactivated successfully',
    example: {
      message: "Subcategory 'Smartphones' has been successfully deactivated"
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID format',
    example: {
      statusCode: 400,
      message: 'Invalid subcategory ID',
      error: 'Bad Request'
    }
  })
  @ApiNotFoundResponse({
    description: 'Subcategory not found',
    example: {
      statusCode: 404,
      message: 'Subcategory with ID uuid-string not found',
      error: 'Not Found'
    }
  })
  @ApiConflictResponse({
    description: 'Subcategory has products and cannot be deleted',
    example: {
      statusCode: 409,
      message: "Cannot delete subcategory 'Smartphones' because it has 45 products",
      error: 'Conflict'
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.subcategoryService.remove(id);
  }

  @Patch('bulk/sort-order/:categoryId')
  //@UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk update subcategory sort orders within a category',
    description: 'Updates sort order for multiple subcategories within a specific category. Admin access required.'
  })
  @ApiParam({
    name: 'categoryId',
    type: String,
    format: 'uuid',
    description: 'Category ID containing the subcategories',
    example: 'category-uuid'
  })
  @ApiOkResponse({
    description: 'Sort orders updated successfully',
    example: {
      updated: 3
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    example: {
      statusCode: 400,
      message: 'Category ID and updates array are required',
      error: 'Bad Request'
    }
  })
  @ApiNotFoundResponse({
    description: 'Category not found or invalid subcategory IDs',
    example: {
      statusCode: 404,
      message: 'Category with ID category-uuid not found',
      error: 'Not Found'
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async bulkUpdateSortOrder(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body(ValidationPipe) updates: Array<{ id: string; sortOrder: number }>
  ): Promise<{ updated: number }> {
    return this.subcategoryService.bulkUpdateSortOrder(categoryId, updates);
  }
}

@ApiTags('Categories - Subcategories')
@Controller('api/categories')
export class CategorySubcategoryController {
  constructor(private readonly subcategoryService: SubcategoryService) {}

  @Get(':categoryId/subcategories')
  @ApiOperation({
    summary: 'Get subcategories by category ID',
    description: 'Retrieves all active subcategories for a specific category with product counts'
  })
  @ApiParam({
    name: 'categoryId',
    type: String,
    format: 'uuid',
    description: 'Category ID',
    example: 'category-uuid'
  })
  @ApiOkResponse({
    description: 'Subcategories retrieved successfully',
    example: [
      {
        id: 'uuid-string',
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Mobile phones and accessories',
        imageUrl: 'https://example.com/smartphones.jpg',
        metaTitle: 'Smartphones - Mobile Devices',
        metaDescription: 'Browse our collection of smartphones',
        sortOrder: 1,
        isActive: true,
        categoryId: 'category-uuid',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        productCount: 45
      },
      {
        id: 'uuid-string-2',
        name: 'Laptops',
        slug: 'laptops',
        description: 'Portable computers',
        imageUrl: 'https://example.com/laptops.jpg',
        metaTitle: 'Laptops - Computers',
        metaDescription: 'Browse our collection of laptops',
        sortOrder: 2,
        isActive: true,
        categoryId: 'category-uuid',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        productCount: 32
      }
    ]
  })
  @ApiNotFoundResponse({
    description: 'Category not found or inactive',
    example: {
      statusCode: 404,
      message: 'Category with ID category-uuid not found or inactive',
      error: 'Not Found'
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid category ID format',
    example: {
      statusCode: 400,
      message: 'Invalid category ID',
      error: 'Bad Request'
    }
  })
  async findSubcategoriesByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string
  ): Promise<SubcategoryWithCounts[]> {
    return this.subcategoryService.findByCategory(categoryId);
  }
}