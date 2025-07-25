/* eslint-disable prettier/prettier */
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
    @ApiPropertyOptional({
        description: 'Category name',
        example: 'Men\'s Clothing Updated'
    })
    name?: string;

    @ApiPropertyOptional({
        description: 'Category slug',
        example: 'mens-clothing-updated'
    })
    slug?: string;
}