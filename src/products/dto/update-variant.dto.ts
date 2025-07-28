/* eslint-disable prettier/prettier */
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateVariantDto } from './create-variant.dto';

export class UpdateVariantDto extends PartialType(
    OmitType(CreateVariantDto, ['productId', 'sku'] as const),
) {}
