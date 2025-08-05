/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ProductService } from '../products/services/products.service';
import { ProductController } from '../products/controllers/products.controller';
import { ProductVariantService } from '../products/services/product.variant.service';
import { ProductVariantController } from '../products/controllers/product.variant.controller';
import { ProductRepository } from '../products/repositories/product.repository';
import { ProductVariantRepository } from '../products/repositories/product-variant.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { CommonModule } from '@/common/services/common.module';
//import { CommonModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    CommonModule,
    EventEmitterModule, 
  ],
  controllers: [
    ProductController,
    ProductVariantController,
  ],
  providers: [
    ProductService,
    ProductVariantService,
    ProductRepository,
    ProductVariantRepository,
  ],
  exports: [
    ProductService,
    ProductVariantService,
    ProductRepository,
    ProductVariantRepository,
  ],
})
export class ProductsModule {}