/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CartController } from '../cart/cart.controller';
import { CartService } from '../cart/cart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/services/common.module';

@Module({
    imports: [PrismaModule, CommonModule],
    controllers: [CartController],
    providers: [
        CartService,
    ],
    exports: [ CartService ],
})
export class CartModule {}