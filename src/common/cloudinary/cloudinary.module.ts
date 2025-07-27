/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary';

@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}