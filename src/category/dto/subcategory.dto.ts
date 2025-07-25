/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Length, Max, Min } from "class-validator";

export class CreateSubcategoryDto {
    @ApiProperty({ 
        description: 'Subcategory name', 
        example: 'Smartphones',
        minLength: 2,
        maxLength: 100 
    })
    @IsString()
    @IsNotEmpty()
    @Length(2, 100)
    @Transform(({ value }) => value?.trim())
    name: string;

    @ApiProperty({ 
        description: 'Parent category ID', 
        example: '60f7b3b3b3b3b3b3b3b3b3b3' 
    })
    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @ApiPropertyOptional({ 
        description: 'Subcategory description', 
        example: 'Latest smartphones with advanced features' 
    })
    @IsOptional()
    @IsString()
    @Length(0, 1000)
    @Transform(({ value }) => value?.trim())
    description?: string;

    @ApiPropertyOptional({ 
        description: 'Subcategory image URL from Cloudinary',
        example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/subcategories/smartphones.jpg'
    })
    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @ApiPropertyOptional({ 
        description: 'SEO meta title', 
        example: 'Smartphones - Latest Models',
        maxLength: 60 
    })
    @IsOptional()
    @IsString()
    @Length(0, 60)
    @Transform(({ value }) => value?.trim())
    metaTitle?: string;

    @ApiPropertyOptional({ 
        description: 'SEO meta description', 
        example: 'Discover the latest smartphones with cutting-edge technology',
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
        description: 'Whether subcategory is active', 
        example: true 
    })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isActive?: boolean = true;
}