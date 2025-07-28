/* eslint-disable prettier/prettier */
import {
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
  //Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Gender, Size } from '@prisma/client';

export class ProductFilterDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subcategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collections?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(Gender, { each: true })
  genders?: Gender[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(Size, { each: true })
  sizes?: Size[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  onSale?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  inStock?: boolean;
}