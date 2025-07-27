/* eslint-disable prettier/prettier */
import { PartialType, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { CreateSubcategoryDto } from './create-subcategory.dto';
import { IsOptional, IsString, IsBoolean, IsInt, Min, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSubcategoryDto extends PartialType(
    OmitType(CreateSubcategoryDto, ['categoryId'] as const)
) {
    @ApiPropertyOptional({
        description: 'Subcategory name',
        example: 'Updated Smartphones'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({
        description: 'Subcategory slug (auto-generated from name if not provided)',
        example: 'updated-smartphones'
    })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiPropertyOptional({
        description: 'Subcategory description',
        example: 'Updated mobile phones and accessories collection'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Image URL (used when not uploading a file)',
        example: 'https://example.com/updated-smartphones.jpg'
    })
    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @ApiPropertyOptional({
        description: 'Meta title for SEO',
        example: 'Updated Smartphones - Mobile Devices'
    })
    @IsOptional()
    @IsString()
    metaTitle?: string;

    @ApiPropertyOptional({
        description: 'Meta description for SEO',
        example: 'Browse our updated collection of smartphones and mobile devices'
    })
    @IsOptional()
    @IsString()
    metaDescription?: string;

    @ApiPropertyOptional({
        description: 'Sort order within category',
        example: 1,
        minimum: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiPropertyOptional({
        description: 'Whether the subcategory is active',
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