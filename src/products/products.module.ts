import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MediaModule } from './media/media.module';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [MediaModule],
})
export class ProductsModule {}
