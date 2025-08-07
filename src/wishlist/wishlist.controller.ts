/* eslint-disable prettier/prettier */
// src/wishlist/wishlist.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import {
  AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { MoveToCartDto } from '../wishlist/dto/move-to-cart.dto'
import { ShareWishlistDto } from '../wishlist/dto/share-wishlist.dto'
import { WishlistResponseDto, WishlistItemResponseDto } from '../wishlist/dto/wishlist-response.dto'

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post('add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({
    status: 201,
    description: 'Product added to wishlist successfully',
    type: WishlistItemResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found or is not available',
  })
  @ApiResponse({
    status: 409,
    description: 'Product is already in wishlist',
  })
  async addToWishlist(
    @CurrentUser('sub') userId: string,
    @Body() dto: AddToWishlistDto,
  ): Promise<WishlistItemResponseDto> {
    return this.wishlistService.addToWishlist(userId, dto);
  }

  @Delete('remove/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiParam({
    name: 'productId',
    description: 'Product ID to remove from wishlist',
    example: '60f7b3b3b3b3b3b3b3b3b3b3',
  })
  @ApiResponse({
    status: 200,
    description: 'Product removed from wishlist successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Item not found in wishlist',
  })
  async removeFromWishlist(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ): Promise<{ message: string }> {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist retrieved successfully',
    type: WishlistResponseDto,
  })
  async getUserWishlist(
    @CurrentUser('sub') userId: string,
  ): Promise<WishlistResponseDto> {
    return this.wishlistService.getUserWishlist(userId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist cleared successfully',
  })
  async clearWishlist(
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    return this.wishlistService.clearWishlist(userId);
  }

  @Post('move-to-cart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move item from wishlist to cart' })
  @ApiResponse({
    status: 200,
    description: 'Item moved to cart successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Item not found in wishlist',
  })
  @ApiResponse({
    status: 400,
    description: 'Product not available or insufficient stock',
  })
  async moveToCart(
    @CurrentUser('sub') userId: string,
    @Body() dto: MoveToCartDto,
  ): Promise<{ message: string }> {
    return this.wishlistService.moveToCart(userId, dto);
  }

  @Post('share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Share wishlist via email' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist shared successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot share empty wishlist or failed to send emails',
  })
  async shareWishlist(
    @CurrentUser('sub') userId: string,
    @Body() dto: ShareWishlistDto,
  ): Promise<{ message: string }> {
    return this.wishlistService.shareWishlist(userId, dto);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  @ApiParam({
    name: 'productId',
    description: 'Product ID to check',
    example: '60f7b3b3b3b3b3b3b3b3b3b3',
  })
  @ApiResponse({
    status: 200,
    description: 'Product wishlist status retrieved',
    schema: {
      type: 'object',
      properties: {
        isInWishlist: { type: 'boolean', example: true },
        productId: { type: 'string', example: '60f7b3b3b3b3b3b3b3b3b3b3' },
      },
    },
  })
  async isProductInWishlist(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ): Promise<{ isInWishlist: boolean; productId: string }> {
    const isInWishlist = await this.wishlistService.isProductInWishlist(userId, productId);
    return { isInWishlist, productId };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get wishlist statistics' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalItems: { type: 'number', example: 5 },
        totalValue: { type: 'number', example: 299.97 },
        availableItems: { type: 'number', example: 4 },
        unavailableItems: { type: 'number', example: 1 },
        recentlyAdded: { type: 'number', example: 2 },
      },
    },
  })
  async getWishlistStats(
    @CurrentUser('sub') userId: string,
  ): Promise<{
    totalItems: number;
    totalValue: number;
    availableItems: number;
    unavailableItems: number;
    recentlyAdded: number;
  }> {
    return this.wishlistService.getWishlistStats(userId);
  }
}