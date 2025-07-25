/* eslint-disable prettier/prettier */
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCollectionDto } from './create-collection.dto';

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {
    @ApiPropertyOptional({
        description: 'Collection name',
        example: 'Summer 2024 Collection Updated'
    })
    name?: string;

    @ApiPropertyOptional({
        description: 'Collection slug',
        example: 'summer-2024-collection-updated'
    })
    slug?: string;
}