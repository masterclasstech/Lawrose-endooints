/* eslint-disable prettier/prettier */
import { IsString, IsOptional, IsBoolean, IsInt, IsUrl, Length, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
    @ApiProperty({
        description: 'Category name',
        example: 'Men\'s Clothing',
        minLength: 2,
        maxLength: 100
    })
    @IsString()
    @Length(2, 100, { message: 'Category name must be between 2 and 100 characters' })
    name: string;

    @ApiPropertyOptional({
        description: 'Category slug (auto-generated if not provided)',
        example: 'mens-clothing'
    })
    @IsString()
    @IsOptional()
    @Length(2, 100)
    slug?: string;

    @ApiPropertyOptional({
        description: 'Category description',
        example: 'Premium men\'s clothing collection'
    })
    @IsString()
    @IsOptional()
    @Length(0, 500, { message: 'Description cannot exceed 500 characters' })
    description?: string;

    @ApiPropertyOptional({
        description: 'Category image file',
        type: 'string',
        format: 'binary'
    })
    imageFiles?: any;

    @ApiPropertyOptional({
        description: 'Category image URL (alternative to file upload)',
        example: 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/categories/mens-clothing.jpg'
    })
    @IsUrl({}, { message: 'Invalid image URL format' })
    @IsOptional()
    imageUrl?: string;

    @ApiPropertyOptional({
        description: 'Meta title for SEO',
        example: 'Men\'s Clothing - Premium Fashion'
    })
    @IsString()
    @IsOptional()
    @Length(0, 150, { message: 'Meta title cannot exceed 150 characters' })
    metaTitle?: string;

    @ApiPropertyOptional({
        description: 'Meta description for SEO',
        example: 'Discover our premium men\'s clothing collection with the latest fashion trends'
    })
    @IsString()
    @IsOptional()
    @Length(0, 300, { message: 'Meta description cannot exceed 300 characters' })
    metaDescription?: string;

    @ApiPropertyOptional({
        description: 'Sort order for display',
        example: 1,
        default: 0
    })
    @IsInt({ message: 'Sort order must be an integer' })
    @Min(0, { message: 'Sort order cannot be negative' })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    sortOrder?: number = 0;

    @ApiPropertyOptional({
        description: 'Whether the category is active',
        example: true,
        default: true
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    isActive?: boolean = true;
}