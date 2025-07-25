/* eslint-disable prettier/prettier */
import { IsString, IsOptional, IsBoolean, IsInt, IsUrl, Length, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateSubcategoryDto {
    @ApiProperty({
        description: 'Subcategory name',
        example: 'T-Shirts',
        minLength: 2,
        maxLength: 100
    })
    @IsString()
    @IsNotEmpty()
    @Length(2, 100, { message: 'Subcategory name must be between 2 and 100 characters' })
    name: string;

    @ApiPropertyOptional({
        description: 'Subcategory slug (auto-generated if not provided)',
        example: 't-shirts'
    })
    @IsString()
    @IsOptional()
    @Length(2, 100)
    slug?: string;

    @ApiProperty({
        description: 'Parent category ID',
        example: '60b8d295f1b2c8001f5e4e4b'
    })
    @IsString()
    @IsNotEmpty({ message: 'Category ID is required' })
    categoryId: string;

    @ApiPropertyOptional({
        description: 'Subcategory description',
        example: 'Comfortable and stylish t-shirts for men'
    })
    @IsString()
    @IsOptional()
    @Length(0, 500, { message: 'Description cannot exceed 500 characters' })
    description?: string;

    @ApiPropertyOptional({
        description: 'Subcategory image URL',
        example: 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/subcategories/t-shirts.jpg'
    })
    @IsUrl({}, { message: 'Invalid image URL format' })
    @IsOptional()
    imageUrl?: string;

    @ApiPropertyOptional({
        description: 'Meta title for SEO',
        example: 'Men\'s T-Shirts - Comfortable & Stylish'
    })
    @IsString()
    @IsOptional()
    @Length(0, 150, { message: 'Meta title cannot exceed 150 characters' })
    metaTitle?: string;

    @ApiPropertyOptional({
    description: 'Meta description for SEO',
    example: 'Shop our collection of comfortable and stylish men\'s t-shirts'
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
        description: 'Whether the subcategory is active',
        example: true,
        default: true
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    isActive?: boolean = true;
}