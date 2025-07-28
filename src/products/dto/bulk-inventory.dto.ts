/* eslint-disable prettier/prettier */
import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryUpdateDto } from './inventory-update.dto';

export class BulkInventoryUpdateDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InventoryUpdateDto)
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    updates: InventoryUpdateDto[];
}