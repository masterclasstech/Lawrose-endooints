/* eslint-disable prettier/prettier */
import { IsString, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AddToCartDto } from './add-to-cart.dto';

export class GuestCartItemDto extends AddToCartDto {}

export class MergeGuestCartDto {
    @ApiProperty({
        description: 'Guest cart ID',
        example: 'guest_60f1b2b3b3b3b3b3b3b3b3b2',
    })
    @IsString()
    guestId: string;

    @ApiProperty({
        type: [GuestCartItemDto],
        description: 'Guest cart items to merge',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GuestCartItemDto)
    items: GuestCartItemDto[];
}

export class GuestCartDto {
    @ApiProperty({
        description: 'Guest cart ID',
        example: 'guest_60f1b2b3b3b3b3b3b3b3b3b2',
    })
    @IsString()
    guestId: string;

    @ApiProperty({
        type: [GuestCartItemDto],
        description: 'Cart items',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GuestCartItemDto)
    items: GuestCartItemDto[];

    @ApiProperty({
        description: 'Creation date',
        example: '2023-10-01T10:00:00.000Z',
    })
    @IsDateString()
    createdAt: Date;

    @ApiProperty({
        description: 'Last modified date',
        example: '2023-10-01T10:30:00.000Z',
    })
    @IsDateString()
    lastModified: Date;
}