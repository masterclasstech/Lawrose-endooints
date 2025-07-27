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
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
    ValidationPipe,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
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
import { CollectionService, CollectionWithCounts } from '../services/collection.service';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { UpdateCollectionDto } from '../dto/update-collection.dto';
import { CollectionQueryDto } from '../dto/collection-query.dto';
import { PaginatedResponseDto } from '../../common/dto/response.dto';
//import { AdminGuard } from '../guards/admin.guard';
import { Collection, Season } from '@prisma/client';

@ApiTags('Collections')
@Controller('collections')
export class CollectionController {
    constructor(private readonly collectionService: CollectionService) {}

    @Post()
    @UseInterceptors(FileInterceptor('imageFile'))
    @ApiConsumes('multipart/form-data')
    //@UseGuards(AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Create a new collection',
        description: 'Creates a new collection with automatic slug generation, date validation, and image upload support. Can accept either an image file or imageUrl. Admin access required.'
    })
    @ApiCreatedResponse({
        description: 'Collection created successfully',
        example: {
            id: 'uuid-string',
            name: 'Summer 2024',
            slug: 'summer-2024',
            description: 'Latest summer fashion trends',
            imageUrl: 'https://example.com/summer-2024.jpg',
            year: 2024,
            season: 'SUMMER',
            metaTitle: 'Summer 2024 Collection',
            metaDescription: 'Discover the latest summer fashion trends',
            sortOrder: 1,
            isActive: true,
            isFeatured: false,
            startDate: '2024-06-01T00:00:00Z',
            endDate: '2024-08-31T23:59:59Z',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z'
        }
    })
    @ApiBadRequestResponse({
        description: 'Invalid input data, date range, or image upload failed',
        example: {
            statusCode: 400,
            message: ['Start date must be before end date', 'name should not be empty', 'Image upload failed: Invalid file format'],
            error: 'Bad Request'
        }
    })
    @ApiConflictResponse({
        description: 'Collection with this name or slug already exists',
        example: {
            statusCode: 409,
            message: 'Collection with this name already exists',
            error: 'Conflict'
        }
    })
    @ApiUnauthorizedResponse({ description: 'Authentication required' })
    @ApiForbiddenResponse({ description: 'Admin access required' })
    async create(
        @Body(ValidationPipe) createCollectionDto: CreateCollectionDto,
        @UploadedFile() imageFile?: Express.Multer.File
    ): Promise<Collection> {
        // Validate date range
        if (
            createCollectionDto.startDate &&
            createCollectionDto.endDate &&
            new Date(createCollectionDto.startDate) >= new Date(createCollectionDto.endDate)
        ) {
            throw new BadRequestException('Start date must be before end date');
        }

        return this.collectionService.create(createCollectionDto, imageFile);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all collections with pagination and filtering',
        description: 'Retrieves all collections with advanced filtering, pagination, and optional includes'
    })
    @ApiOkResponse({
        description: 'Collections retrieved successfully',
        example: {
            data: [
                {
                    id: 'uuid-string',
                    name: 'Summer 2024',
                    slug: 'summer-2024',
                    description: 'Latest summer fashion trends',
                    imageUrl: 'https://example.com/summer-2024.jpg',
                    year: 2024,
                    season: 'SUMMER',
                    metaTitle: 'Summer 2024 Collection',
                    metaDescription: 'Discover the latest summer fashion trends',
                    sortOrder: 1,
                    isActive: true,
                    isFeatured: false,
                    startDate: '2024-06-01T00:00:00Z',
                    endDate: '2024-08-31T23:59:59Z',
                    createdAt: '2024-01-15T10:30:00Z',
                    updatedAt: '2024-01-15T10:30:00Z',
                    productCount: 25
                }
            ],
            total: 5,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false
        }
    })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 50)' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in name and description' })
    @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
    @ApiQuery({ name: 'season', required: false, enum: Season, description: 'Filter by season' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
    @ApiQuery({ name: 'isFeatured', required: false, type: Boolean, description: 'Filter by featured status' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'sortOrder', 'createdAt', 'year'], description: 'Sort field (default: sortOrder)' })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort direction (default: desc)' })
    @ApiQuery({ name: 'includeProductCount', required: false, type: Boolean, description: 'Include product counts' })
    async findAll(
        @Query(ValidationPipe) query: CollectionQueryDto
    ): Promise<PaginatedResponseDto<CollectionWithCounts>> {
        return this.collectionService.findAll(query);
    }

    @Get('featured')
    @ApiOperation({
        summary: 'Get featured collections',
        description: 'Retrieves all active featured collections with product counts'
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of collections (default: 10)' })
    @ApiOkResponse({
        description: 'Featured collections retrieved successfully',
        example: [
            {
                id: 'uuid-string',
                name: 'Summer 2024',
                slug: 'summer-2024',
                description: 'Latest summer fashion trends',
                imageUrl: 'https://example.com/summer-2024.jpg',
                year: 2024,
                season: 'SUMMER',
                sortOrder: 1,
                isActive: true,
                isFeatured: true,
                startDate: '2024-06-01T00:00:00Z',
                endDate: '2024-08-31T23:59:59Z',
                metaTitle: 'Summer 2024 Collection',
                metaDescription: 'Discover the latest summer fashion trends',
                createdAt: '2024-01-15T10:30:00Z',
                updatedAt: '2024-01-15T10:30:00Z',
                productCount: 25
            }
        ]
    })
    async getFeaturedCollections(
        @Query('limit') limit?: number
    ): Promise<CollectionWithCounts[]> {
        return this.collectionService.getFeaturedCollections(limit);
    }

    @Get('current')
    @ApiOperation({
        summary: 'Get current active collections',
        description: 'Retrieves collections that are currently active based on date range'
    })
    @ApiOkResponse({
        description: 'Current collections retrieved successfully',
        example: [
            {
                id: 'uuid-string',
                name: 'Summer 2024',
                slug: 'summer-2024',
                description: 'Latest summer fashion trends',
                imageUrl: 'https://example.com/summer-2024.jpg',
                year: 2024,
                season: 'SUMMER',
                sortOrder: 1,
                isActive: true,
                isFeatured: true,
                startDate: '2024-06-01T00:00:00Z',
                endDate: '2024-08-31T23:59:59Z',
                metaTitle: 'Summer 2024 Collection',
                metaDescription: 'Discover the latest summer fashion trends',
                createdAt: '2024-01-15T10:30:00Z',
                updatedAt: '2024-01-15T10:30:00Z',
                productCount: 25
            }
        ]
    })
    async getCurrentCollections(): Promise<CollectionWithCounts[]> {
        return this.collectionService.getCurrentCollections();
    }

    @Get('season/:season')
    @ApiOperation({
        summary: 'Get collections by season',
        description: 'Retrieves all active collections for a specific season, optionally filtered by year'
    })
    @ApiParam({
        name: 'season',
        enum: Season,
        description: 'Season to filter by',
        example: 'SUMMER'
    })
    @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
    @ApiOkResponse({
        description: 'Collections by season retrieved successfully',
        example: [
            {
                id: 'uuid-string',
                name: 'Summer 2024',
                slug: 'summer-2024',
                description: 'Latest summer fashion trends',
                imageUrl: 'https://example.com/summer-2024.jpg',
                year: 2024,
                season: 'SUMMER',
                sortOrder: 1,
                isActive: true,
                isFeatured: true,
                startDate: '2024-06-01T00:00:00Z',
                endDate: '2024-08-31T23:59:59Z',
                metaTitle: 'Summer 2024 Collection',
                metaDescription: 'Discover the latest summer fashion trends',
                createdAt: '2024-01-15T10:30:00Z',
                updatedAt: '2024-01-15T10:30:00Z',
                productCount: 25
            }
        ]
    })
    async findBySeason(
        @Param('season') season: Season,
        @Query('year') year?: number
    ): Promise<CollectionWithCounts[]> {
        return this.collectionService.findBySeason(season, year);
    }

    @Get('statistics')
    @ApiOperation({
        summary: 'Get collection statistics',
        description: 'Retrieves comprehensive statistics about collections'
    })
    @ApiOkResponse({
        description: 'Collection statistics retrieved successfully',
        example: {
            totalCollections: 25,
            activeCollections: 20,
            featuredCollections: 5,
            currentYearCollections: 8,
            totalProducts: 150
        }
    })
    async getStatistics(): Promise<{
        totalCollections: number;
        activeCollections: number;
        featuredCollections: number;
        currentYearCollections: number;
        totalProducts: number;
    }> {
        return this.collectionService.getStatistics();
    }

    @Get('slug/:slug')
    @ApiOperation({
        summary: 'Get collection by slug',
        description: 'Retrieves a specific collection by its slug with product count'
    })
    @ApiParam({
        name: 'slug',
        type: String,
        description: 'Collection slug',
        example: 'summer-2024'
    })
    @ApiOkResponse({
        description: 'Collection found',
        example: {
            id: 'uuid-string',
            name: 'Summer 2024',
            slug: 'summer-2024',
            description: 'Latest summer fashion trends',
            imageUrl: 'https://example.com/summer-2024.jpg',
            year: 2024,
            season: 'SUMMER',
            metaTitle: 'Summer 2024 Collection',
            metaDescription: 'Discover the latest summer fashion trends',
            sortOrder: 1,
            isActive: true,
            isFeatured: false,
            startDate: '2024-06-01T00:00:00Z',
            endDate: '2024-08-31T23:59:59Z',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
            productCount: 25
        }
    })
    @ApiNotFoundResponse({
        description: 'Collection not found',
        example: {
            statusCode: 404,
            message: 'Collection with slug \'summer-2024\' not found',
            error: 'Not Found'
        }
    })
    async findBySlug(
        @Param('slug') slug: string
    ): Promise<CollectionWithCounts> {
        return this.collectionService.findBySlug(slug);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get collection by ID',
        description: 'Retrieves a specific collection by its ID with product count and optional product list'
    })
    @ApiParam({
        name: 'id',
        type: String,
        format: 'uuid',
        description: 'Collection ID',
        example: 'uuid-string'
    })
    @ApiQuery({ name: 'includeProducts', required: false, type: Boolean, description: 'Include products in response' })
    @ApiOkResponse({
        description: 'Collection found',
        example: {
            id: 'uuid-string',
            name: 'Summer 2024',
            slug: 'summer-2024',
            description: 'Latest summer fashion trends',
            imageUrl: 'https://example.com/summer-2024.jpg',
            year: 2024,
            season: 'SUMMER',
            metaTitle: 'Summer 2024 Collection',
            metaDescription: 'Discover the latest summer fashion trends',
            sortOrder: 1,
            isActive: true,
            isFeatured: false,
            startDate: '2024-06-01T00:00:00Z',
            endDate: '2024-08-31T23:59:59Z',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
            productCount: 25
        }
    })
    @ApiNotFoundResponse({
        description: 'Collection not found',
        example: {
            statusCode: 404,
            message: 'Collection with ID uuid-string not found',
            error: 'Not Found'
        }
    })
    @ApiBadRequestResponse({
        description: 'Invalid UUID format',
        example: {
            statusCode: 400,
            message: 'Invalid collection ID',
            error: 'Bad Request'
        }
    })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('includeProducts') includeProducts?: boolean
    ): Promise<CollectionWithCounts> {
        return this.collectionService.findOne(id, includeProducts);
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('imageFile'))
    @ApiConsumes('multipart/form-data')
    //@UseGuards(AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update collection',
        description: 'Updates an existing collection. Slug is auto-generated if name changes. Can accept image file or remove image. Admin access required.'
    })
    @ApiParam({
        name: 'id',
        type: String,
        format: 'uuid',
        description: 'Collection ID to update',
        example: 'uuid-string'
    })
    @ApiOkResponse({
        description: 'Collection updated successfully',
        example: {
            id: 'uuid-string',
            name: 'Updated Summer 2024',
            slug: 'updated-summer-2024',
            description: 'Updated summer fashion trends',
            imageUrl: 'https://example.com/updated-summer-2024.jpg',
            year: 2024,
            season: 'SUMMER',
            metaTitle: 'Updated Summer 2024 Collection',
            metaDescription: 'Discover the updated summer fashion trends',
            sortOrder: 1,
            isActive: true,
            isFeatured: false,
            startDate: '2024-06-01T00:00:00Z',
            endDate: '2024-08-31T23:59:59Z',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T11:30:00Z'
        }
    })
    @ApiBadRequestResponse({
        description: 'Invalid input data, UUID format, or date range',
        example: {
            statusCode: 400,
            message: ['name must be a string', 'Start date must be before end date', 'Image upload failed: Invalid file format'],
            error: 'Bad Request'
        }
    })
    @ApiNotFoundResponse({
        description: 'Collection not found',
        example: {
            statusCode: 404,
            message: 'Collection with ID uuid-string not found',
            error: 'Not Found'
        }
    })
    @ApiConflictResponse({
        description: 'Collection with this name or slug already exists',
        example: {
            statusCode: 409,
            message: 'Collection with this name already exists',
            error: 'Conflict'
        }
    })
    @ApiUnauthorizedResponse({ description: 'Authentication required' })
    @ApiForbiddenResponse({ description: 'Admin access required' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(ValidationPipe) updateCollectionDto: UpdateCollectionDto,
        @UploadedFile() imageFile?: Express.Multer.File
    ): Promise<Collection> {
        // Validate date range
        if (
            updateCollectionDto.startDate &&
            updateCollectionDto.endDate &&
            new Date(updateCollectionDto.startDate) >= new Date(updateCollectionDto.endDate)
        ) {
            throw new BadRequestException('Start date must be before end date');
        }

        // Check for removeImage flag in the DTO
        const removeImage =
            (typeof updateCollectionDto.removeImage === 'string' && updateCollectionDto.removeImage === 'true') ||
            (typeof updateCollectionDto.removeImage === 'boolean' && updateCollectionDto.removeImage === true);
        return this.collectionService.update(id, updateCollectionDto, imageFile, removeImage);
    }

    @Delete(':id')
    //@UseGuards(AdminGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Soft delete collection',
        description: 'Deactivates a collection (soft delete). Cannot delete collections with products. Admin access required.'
    })
    @ApiParam({
        name: 'id',
        type: String,
        format: 'uuid',
        description: 'Collection ID to delete',
        example: 'uuid-string'
    })
    @ApiOkResponse({
        description: 'Collection deactivated successfully',
        example: {
            message: "Collection 'Summer 2024' has been successfully deactivated"
        }
    })
    @ApiBadRequestResponse({
        description: 'Invalid UUID format',
        example: {
            statusCode: 400,
            message: 'Invalid collection ID',
            error: 'Bad Request'
        }
    })
    @ApiNotFoundResponse({
        description: 'Collection not found',
        example: {
            statusCode: 404,
            message: 'Collection with ID uuid-string not found',
            error: 'Not Found'
        }
    })
    @ApiConflictResponse({
        description: 'Collection has products and cannot be deleted',
        example: {
            statusCode: 409,
            message: "Cannot delete collection 'Summer 2024' because it has 25 products",
            error: 'Conflict'
        }
    })
    @ApiUnauthorizedResponse({ description: 'Authentication required' })
    @ApiForbiddenResponse({ description: 'Admin access required' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
        return this.collectionService.remove(id);
    }

    @Delete(':id/hard')
    //@UseGuards(AdminGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Hard delete collection',
        description: 'Permanently deletes a collection from database. Use with caution. Admin access required.'
    })
    @ApiParam({
        name: 'id',
        type: String,
        format: 'uuid',
        description: 'Collection ID to permanently delete',
        example: 'uuid-string'
    })
    @ApiOkResponse({
        description: 'Collection permanently deleted',
        example: {
            message: "Collection 'Summer 2024' has been permanently deleted"
        }
    })
    @ApiNotFoundResponse({
        description: 'Collection not found',
        example: {
            statusCode: 404,
            message: 'Collection with ID uuid-string not found',
            error: 'Not Found'
        }
    })
    @ApiUnauthorizedResponse({ description: 'Authentication required' })
    @ApiForbiddenResponse({ description: 'Admin access required' })
    async hardDelete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
        return this.collectionService.hardDelete(id);
    }

    @Patch('bulk/sort-order')
    //@UseGuards(AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Bulk update collection sort orders',
        description: 'Updates sort order for multiple collections. Admin access required.'
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
        description: 'One or more collections not found',
        example: {
            statusCode: 404,
            message: 'Collections not found: uuid-1, uuid-2',
            error: 'Not Found'
        }
    })
    @ApiUnauthorizedResponse({ description: 'Authentication required' })
    @ApiForbiddenResponse({ description: 'Admin access required' })
    async bulkUpdateSortOrder(
        @Body(ValidationPipe) updates: Array<{ id: string; sortOrder: number }>
    ): Promise<{ updated: number }> {
        return this.collectionService.bulkUpdateSortOrder(updates);
    }

    @Patch(':id/toggle-featured')
    //@UseGuards(AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Toggle collection featured status',
        description: 'Toggles the featured status of a collection. Admin access required.'
    })
    @ApiParam({
        name: 'id',
        type: String,
        format: 'uuid',
        description: 'Collection ID',
        example: 'uuid-string'
    })
    @ApiOkResponse({
        description: 'Featured status toggled successfully',
        example: {
            id: 'uuid-string',
            name: 'Summer 2024',
            slug: 'summer-2024',
            isFeatured: true
        }
    })
    @ApiNotFoundResponse({
        description: 'Collection not found',
        example: {
            statusCode: 404,
            message: 'Collection with ID uuid-string not found',
            error: 'Not Found'
        }
    })
    @ApiUnauthorizedResponse({ description: 'Authentication required' })
    @ApiForbiddenResponse({ description: 'Admin access required' })
    async toggleFeatured(@Param('id', ParseUUIDPipe) id: string): Promise<Collection> {
        return this.collectionService.toggleFeatured(id);
    }

    @Post('archive-expired')
    //@UseGuards(AdminGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Archive expired collections',
        description: 'Automatically archives collections that have passed their end date. Admin access required.'
    })
    @ApiOkResponse({
        description: 'Expired collections archived successfully',
        example: {
            archived: 3
        }
    })
    @ApiUnauthorizedResponse({ description: 'Authentication required' })
    @ApiForbiddenResponse({ description: 'Admin access required' })
    async archiveExpiredCollections(): Promise<{ archived: number }> {
        return this.collectionService.archiveExpiredCollections();
    }
}