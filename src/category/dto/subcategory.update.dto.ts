/* eslint-disable prettier/prettier */
import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { CreateSubcategoryDto } from "./subcategory.dto";

export class UpdateSubcategoryDto extends PartialType(CreateSubcategoryDto) {
    @ApiPropertyOptional({ 
        description: 'Parent category ID (optional for updates)', 
        example: '60f7b3b3b3b3b3b3b3b3b3b3' 
    })
    @IsOptional()
    @IsString()
    categoryId?: string;
}
