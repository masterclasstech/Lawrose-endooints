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
  IsMongoId,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Size } from '@prisma/client';

export class CreateVariantDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Transform(({ value }) => value?.trim())
  color?: string;

  @IsOptional()
  @IsEnum(Size)
  size?: Size;

  @IsString()
  @Length(3, 100)
  @Transform(({ value }) => value?.trim().toUpperCase())
  sku: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  comparePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number = 0;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(10)
  images?: string[] = [];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
