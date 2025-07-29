/* eslint-disable prettier/prettier */
import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsInt, 
  IsNumber, 
  IsUrl, 
  IsArray, 
  IsEnum,
  Length, 
  Min,
  Max,
  IsDateString
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// Enums based on your Prisma schema
export enum Gender {
  MEN = 'MEN',
  WOMEN = 'WOMEN'
}

export enum Size {
  XS = 'XS',
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL',
  XXL = 'XXL'
}

export class ProductDimensionsDto {
  @ApiPropertyOptional({ description: 'Length in cm' })
  @IsNumber()
  @IsOptional()
  length?: number;

  @ApiPropertyOptional({ description: 'Width in cm' })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: 'Height in cm' })
  @IsNumber()
  @IsOptional()
  height?: number;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Premium Cotton T-Shirt',
    minLength: 2,
    maxLength: 200
  })
  @IsString()
  @Length(2, 200, { message: 'Product name must be between 2 and 200 characters' })
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'High-quality cotton t-shirt with premium finish'
  })
  @IsString()
  @Length(10, 2000, { message: 'Description must be between 10 and 2000 characters' })
  description: string;

  @ApiPropertyOptional({
    description: 'Short description for product cards',
    example: 'Premium cotton t-shirt'
  })
  @IsString()
  @IsOptional()
  @Length(0, 300, { message: 'Short description cannot exceed 300 characters' })
  shortDescription?: string;

  @ApiProperty({
    description: 'Product SKU (Stock Keeping Unit)',
    example: 'SHIRT-001-M-BLUE'
  })
  @IsString()
  @Length(3, 50, { message: 'SKU must be between 3 and 50 characters' })
  sku: string;

  @ApiPropertyOptional({
    description: 'Product barcode',
    example: '1234567890123'
  })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({
    description: 'Product price',
    example: 29.99,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative' })
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @ApiPropertyOptional({
    description: 'Compare at price (original price for discounts)',
    example: 39.99,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Compare price cannot be negative' })
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  comparePrice?: number;

  @ApiProperty({
    description: 'Category ID',
    example: '64a1b2c3d4e5f6789abcdef0'
  })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Subcategory ID',
    example: '64a1b2c3d4e5f6789abcdef1'
  })
  @IsString()
  @IsOptional()
  subcategoryId?: string;

  @ApiPropertyOptional({
    description: 'Collection ID',
    example: '64a1b2c3d4e5f6789abcdef2'
  })
  @IsString()
  @IsOptional()
  collectionId?: string;

  @ApiProperty({
    description: 'Product gender category',
    enum: Gender,
    example: Gender.MEN
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    default: 'USD'
  })
  @IsString()
  @IsOptional()
  @Length(3, 3, { message: 'Currency must be 3 characters' })
  currency?: string = 'USD';

  @ApiPropertyOptional({
    description: 'Stock quantity',
    example: 100,
    minimum: 0,
    default: 0
  })
  @IsInt({ message: 'Stock quantity must be an integer' })
  @Min(0, { message: 'Stock quantity cannot be negative' })
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : 0)
  stockQuantity?: number = 0;

  @ApiPropertyOptional({
    description: 'Low stock threshold',
    example: 10,
    minimum: 0,
    default: 10
  })
  @IsInt({ message: 'Low stock threshold must be an integer' })
  @Min(0, { message: 'Low stock threshold cannot be negative' })
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : 10)
  lowStockThreshold?: number = 10;

  @ApiPropertyOptional({
    description: 'Whether to track inventory',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  trackInventory?: boolean = true;

  @ApiPropertyOptional({
    description: 'Discount percentage',
    example: 15,
    minimum: 0,
    maximum: 100
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Discount percentage cannot be negative' })
  @Max(100, { message: 'Discount percentage cannot exceed 100' })
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  discountPercentage?: number;

  @ApiPropertyOptional({
    description: 'Discount start date',
    example: '2024-01-01T00:00:00Z'
  })
  @IsDateString()
  @IsOptional()
  discountStartDate?: string;

  @ApiPropertyOptional({
    description: 'Discount end date',
    example: '2024-12-31T23:59:59Z'
  })
  @IsDateString()
  @IsOptional()
  discountEndDate?: string;

  @ApiPropertyOptional({
    description: 'Product image files for upload',
    type: 'array',
    items: { type: 'string', format: 'binary' }
  })
  imageFile?: Express.Multer.File[];

  @ApiPropertyOptional({
    description: 'Existing product image URLs',
    example: ['https://res.cloudinary.com/example/image1.jpg'],
    type: [String]
  })
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({
    description: 'Featured image URL',
    example: 'https://res.cloudinary.com/example/featured.jpg'
  })
  @IsUrl({}, { message: 'Featured image must be a valid URL' })
  @IsOptional()
  featuredImage?: string;

  @ApiPropertyOptional({
    description: 'Meta title for SEO',
    example: 'Premium Cotton T-Shirt - Comfortable & Stylish'
  })
  @IsString()
  @IsOptional()
  @Length(0, 150, { message: 'Meta title cannot exceed 150 characters' })
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'Meta description for SEO',
    example: 'Discover our premium cotton t-shirt collection with superior comfort and style'
  })
  @IsString()
  @IsOptional()
  @Length(0, 300, { message: 'Meta description cannot exceed 300 characters' })
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'Available colors',
    example: ['Red', 'Blue', 'Black'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[] = [];

  @ApiPropertyOptional({
    description: 'Available sizes',
    example: [Size.M, Size.L, Size.XL],
    enum: Size,
    isArray: true
  })
  @IsArray()
  @IsEnum(Size, { each: true })
  @IsOptional()
  sizes?: Size[] = [];

  @ApiPropertyOptional({
    description: 'Whether the product is active',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether the product is featured',
    example: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether the product is digital',
    example: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDigital?: boolean = false;

  @ApiPropertyOptional({
    description: 'Product weight in grams',
    example: 200,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Weight cannot be negative' })
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  weight?: number;

  @ApiPropertyOptional({
    description: 'Product dimensions',
    type: ProductDimensionsDto
  })
  @Type(() => ProductDimensionsDto)
  @IsOptional()
  dimensions?: ProductDimensionsDto;

  @ApiPropertyOptional({
    description: 'Product tags',
    example: ['casual', 'summer', 'cotton'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] = [];

  @ApiPropertyOptional({
    description: 'Product materials',
    example: ['100% Cotton', 'Organic'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  materials?: string[] = [];

  @ApiPropertyOptional({
    description: 'Care instructions',
    example: ['Machine wash cold', 'Tumble dry low'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  careInstructions?: string[] = [];
}