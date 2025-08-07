import { PartialType } from '@nestjs/mapped-types';
import { CreateWishlistDto } from './add-to-wishlist.dto';

export class UpdateWishlistDto extends PartialType(CreateWishlistDto) {}
