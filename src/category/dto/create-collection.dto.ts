/* eslint-disable prettier/prettier */
import { IsString, IsOptional, IsBoolean, IsInt, IsUrl, Length, Min, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { $Enums } from '@prisma/client';


export class CreateCollectionDto {
    @ApiProperty({
        description: 'Collection name',
        example: 'Summer 2024 Collection',
        minLength: 2,
        maxLength: 100
    })
    @IsString()
    @Length(2, 100, { message: 'Collection name must be between 2 and 100 characters' })
    name: string;

    @ApiPropertyOptional({
        description: 'Collection slug (auto-generated if not provided)',
        example: 'summer-2024-collection'
    })
    @IsString()
    @IsOptional()
    @Length(2, 100)
    slug?: string;

    @ApiPropertyOptional({
        description: 'Collection description',
        example: 'Bright and comfortable summer collection for 2024'
    })
    @IsString()
    @IsOptional()
    @Length(0, 500, { message: 'Description cannot exceed 500 characters' })
    description?: string;

    @ApiPropertyOptional({
        description: 'Collection image URL',
        example: 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/collections/summer-2024.jpg'
    })
    @IsUrl({}, { message: 'Invalid image URL format' })
    @IsOptional()
    imageUrl?: string;

    @ApiProperty({
        description: 'Collection year',
        example: 2024
    })
    @IsInt({ message: 'Year must be an integer' })
    @Min(2020, { message: 'Year cannot be before 2020' })
    @Type(() => Number)
    year: number;

    @ApiProperty({
    description: 'Collection season',
    enum: $Enums.Season,
    example: 'SPRING_SUMMER'
    })
    @IsEnum($Enums.Season)
    season: $Enums.Season;

    @ApiPropertyOptional({
        description: 'Meta title for SEO',
        example: 'Summer 2024 Collection - Fresh Fashion'
    })
    @IsString()
    @IsOptional()
    @Length(0, 150, { message: 'Meta title cannot exceed 150 characters' })
    metaTitle?: string;

    @ApiPropertyOptional({
        description: 'Meta description for SEO',
        example: 'Discover our fresh summer 2024 collection with the latest trends'
    })
    @IsString()
    @IsOptional()
    @Length(0, 300, { message: 'Meta description cannot exceed 300 characters' })
    metaDescription?: string;

    @ApiPropertyOptional({
        description: 'Sort order for display',
        example: 1,
        default: 0
    })
    @IsInt({ message: 'Sort order must be an integer' })
    @Min(0, { message: 'Sort order cannot be negative' })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    sortOrder?: number = 0;

    @ApiPropertyOptional({
        description: 'Whether the collection is active',
        example: true,
        default: true
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    isActive?: boolean = true;

    @ApiPropertyOptional({
        description: 'Whether the collection is featured',
        example: false,
        default: false
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    isFeatured?: boolean = false;

    @ApiPropertyOptional({
        description: 'Collection start date',
        example: '2024-06-01T00:00:00.000Z'
    })
    @IsDateString({}, { message: 'Invalid start date format' })
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'Collection end date',
        example: '2024-08-31T23:59:59.999Z'
    })
    @IsDateString({}, { message: 'Invalid end date format' })
    @IsOptional()
    endDate?: string;
}