/* eslint-disable prettier/prettier */
import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateCartItemDto {
    @ApiProperty({
        description: 'New quantity for the cart item',
        minimum: 1,
        maximum: 99,
        example: 3,
    })
    @IsInt()
    @Min(1)
    @Max(99)
    @Transform(({ value }) => parseInt(value))
    quantity: number;
}