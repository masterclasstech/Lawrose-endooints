/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'Array of items' })
    data: T[];

    @ApiProperty({ description: 'Total number of items' })
    total: number;

    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({ description: 'Number of items per page' })
    limit: number;

    @ApiProperty({ description: 'Total number of pages' })
    totalPages: number;

    @ApiProperty({ description: 'Whether there is a next page' })
    hasNextPage: boolean;

    @ApiProperty({ description: 'Whether there is a previous page' })
    hasPrevPage: boolean;
}

export class ApiResponseDto<T> {
    @ApiProperty({ description: 'Success status' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Response data' })
    data?: T;

    @ApiProperty({ description: 'Error details', required: false })
    error?: any;
}