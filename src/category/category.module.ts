/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CategoryService } from '../category/services/category.service';
import { CategoryController } from '../category/controllers/category.controller';
import { SubcategoryController } from './controllers/subcategory.controller';
import { CollectionController } from './controllers/collection.controller';
import { SubcategoryService } from './services/subcategory.service';
import { CollectionService } from './services/collection.service';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';
import { PrismaModule } from '../prisma/prisma.module'; 
//import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule, PrismaModule],
  controllers: [
    CategoryController, 
    SubcategoryController, 
    CollectionController
  ],
  providers: [CategoryService, SubcategoryService, CollectionService],
  exports: [CategoryService, SubcategoryService, CollectionService],
})
export class CategoryModule {}
