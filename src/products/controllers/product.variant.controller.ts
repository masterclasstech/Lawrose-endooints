/* eslint-disable prettier/prettier */
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    //HttpStatus,
    UseInterceptors,
    //UploadedFiles,
    ParseIntPipe,
    DefaultValuePipe,
    //ParseBoolPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    //ApiResponse,
    ApiParam,
    ApiQuery,
    ApiConsumes,
    ApiBody,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiNotFoundResponse,
    ApiConflictResponse,
    ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ProductVariantService } from '../../products/services/product.variant.service';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { BulkUpdateStockDto } from '../dto/bulk-update-stock.dto';
import { VariantResponseDto } from '../../products/dto/variant-response.dto';

@ApiTags('Product Variants')
@ApiBearerAuth()
@Controller('products/:productId/variants')
export class ProductVariantController {
    constructor(private readonly variantService: ProductVariantService) {}

    @Post()
    @ApiOperation({
        summary: 'Create a new product variant',
        description: 'Creates a new variant for a specific product with optional image uploads'
    })
    @ApiParam({
        name: 'productId',
        description: 'UUID of the parent product',
        type: 'string',
        format: 'uuid'
    })
    @ApiConsumes('multipart/form-data', 'application/json')
    @ApiBody({
        description: 'Variant creation data with optional file uploads',
        type: CreateVariantDto,
    })
    @ApiCreatedResponse({
        description: 'Variant created successfully',
        type: VariantResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Product not found',
        schema: {
        example: {
            statusCode: 404,
            message: 'Product not found',
            error: 'Not Found'
        }
        }
    })
    @ApiConflictResponse({
        description: 'SKU already exists or variant combination already exists',
        schema: {
        example: {
            statusCode: 409,
            message: 'SKU already exists',
            error: 'Conflict'
        }
        }
    })
    @ApiBadRequestResponse({
        description: 'Invalid input data',
        schema: {
        example: {
            statusCode: 400,
            message: ['sku should not be empty', 'price must be a positive number'],
            error: 'Bad Request'
        }
        }
    })
    @UseInterceptors(FilesInterceptor('imageFiles', 10))
    async create(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Body() createVariantDto: CreateVariantDto,
    ): Promise<VariantResponseDto> {
        const dto = { ...createVariantDto, productId };
        // Optionally, handle imageFiles in the service if needed
        return this.variantService.create(dto);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all variants for a product',
        description: 'Retrieves all variants associated with a specific product'
    })
    @ApiParam({
        name: 'productId',
        description: 'UUID of the parent product',
        type: 'string',
        format: 'uuid'
    })
    @ApiOkResponse({
        description: 'List of product variants',
        type: [VariantResponseDto],
    })
    @ApiNotFoundResponse({
        description: 'Product not found'
    })
    async findByProduct(
        @Param('productId', ParseUUIDPipe) productId: string,
    ): Promise<VariantResponseDto[]> {
        return this.variantService.findByProduct(productId);
    }

    @Get('search')
    @ApiOperation({
        summary: 'Find variant by color and size options',
        description: 'Retrieves a specific variant based on color and size combination'
    })
    @ApiParam({
        name: 'productId',
        description: 'UUID of the parent product',
        type: 'string',
        format: 'uuid'
    })
    @ApiQuery({
        name: 'color',
        description: 'Color of the variant',
        required: false,
        type: 'string',
        example: 'Red'
    })
    @ApiQuery({
        name: 'size',
        description: 'Size of the variant',
        required: false,
        type: 'string',
        example: 'L'
    })
    @ApiOkResponse({
        description: 'Variant found',
        type: VariantResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Variant not found for the specified options'
    })
    async findByOptions(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Query('color') color?: string,
        @Query('size') size?: string,
    ): Promise<VariantResponseDto> {
        return this.variantService.findByProductAndOptions(productId, color, size);
    }

    @Get('options')
    @ApiOperation({
        summary: 'Get available variant options',
        description: 'Retrieves all available colors and sizes for a product'
    })
    @ApiParam({
        name: 'productId',
        description: 'UUID of the parent product',
        type: 'string',
        format: 'uuid'
    })
    
    @ApiNotFoundResponse({
        description: 'Product not found'
    })
    async getAvailableOptions(
        @Param('productId', ParseUUIDPipe) productId: string,
    ): Promise<any> {
        return this.variantService.getAvailableOptions(productId);
    }

    @Get(':variantId')
    @ApiOperation({
        summary: 'Get variant by ID',
        description: 'Retrieves a specific variant by its ID'
    })
    @ApiParam({
        name: 'productId',
        description: 'UUID of the parent product',
        type: 'string',
        format: 'uuid'
    })
    @ApiParam({
        name: 'variantId',
        description: 'UUID of the variant',
        type: 'string',
        format: 'uuid'
    })
    @ApiOkResponse({
        description: 'Variant details',
        type: VariantResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Variant not found'
    })
    async findById(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
    ): Promise<VariantResponseDto> {
        return this.variantService.findById(variantId);
    }

    @Put(':variantId')
    @ApiOperation({
        summary: 'Update a variant',
        description: 'Updates an existing variant with new data and optional image uploads'
    })
    @ApiParam({
        name: 'productId',
        description: 'UUID of the parent product',
        type: 'string',
        format: 'uuid'
    })
    @ApiParam({
        name: 'variantId',
        description: 'UUID of the variant to update',
        type: 'string',
        format: 'uuid'
    })
    @ApiConsumes('multipart/form-data', 'application/json')
    @ApiBody({
        description: 'Variant update data with optional file uploads',
        type: UpdateVariantDto,
    })
    @ApiOkResponse({
        description: 'Variant updated successfully',
        type: VariantResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Variant not found'
    })
    @ApiConflictResponse({
        description: 'SKU already exists or variant combination already exists'
    })
    @UseInterceptors(FilesInterceptor('imageFiles', 10))
    async update(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Body() updateVariantDto: UpdateVariantDto,
    ): Promise<VariantResponseDto> {
        // If you need to handle imageFiles, do it separately in the service, not as part of UpdateVariantDto
        return this.variantService.update(variantId, updateVariantDto);
    }

    @Put(':variantId/toggle-active')
    @ApiOperation({
        summary: 'Toggle variant active status',
        description: 'Toggles the active status of a variant (active/inactive)'
    })
    @ApiParam({
        name: 'productId',
        description: 'UUID of the parent product',
        type: 'string',
        format: 'uuid'
    })
    @ApiParam({
        name: 'variantId',
        description: 'UUID of the variant',
        type: 'string',
        format: 'uuid'
    })
    @ApiOkResponse({
        description: 'Variant status toggled successfully',
        type: VariantResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Variant not found'
    })
    async toggleActive(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
    ): Promise<VariantResponseDto> {
        return this.variantService.toggleActive(variantId);
    }

    @Delete(':variantId')
    @ApiOperation({
        summary: 'Delete a variant',
        description: 'Permanently deletes a variant and its associated media files'
    })
    @ApiParam({
        name: 'productId',
        description: 'UUID of the parent product',
        type: 'string',
        format: 'uuid'
    })
    @ApiParam({
        name: 'variantId',
        description: 'UUID of the variant to delete',
        type: 'string',
        format: 'uuid'
    })
    
    @ApiNotFoundResponse({
        description: 'Variant not found'
    })
    @ApiConflictResponse({
        description: 'Cannot delete variant with active orders'
    })
    async delete(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
    ): Promise<void> {
        await this.variantService.delete(variantId);
    }
    }

    @ApiTags('Product Variants - Bulk Operations')
    @ApiBearerAuth()
    @Controller('variants')
    export class ProductVariantBulkController {
    constructor(private readonly variantService: ProductVariantService) {}

    @Post('bulk')
    @ApiOperation({
        summary: 'Bulk create variants',
        description: 'Creates multiple variants at once for better performance'
    })
    @ApiBody({
        description: 'Array of variant creation data',
        type: CreateVariantDto,
        isArray: true,
    })
    
    @ApiNotFoundResponse({
        description: 'One or more products not found'
    })
    @ApiConflictResponse({
        description: 'One or more SKUs already exist'
    })
    async bulkCreate(
        @Body() bulkCreateDto: CreateVariantDto[],
    ): Promise<{ created: number }> {
        return this.variantService.bulkCreate(bulkCreateDto);
    }

    @Put('bulk/stock')
    @ApiOperation({
        summary: 'Bulk update variant stock',
        description: 'Updates stock quantities for multiple variants at once'
    })
    @ApiBody({
        description: 'Array of variant stock updates',
        type: BulkUpdateStockDto,
    })
    @ApiOkResponse({
        description: 'Stock updated successfully',
        type: [VariantResponseDto],
    })
    @ApiNotFoundResponse({
        description: 'One or more variants not found'
    })
    async bulkUpdateStock(
        @Body() bulkUpdateStockDto: BulkUpdateStockDto,
    ): Promise<VariantResponseDto[]> {
        return this.variantService.bulkUpdateStock(
            bulkUpdateStockDto.updates.map(update => ({
                id: update.variantId,
                stockQuantity: update.stockQuantity,
            }))
        );
    }

    @Get('low-stock')
    @ApiOperation({
        summary: 'Get low stock variants',
        description: 'Retrieves variants with stock below the specified threshold'
    })
    @ApiQuery({
        name: 'threshold',
        description: 'Stock threshold (default: 5)',
        required: false,
        type: 'number',
        example: 5
    })
    @ApiQuery({
        name: 'limit',
        description: 'Maximum number of results (default: 50)',
        required: false,
        type: 'number',
        example: 50
    })
    @ApiOkResponse({
        description: 'List of low stock variants',
        type: [VariantResponseDto],
    })
    async getLowStockVariants(
        @Query('threshold', new DefaultValuePipe(5), ParseIntPipe) threshold: number,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    ): Promise<VariantResponseDto[]> {
        return this.variantService.getLowStockVariants(threshold, limit);
    }

    @Get('by-sku/:sku')
    @ApiOperation({
        summary: 'Find variant by SKU',
        description: 'Retrieves a variant using its unique SKU identifier'
    })
    @ApiParam({
        name: 'sku',
        description: 'Unique SKU of the variant',
        type: 'string',
        example: 'TSHIRT-RED-L-001'
    })
    @ApiOkResponse({
        description: 'Variant found',
        type: VariantResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Variant not found'
    })
    async findBySku(
        @Param('sku') sku: string,
    ): Promise<VariantResponseDto> {
        return this.variantService.findBySku(sku);
    }
}