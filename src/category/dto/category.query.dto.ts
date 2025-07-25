/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CategoryQueryDto {
    @ApiPropertyOptional({ 
        description: 'Page number for pagination', 
        example: 1,
        minimum: 1 
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
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
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({ 
        description: 'Search term for category name', 
        example: 'electronics' 
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    search?: string;

    @ApiPropertyOptional({ 
        description: 'Filter by active status', 
        example: true 
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ 
        description: 'Sort field', 
        example: 'name',
        enum: ['name', 'createdAt', 'updatedAt', 'sortOrder'] 
    })
    @IsOptional()
    @IsString()
    @IsEnum(['name', 'createdAt', 'updatedAt', 'sortOrder'])
    sortBy?: string = 'sortOrder';

    @ApiPropertyOptional({ 
        description: 'Sort order', 
        example: 'asc',
        enum: ['asc', 'desc'] 
    })
    @IsOptional()
    @IsString()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'asc';

    @ApiPropertyOptional({ 
        description: 'Include subcategories in response', 
        example: true 
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    includeSubcategories?: boolean = false;

    @ApiPropertyOptional({ 
        description: 'Include product count in response', 
        example: true 
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })

    @IsBoolean()
    includeProductCount?: boolean = false;
}