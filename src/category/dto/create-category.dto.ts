/* eslint-disable prettier/prettier */
import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsUrl, 
  IsNotEmpty, 
  Length, 
  Min, 
  Max,
  //ValidateNested,
  //IsArray,
  //ArrayNotEmpty,
  //IsEnum
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===== CREATE CATEGORY DTO =====
export class CreateCategoryDto {
  @ApiProperty({ 
    description: 'Category name', 
    example: 'Electronics',
    minLength: 2,
    maxLength: 100 
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ 
    description: 'Category description', 
    example: 'Latest electronic gadgets and devices' 
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Category image URL from Cloudinary',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/categories/electronics.jpg'
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ 
    description: 'SEO meta title', 
    example: 'Electronics - Best Gadgets Online',
    maxLength: 60 
  })
  @IsOptional()
  @IsString()
  @Length(0, 60)
  @Transform(({ value }) => value?.trim())
  metaTitle?: string;

  @ApiPropertyOptional({ 
    description: 'SEO meta description', 
    example: 'Shop the latest electronics and gadgets with fast delivery',
    maxLength: 160 
  })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  @Transform(({ value }) => value?.trim())
  metaDescription?: string;

  @ApiPropertyOptional({ 
    description: 'Display sort order', 
    example: 1,
    minimum: 0,
    maximum: 999 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999)
  @Type(() => Number)
  sortOrder?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Whether category is active', 
    example: true 
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean = true;
}
