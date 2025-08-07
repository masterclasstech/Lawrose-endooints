/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../common/notification/email.service';
@Module({
  imports: [PrismaModule],
  controllers: [WishlistController],
  providers: [WishlistService, EmailService],
  exports: [WishlistService, EmailService],
})
export class WishlistModule {}