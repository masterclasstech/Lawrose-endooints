/* eslint-disable prettier/prettier */
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCollectionDto } from './create-collection.dto';
import { IsOptional, IsString, IsBoolean, IsInt, Min, IsUrl, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { $Enums } from '@prisma/client';

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {
    @ApiPropertyOptional({
        description: 'Collection name',
        example: 'Updated Summer 2024'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({
        description: 'Collection slug (auto-generated from name if not provided)',
        example: 'updated-summer-2024'
    })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiPropertyOptional({
        description: 'Collection description',
        example: 'Updated summer fashion trends and styles'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Image URL (used when not uploading a file)',
        example: 'https://example.com/updated-summer-2024.jpg'
    })
    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @ApiPropertyOptional({
        description: 'Collection year',
        example: 2024,
        minimum: 2000
    })
    @IsOptional()
    @IsInt()
    @Min(2000)
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return parseInt(value, 10);
        }
        return value;
    })
    year?: number;

    @ApiPropertyOptional({
        description: 'Collection season',
        enum: $Enums.Season,
        example: 'SPRING_SUMMER'
    })
    @IsOptional()
    @IsEnum($Enums.Season)
    season?: $Enums.Season;

    @ApiPropertyOptional({
        description: 'Meta title for SEO',
        example: 'Updated Summer 2024 Collection - Fashion Trends'
    })
    @IsOptional()
    @IsString()
    metaTitle?: string;

    @ApiPropertyOptional({
        description: 'Meta description for SEO',
        example: 'Discover the updated summer 2024 fashion trends and styles'
    })
    @IsOptional()
    @IsString()
    metaDescription?: string;

    @ApiPropertyOptional({
        description: 'Sort order for display',
        example: 1,
        minimum: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return parseInt(value, 10);
        }
        return value;
    })
    sortOrder?: number;

    @ApiPropertyOptional({
        description: 'Whether the collection is active',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value === 'true';
        }
        return value;
    })
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Whether the collection is featured',
        example: false
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value === 'true';
        }
        return value;
    })
    isFeatured?: boolean;

    @ApiPropertyOptional({
        description: 'Collection start date (ISO string)',
        example: '2024-06-01T00:00:00Z'
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'Collection end date (ISO string)',
        example: '2024-08-31T23:59:59Z'
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({
        description: 'Set to true to remove the current image',
        example: false
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value === 'true';
        }
        return value;
    })
    removeImage?: boolean;
}