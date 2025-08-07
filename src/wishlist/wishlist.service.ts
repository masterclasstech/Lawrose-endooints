/* eslint-disable prettier/prettier */
// src/wishlist/wishlist.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/notification/email.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { MoveToCartDto } from './dto/move-to-cart.dto'
import { ShareWishlistDto } from './dto/share-wishlist.dto'
import { WishlistResponseDto, WishlistItemResponseDto } from './dto/wishlist-response.dto';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async addToWishlist(userId: string, dto: AddToWishlistDto): Promise<WishlistItemResponseDto> {
    try {
      // Check if product exists and is active
      const product = await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          isActive: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found or is not available');
      }

      // Check if item already exists in wishlist
      const existingItem = await this.prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: dto.productId,
          },
        },
      });

      if (existingItem) {
        throw new ConflictException('Product is already in your wishlist');
      }

      // Add item to wishlist
      const wishlistItem = await this.prisma.wishlistItem.create({
        data: {
          userId,
          productId: dto.productId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              comparePrice: true,
              discountPercentage: true,
              featuredImage: true,
              stockQuantity: true,
              isActive: true,
              colors: true,
              sizes: true,
            },
          },
        },
      });

      this.logger.log(`Product ${dto.productId} added to wishlist for user ${userId}`);

      return {
        id: wishlistItem.id,
        userId: wishlistItem.userId,
        productId: wishlistItem.productId,
        createdAt: wishlistItem.createdAt,
        product: wishlistItem.product,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Error adding item to wishlist:', error);
      throw new BadRequestException('Failed to add item to wishlist');
    }
  }

  async removeFromWishlist(userId: string, productId: string): Promise<{ message: string }> {
    try {
      const wishlistItem = await this.prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      if (!wishlistItem) {
        throw new NotFoundException('Item not found in your wishlist');
      }

      await this.prisma.wishlistItem.delete({
        where: {
          id: wishlistItem.id,
        },
      });

      this.logger.log(`Product ${productId} removed from wishlist for user ${userId}`);

      return { message: 'Item removed from wishlist successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error removing item from wishlist:', error);
      throw new BadRequestException('Failed to remove item from wishlist');
    }
  }

  async getUserWishlist(userId: string): Promise<WishlistResponseDto> {
    try {
      const wishlistItems = await this.prisma.wishlistItem.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              comparePrice: true,
              discountPercentage: true,
              featuredImage: true,
              stockQuantity: true,
              isActive: true,
              colors: true,
              sizes: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const items: WishlistItemResponseDto[] = wishlistItems.map(item => ({
        id: item.id,
        userId: item.userId,
        productId: item.productId,
        createdAt: item.createdAt,
        product: item.product,
      }));

      const totalValue = wishlistItems.reduce((sum, item) => {
        const price = item.product.discountPercentage 
          ? item.product.price * (1 - item.product.discountPercentage / 100)
          : item.product.price;
        return sum + price;
      }, 0);

      return {
        items,
        totalItems: items.length,
        totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      this.logger.error('Error fetching user wishlist:', error);
      throw new BadRequestException('Failed to fetch wishlist');
    }
  }

  async clearWishlist(userId: string): Promise<{ message: string }> {
    try {
      const result = await this.prisma.wishlistItem.deleteMany({
        where: { userId },
      });

      this.logger.log(`Cleared ${result.count} items from wishlist for user ${userId}`);

      return { message: `${result.count} items removed from wishlist` };
    } catch (error) {
      this.logger.error('Error clearing wishlist:', error);
      throw new BadRequestException('Failed to clear wishlist');
    }
  }

  async moveToCart(userId: string, dto: MoveToCartDto): Promise<{ message: string }> {
    try {
      // Check if item exists in wishlist
      const wishlistItem = await this.prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: dto.productId,
          },
        },
        include: {
          product: {
            include: {
              variants: true,
            },
          },
        },
      });

      if (!wishlistItem) {
        throw new NotFoundException('Item not found in your wishlist');
      }

      const product = wishlistItem.product;

      // Validate product availability
      if (!product.isActive) {
        throw new BadRequestException('Product is no longer available');
      }

      if (product.stockQuantity < dto.quantity) {
        throw new BadRequestException('Insufficient stock available');
      }

      // Find matching variant if color/size specified
      let variantId: string | undefined;
      let unitPrice = product.price;

      if (dto.selectedColor || dto.selectedSize) {
        const variant = product.variants.find(v => 
          (!dto.selectedColor || v.color === dto.selectedColor) &&
          (!dto.selectedSize || v.size === dto.selectedSize) &&
          v.isActive
        );

        if (!variant) {
          throw new BadRequestException('Selected variant is not available');
        }

        if (variant.stockQuantity < dto.quantity) {
          throw new BadRequestException('Insufficient variant stock available');
        }

        variantId = variant.id;
        unitPrice = variant.price || product.price;
      }

      // Apply discount if available
      if (product.discountPercentage) {
        unitPrice = unitPrice * (1 - product.discountPercentage / 100);
      }

      const totalPrice = unitPrice * dto.quantity;

      // Check if item already exists in cart with same variant
      const existingCartItem = await this.prisma.cartItem.findUnique({
        where: {
          userId_productId_variantId: {
            userId,
            productId: dto.productId,
            variantId: variantId || null,
          },
        },
      });

      if (existingCartItem) {
        // Update existing cart item quantity
        await this.prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: existingCartItem.quantity + dto.quantity,
            totalPrice: existingCartItem.totalPrice + totalPrice,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new cart item
        await this.prisma.cartItem.create({
          data: {
            userId,
            productId: dto.productId,
            variantId,
            quantity: dto.quantity,
            selectedColor: dto.selectedColor,
            selectedSize: dto.selectedSize,
            unitPrice,
            totalPrice,
          },
        });
      }

      // Remove from wishlist
      await this.prisma.wishlistItem.delete({
        where: { id: wishlistItem.id },
      });

      this.logger.log(`Item ${dto.productId} moved from wishlist to cart for user ${userId}`);

      return { message: 'Item moved to cart successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error moving item to cart:', error);
      throw new BadRequestException('Failed to move item to cart');
    }
  }

  async shareWishlist(userId: string, dto: ShareWishlistDto): Promise<{ message: string }> {
    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get wishlist items
      const wishlistData = await this.getUserWishlist(userId);

      if (wishlistData.totalItems === 0) {
        throw new BadRequestException('Cannot share an empty wishlist');
      }

      // Send emails to all recipients
      const emailPromises = dto.emails.map(async (email) => {
        return this.emailService.sendWishlistShareEmail(
          email,
          user.fullName,
          user.email,
          wishlistData,
          dto.message
        );
      });

      const results = await Promise.allSettled(emailPromises);
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;

      const failedCount = dto.emails.length - successCount;

      this.logger.log(`Wishlist shared by user ${userId}: ${successCount} successful, ${failedCount} failed`);

      if (successCount === 0) {
        throw new BadRequestException('Failed to send wishlist to any recipients');
      }

      let message = `Wishlist shared successfully with ${successCount} recipient(s)`;
      if (failedCount > 0) {
        message += `. Failed to send to ${failedCount} recipient(s)`;
      }

      return { message };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error sharing wishlist:', error);
      throw new BadRequestException('Failed to share wishlist');
    }
  }

  async isProductInWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const item = await this.prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      return !!item;
    } catch (error) {
      this.logger.error('Error checking if product is in wishlist:', error);
      return false;
    }
  }

  async getWishlistStats(userId: string): Promise<{
    totalItems: number;
    totalValue: number;
    availableItems: number;
    unavailableItems: number;
    recentlyAdded: number;
  }> {
    try {
      const wishlistData = await this.getUserWishlist(userId);
      
      const availableItems = wishlistData.items.filter(item => 
        item.product.isActive && item.product.stockQuantity > 0
      ).length;

      const unavailableItems = wishlistData.totalItems - availableItems;

      // Count items added in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentlyAdded = wishlistData.items.filter(item => 
        new Date(item.createdAt) > sevenDaysAgo
      ).length;

      return {
        totalItems: wishlistData.totalItems,
        totalValue: wishlistData.totalValue,
        availableItems,
        unavailableItems,
        recentlyAdded,
      };
    } catch (error) {
      this.logger.error('Error getting wishlist stats:', error);
      throw new BadRequestException('Failed to get wishlist statistics');
    }
  }
}