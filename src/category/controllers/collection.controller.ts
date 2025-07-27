/* eslint-disable prettier/prettier */
import {
    Controller,
    Post,
    HttpCode,
    HttpStatus,
    ValidationPipe,
    Body,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse
} from '@nestjs/swagger';
import { CollectionService } from '../services/collection.service';
import { CreateCollectionDto } from '../dto/create-collection.dto';

//import { AdminGuard } from '../guards/admin.guard';
import { Collection } from '@prisma/client';

@ApiTags('Collections')
@Controller('collections')
export class CollectionController {
    constructor(private readonly collectionService: CollectionService) {}

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
    @Post()
  //@UseGuards(AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Create a new collection',
        description: 'Creates a new collection with automatic slug generation and date validation. Admin access required.'
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
        description: 'Invalid input data or date range',
        example: {
            statusCode: 400,
            message: ['Start date must be before end date', 'name should not be empty'],
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
        @Body(ValidationPipe) createCollectionDto: CreateCollectionDto
    ): Promise<Collection> {
      // Validate date range
        if (
            createCollectionDto.startDate &&
            createCollectionDto.endDate &&
            new Date(createCollectionDto.startDate) >= new Date(createCollectionDto.endDate)
        ) {
            throw new BadRequestException(['Start date must be before end date']);
        }

      // Generate slug if not provided
        if (!createCollectionDto.slug && createCollectionDto.name) {
            createCollectionDto.slug = createCollectionDto.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9\-]/g, '');
        }

      // Call service to create collection
        return await this.collectionService.create(createCollectionDto);
    }
}

