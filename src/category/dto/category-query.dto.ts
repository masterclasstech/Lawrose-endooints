/* eslint-disable prettier/prettier */
import { IsOptional, IsBoolean, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CategoryQueryDto {
    @ApiPropertyOptional({
        description: 'Page number for pagination',
        example: 1,
        minimum: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        example: 10,
        minimum: 1,
        maximum: 100
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Search by category name',
        example: 'clothing'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by active status',
        example: true
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Sort field',
        example: 'name',
        enum: ['name', 'createdAt', 'sortOrder']
    })
    @IsOptional()
    @IsString()
    sortBy?: 'name' | 'createdAt' | 'sortOrder' = 'sortOrder';

    @ApiPropertyOptional({
        description: 'Sort order',
        example: 'asc',
        enum: ['asc', 'desc']
    })
    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'asc';

    @ApiPropertyOptional({
        description: 'Include subcategories in response',
        example: false
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeSubcategories?: boolean = false;

    @ApiPropertyOptional({
        description: 'Include product count',
        example: false
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeProductCount?: boolean = false;
}