/* eslint-disable prettier/prettier */
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateVariantDto } from './create-variant.dto';
import { IsOptional, IsBoolean, IsString, Length, IsArray, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateVariantDto extends PartialType(
    OmitType(CreateVariantDto, ['productId'] as const),
) {
    // Allow SKU updates in UpdateVariantDto
    @IsOptional()
    @IsString()
    @Length(3, 100)
    @Transform(({ value }) => value?.trim().toUpperCase())
    sku?: string;

    // Add the missing replaceImages property
    @IsOptional()
    @IsBoolean()
    replaceImages?: boolean;

    // Add the missing imageFiles property
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    imageFiles?: Buffer[] | string[];
}