/* eslint-disable prettier/prettier */
import { IsOptional, IsBoolean, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

enum Season {
    SPRING_SUMMER = 'SPRING_SUMMER',
    AUTUMN_WINTER = 'AUTUMN_WINTER',
    YEAR_ROUND = 'YEAR_ROUND'
}

export class CollectionQueryDto {
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
        description: 'Search by collection name',
        example: 'summer'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by year',
        example: 2024
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;

    @ApiPropertyOptional({
        description: 'Filter by season',
        example: 'SPRING_SUMMER',
        enum: Season
    })
    @IsOptional()
    @IsEnum(Season)
    season?: Season;

    @ApiPropertyOptional({
        description: 'Filter by active status',
        example: true
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Filter by featured status',
        example: false
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    isFeatured?: boolean;

    @ApiPropertyOptional({
        description: 'Sort field',
        example: 'name',
        enum: ['name', 'createdAt', 'sortOrder', 'year']
    })
    @IsOptional()
    @IsString()
    sortBy?: 'name' | 'createdAt' | 'sortOrder' | 'year' = 'sortOrder';

    @ApiPropertyOptional({
        description: 'Sort order',
        example: 'desc',
        enum: ['asc', 'desc']
    })
    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';

    @ApiPropertyOptional({
        description: 'Include product count',
        example: false
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    includeProductCount?: boolean = false;
}