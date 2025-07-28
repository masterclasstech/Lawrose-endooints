/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  IsUrl,
  Min,
  Max,
  Length,
  IsDateString,
  ValidateNested,
  //IsObject,
  IsInt,
  //ArrayMinSize,
  ArrayMaxSize,
  IsMongoId,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Gender, Size } from '@prisma/client';

export class ProductDimensionsDto {
    @IsNumber()
    @Min(0)
    length: number;

    @IsNumber()
    @Min(0)
    width: number;

    @IsNumber()
    @Min(0)
    height: number;
}

export class CreateProductDto {
    @IsString()
    @Length(3, 255)
    @Transform(({ value }) => value?.trim())
    name: string;

    @IsString()
    @Length(10, 2000)
    @Transform(({ value }) => value?.trim())
    description: string;

    @IsOptional()
    @IsString()
    @Length(10, 500)
    @Transform(({ value }) => value?.trim())
    shortDescription?: string;

    @IsString()
    @Length(3, 100)
    @Transform(({ value }) => value?.trim().toUpperCase())
    sku: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    barcode?: string;

    @IsNumber()
    @Min(0.01)
    @Max(999999.99)
    price: number;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    @Max(999999.99)
    comparePrice?: number;

    @IsOptional()
    @IsString()
    @Length(3, 3)
    currency?: string = 'USD';

    @IsOptional()
    @IsInt()
    @Min(0)
    stockQuantity?: number = 0;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1000)
    lowStockThreshold?: number = 10;

    @IsOptional()
    @IsBoolean()
    trackInventory?: boolean = true;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    discountPercentage?: number;

    @IsOptional()
    @IsDateString()
    discountStartDate?: string;

    @IsOptional()
    @IsDateString()
    discountEndDate?: string;

    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    @ArrayMaxSize(10)
    images?: string[] = [];

    @IsOptional()
    @IsUrl()
    featuredImage?: string;

    @IsOptional()
    @IsString()
    @Length(3, 255)
    metaTitle?: string;

    @IsOptional()
    @IsString()
    @Length(10, 500)
    metaDescription?: string;

    @IsMongoId()
    categoryId: string;

    @IsOptional()
    @IsMongoId()
    subcategoryId?: string;

    @IsOptional()
    @IsMongoId()
    collectionId?: string;

    @IsEnum(Gender)
    gender: Gender;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    colors?: string[] = [];

    @IsOptional()
    @IsArray()
    @IsEnum(Size, { each: true })
    @ArrayMaxSize(10)
    sizes?: Size[] = [];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean = false;

    @IsOptional()
    @IsBoolean()
    isDigital?: boolean = false;

    @IsOptional()
    @IsNumber()
    @Min(0)
    weight?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => ProductDimensionsDto)
    dimensions?: ProductDimensionsDto;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(50)
    tags?: string[] = [];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    materials?: string[] = [];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    careInstructions?: string[] = [];
}