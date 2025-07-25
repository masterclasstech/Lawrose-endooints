/* eslint-disable prettier/prettier */
import { PartialType, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { CreateSubcategoryDto } from './create-subcategory.dto';

export class UpdateSubcategoryDto extends PartialType(
    OmitType(CreateSubcategoryDto, ['categoryId'] as const)
    ) {
    @ApiPropertyOptional({
        description: 'Subcategory name',
        example: 'T-Shirts Updated'
    })
    name?: string;

    @ApiPropertyOptional({
        description: 'Subcategory slug',
        example: 't-shirts-updated'
    })
    slug?: string;
}