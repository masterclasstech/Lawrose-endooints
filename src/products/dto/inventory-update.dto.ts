/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsMongoId,
  Min,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum StockOperation {
  ADD = 'add',
  SUBTRACT = 'subtract',
  SET = 'set',
}

export enum StockReason {
  PURCHASE = 'purchase',
  RETURN = 'return',
  DAMAGED = 'damaged',
  LOST = 'lost',
  ADJUSTMENT = 'adjustment',
  PROMOTION = 'promotion',
  TRANSFER = 'transfer',
}

export class InventoryUpdateDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsEnum(StockOperation)
  operation: StockOperation;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsEnum(StockReason)
  reason: StockReason;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
