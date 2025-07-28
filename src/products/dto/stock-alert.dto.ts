/* eslint-disable prettier/prettier */
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, Max, Min } from "class-validator";

export class StockAlertDto {
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(1000)
    @Type(() => Number)
    threshold?: number;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    includeVariants?: boolean = true;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    activeOnly?: boolean = true;
}