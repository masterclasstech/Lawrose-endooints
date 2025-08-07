/* eslint-disable prettier/prettier */
import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { CacheKeyType } from '../interfaces/cache.interface';
import {
    CartInterface,
    CartItemInterface,
    CartSummaryInterface,
} from '../interfaces/cart.interface';
import { AddToCartDto } from '../cart/dto/add-to-cart.dto';
import { UpdateCartItemDto } from '../cart/dto/update-cart-item.dto';
import { CART_CONSTANTS, CART_ERROR_MESSAGES } from '../cart/constant/cart.constants';
import { Size } from '@prisma/client';

// Define the User interface for type safety
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AuthenticatedUser {
    id: string;
    email?: string;
    role?: string;
}

@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) {}

    // ===============================
    // UNIFIED CART METHODS (SUPPORTS BOTH AUTHENTICATED AND GUEST USERS)
    // ===============================

    /**
     * Get cart by identifier (works for both authenticated and unauthenticated users)
     * Time Complexity: O(1) from cache for session carts, O(n) for user carts from DB
     */
    async getCart(identifier: string, userId?: string): Promise<CartInterface> {
        try {
            // For authenticated users, prioritize database cart
            if (userId) {
                return await this.getUserCartFromDatabase(identifier, userId);
            }

            // For guest users, use session-based cache
            return await this.getSessionCart(identifier);
        } catch (error) {
            this.logger.error(`Failed to get cart: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Add item to cart (unified for both user types)
     * Time Complexity: O(1) for most cases, O(n) worst case if no variant match
     */
    async addToCart(
        identifier: string, 
        addToCartDto: AddToCartDto, 
        userId?: string
    ): Promise<CartInterface> {
        const { productId, variantId, quantity, selectedColor, selectedSize } = addToCartDto;

        try {
            // Validate product and variant in parallel - O(1) each
            const [product, variant] = await Promise.all([
                this.validateProduct(productId),
                variantId ? this.validateVariant(variantId, productId) : null,
            ]);

            // Check stock availability
            const availableStock = variant?.stockQuantity ?? product.stockQuantity;
            if (availableStock < quantity) {
                throw new BadRequestException(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
            }

            // Get current cart
            const currentCart = await this.getCart(identifier, userId);
            
            // Check cart limits
            if (currentCart.items.length >= CART_CONSTANTS.LIMITS.MAX_ITEMS) {
                throw new BadRequestException(CART_ERROR_MESSAGES.CART_LIMIT_EXCEEDED);
            }

            // Find existing item with same attributes - O(n) worst case, typically O(1)
            const existingItem = this.findMatchingCartItem(currentCart.items, {
                productId,
                variantId,
                selectedColor,
                selectedSize,
            });

            if (existingItem) {
                // Update existing item quantity
                const newQuantity = existingItem.quantity + quantity;
                if (newQuantity > CART_CONSTANTS.LIMITS.MAX_QUANTITY_PER_ITEM) {
                    throw new BadRequestException(CART_ERROR_MESSAGES.QUANTITY_LIMIT_EXCEEDED);
                }
                
                return await this.updateCartItem(identifier, existingItem.id, { quantity: newQuantity }, userId);
            } else {
                // Add new item
                const newItem = this.createCartItemFromProduct(product, variant, addToCartDto);
                
                if (userId) {
                    // For authenticated users, save to database
                    return await this.addItemToUserCart(identifier, newItem, userId);
                } else {
                    // For guest users, save to cache
                    return await this.addItemToSessionCart(identifier, newItem);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to add to cart: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Update cart item quantity (unified for both user types)
     * Time Complexity: O(1) for update, O(n) for recalculation
     */
    async updateCartItem(
        identifier: string,
        itemId: string,
        updateDto: UpdateCartItemDto,
        userId?: string
    ): Promise<CartInterface> {
        const { quantity } = updateDto;

        try {
            const currentCart = await this.getCart(identifier, userId);
            const cartItem = currentCart.items.find(item => item.id === itemId);

            if (!cartItem) {
                throw new NotFoundException(CART_ERROR_MESSAGES.ITEM_NOT_FOUND);
            }

            // Validate quantity limits
            if (quantity > CART_CONSTANTS.LIMITS.MAX_QUANTITY_PER_ITEM) {
                throw new BadRequestException(CART_ERROR_MESSAGES.QUANTITY_LIMIT_EXCEEDED);
            }

            if (quantity <= 0) {
                throw new BadRequestException('Quantity must be greater than 0');
            }

            // Validate stock availability
            const [product, variant] = await Promise.all([
                this.validateProduct(cartItem.productId),
                cartItem.variantId ? this.validateVariant(cartItem.variantId, cartItem.productId) : null,
            ]);

            const availableStock = variant?.stockQuantity ?? product.stockQuantity;
            if (availableStock < quantity) {
                throw new BadRequestException(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
            }

            if (userId) {
                // Update in database for authenticated users
                return await this.updateUserCartItem(identifier, itemId, quantity, userId);
            } else {
                // Update in cache for guest users
                return await this.updateSessionCartItem(identifier, itemId, quantity);
            }
        } catch (error) {
            this.logger.error(`Failed to update cart item: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Remove item from cart (unified for both user types)
     * Time Complexity: O(n) for finding item, O(n) for recalculation
     */
    async removeCartItem(identifier: string, itemId: string, userId?: string): Promise<CartInterface> {
        try {
            const currentCart = await this.getCart(identifier, userId);
            const itemExists = currentCart.items.some(item => item.id === itemId);

            if (!itemExists) {
                throw new NotFoundException(CART_ERROR_MESSAGES.ITEM_NOT_FOUND);
            }

            if (userId) {
                // Remove from database for authenticated users
                return await this.removeUserCartItem(identifier, itemId, userId);
            } else {
                // Remove from cache for guest users
                return await this.removeSessionCartItem(identifier, itemId);
            }
        } catch (error) {
            this.logger.error(`Failed to remove cart item: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Clear entire cart (unified for both user types)
     * Time Complexity: O(1) for cache, O(n) for database
     */
    async clearCart(identifier: string, userId?: string): Promise<void> {
        try {
            if (userId) {
                // Clear from database for authenticated users
                await this.clearUserCart(userId);
            } else {
                // Clear from cache for guest users
                await this.clearCartCache(identifier);
            }
            
            this.logger.log(`Cart cleared for identifier: ${identifier}`);
        } catch (error) {
            this.logger.error(`Failed to clear cart: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get cart item count (unified for both user types)
     * Time Complexity: O(1) from cache or summary
     */
    async getCartItemCount(identifier: string, userId?: string): Promise<number> {
        try {
            const cart = await this.getCart(identifier, userId);
            return cart.summary.itemCount;
        } catch (error) {
            this.logger.error(`Failed to get cart item count: ${error.message}`);
            return 0;
        }
    }

    // ===============================
    // AUTHENTICATION-SPECIFIC METHODS
    // ===============================

    /**
     * Merge session cart with user cart after authentication
     * This transfers the session cart to user's permanent cart
     * Time Complexity: O(n) where n = cart items
     */
    async mergeSessionCartWithUserCart(sessionId: string, userId: string): Promise<CartInterface> {
        try {
            const sessionCart = await this.getSessionCart(sessionId);
            
            if (sessionCart.items.length === 0) {
                // No items to merge, return user's existing cart
                return await this.getUserCartFromDatabase(`user_${userId}`, userId);
            }

            // Get existing user cart from database (if any)
            const existingUserItems = await this.prisma.cartItem.findMany({
                where: { userId },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            featuredImage: true,
                            isActive: true,
                            stockQuantity: true,
                            price: true,
                            discountPercentage: true,
                        },
                    },
                    variant: {
                        select: {
                            id: true,
                            color: true,
                            size: true,
                            price: true,
                            stockQuantity: true,
                            isActive: true,
                        },
                    },
                },
            });

            // Process merge operations
            const mergeOperations: Promise<any>[] = [];

            for (const sessionItem of sessionCart.items) {
                // Find matching user cart item
                const existingUserItem = existingUserItems.find(userItem =>
                    this.isMatchingCartItem(
                        {
                            productId: userItem.productId,
                            variantId: userItem.variantId,
                            selectedColor: userItem.selectedColor,
                            selectedSize: userItem.selectedSize as Size,
                        } as CartItemInterface,
                        {
                            productId: sessionItem.productId,
                            variantId: sessionItem.variantId,
                            selectedColor: sessionItem.selectedColor,
                            selectedSize: sessionItem.selectedSize,
                        }
                    )
                );

                if (existingUserItem) {
                    // Merge quantities
                    const newQuantity = Math.min(
                        existingUserItem.quantity + sessionItem.quantity,
                        CART_CONSTANTS.LIMITS.MAX_QUANTITY_PER_ITEM
                    );

                    mergeOperations.push(
                        this.prisma.cartItem.update({
                            where: { id: existingUserItem.id },
                            data: {
                                quantity: newQuantity,
                                totalPrice: newQuantity * existingUserItem.unitPrice,
                                updatedAt: new Date(),
                            },
                        })
                    );
                } else {
                    // Add as new item
                    mergeOperations.push(
                        this.prisma.cartItem.create({
                            data: {
                                userId,
                                productId: sessionItem.productId,
                                variantId: sessionItem.variantId,
                                quantity: sessionItem.quantity,
                                selectedColor: sessionItem.selectedColor,
                                selectedSize: sessionItem.selectedSize,
                                unitPrice: sessionItem.unitPrice,
                                totalPrice: sessionItem.totalPrice,
                            },
                        })
                    );
                }
            }

            // Execute all merge operations
            await Promise.all(mergeOperations);

            // Clear session cart after successful merge
            await this.clearCartCache(sessionId);

            // Return the merged user cart
            const mergedCart = await this.getUserCartFromDatabase(`user_${userId}`, userId);
            
            this.logger.log(`Merged session cart ${sessionId} with user cart ${userId}`);
            return mergedCart;
        } catch (error) {
            this.logger.error(`Failed to merge cart: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Validate cart before checkout - REQUIRES AUTHENTICATION
     * Time Complexity: O(n) where n = cart items
     */
    async validateCartForCheckout(identifier: string, userId: string): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
        requiresAuthentication?: boolean;
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const cart = await this.getCart(identifier, userId);

            if (cart.items.length === 0) {
                errors.push('Cart is empty');
                return { isValid: false, errors, warnings };
            }

            // Validate each item in parallel
            const validationPromises = cart.items.map(async (item) => {
                const itemErrors: string[] = [];
                const itemWarnings: string[] = [];

                // Re-validate from database for accurate stock levels
                const [currentProduct, currentVariant] = await Promise.all([
                    this.prisma.product.findUnique({
                        where: { id: item.productId },
                        select: { isActive: true, stockQuantity: true, name: true },
                    }),
                    item.variantId ? this.prisma.productVariant.findUnique({
                        where: { id: item.variantId },
                        select: { isActive: true, stockQuantity: true },
                    }) : null,
                ]);

                if (!currentProduct?.isActive) {
                    itemErrors.push(`Product "${item.product.name}" is no longer available`);
                    return { errors: itemErrors, warnings: itemWarnings };
                }

                if (currentVariant && !currentVariant.isActive) {
                    itemErrors.push(`Variant for "${item.product.name}" is no longer available`);
                    return { errors: itemErrors, warnings: itemWarnings };
                }

                // Check current stock levels
                const availableStock = currentVariant?.stockQuantity ?? currentProduct.stockQuantity;
                if (availableStock < item.quantity) {
                    if (availableStock === 0) {
                        itemErrors.push(`"${item.product.name}" is out of stock`);
                    } else {
                        itemWarnings.push(
                            `Only ${availableStock} units of "${item.product.name}" available, but ${item.quantity} requested`
                        );
                    }
                }

                return { errors: itemErrors, warnings: itemWarnings };
            });

            const results = await Promise.all(validationPromises);
            
            results.forEach(result => {
                errors.push(...result.errors);
                warnings.push(...result.warnings);
            });

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        } catch (error) {
            this.logger.error(`Cart validation failed: ${error.message}`, error.stack);
            return {
                isValid: false,
                errors: ['Cart validation failed'],
                warnings: [],
            };
        }
    }

    // ===============================
    // PRIVATE HELPER METHODS - SESSION CART MANAGEMENT
    // ===============================

    /**
     * Get session-based cart from cache
     */
    private async getSessionCart(identifier: string): Promise<CartInterface> {
        const cacheKey = this.generateCacheKey(identifier);

        let cart = await this.cache.get<CartInterface>(cacheKey);
        
        if (!cart) {
            // Initialize empty cart
            cart = {
                sessionId: identifier,
                items: [],
                summary: this.createEmptyCartSummary(),
                lastModified: new Date(),
            };

            await this.cache.set(cacheKey, cart, {
                ttl: CART_CONSTANTS.CACHE_TTL.GUEST_CART,
            });
        }

        return cart;
    }

    /**
     * Add item to session cart
     */
    private async addItemToSessionCart(identifier: string, newItem: CartItemInterface): Promise<CartInterface> {
        const currentCart = await this.getSessionCart(identifier);
        currentCart.items.push(newItem);
        
        const updatedCart = this.calculateCartTotals(currentCart);
        await this.updateCartCache(identifier, updatedCart);
        
        return updatedCart;
    }

    /**
     * Update session cart item quantity
     */
    private async updateSessionCartItem(identifier: string, itemId: string, quantity: number): Promise<CartInterface> {
        const currentCart = await this.getSessionCart(identifier);
        const itemIndex = currentCart.items.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) {
            throw new NotFoundException(CART_ERROR_MESSAGES.ITEM_NOT_FOUND);
        }

        // Update item quantity and recalculate price
        currentCart.items[itemIndex].quantity = quantity;
        currentCart.items[itemIndex].totalPrice = quantity * currentCart.items[itemIndex].unitPrice;
        
        // Recalculate totals and update cache
        const updatedCart = this.calculateCartTotals(currentCart);
        await this.updateCartCache(identifier, updatedCart);
        
        return updatedCart;
    }

    /**
     * Remove item from session cart
     */
    private async removeSessionCartItem(identifier: string, itemId: string): Promise<CartInterface> {
        const currentCart = await this.getSessionCart(identifier);
        const itemIndex = currentCart.items.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
            throw new NotFoundException(CART_ERROR_MESSAGES.ITEM_NOT_FOUND);
        }

        // Remove item and recalculate
        currentCart.items.splice(itemIndex, 1);
        const updatedCart = this.calculateCartTotals(currentCart);
        await this.updateCartCache(identifier, updatedCart);
        
        return updatedCart;
    }

    // ===============================
    // PRIVATE HELPER METHODS - USER CART MANAGEMENT
    // ===============================

    /**
     * Get authenticated user cart from database
     */
    private async getUserCartFromDatabase(identifier: string, userId: string): Promise<CartInterface> {
        // Get cart items from database
        const cartItems = await this.prisma.cartItem.findMany({
            where: { userId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        featuredImage: true,
                        isActive: true,
                        stockQuantity: true,
                        price: true,
                        discountPercentage: true,
                    },
                },
                variant: {
                    select: {
                        id: true,
                        color: true,
                        size: true,
                        price: true,
                        stockQuantity: true,
                        isActive: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        // Transform to interface format
        const items: CartItemInterface[] = cartItems.map(item => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize as Size,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            product: item.product,
            variant: item.variant,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        }));

        // Create cart and calculate totals
        const cart: CartInterface = {
            sessionId: identifier,
            userId,
            items,
            summary: this.createEmptyCartSummary(),
            lastModified: new Date(),
        };

        return this.calculateCartTotals(cart);
    }

    /**
     * Add item to user cart in database
     */
    private async addItemToUserCart(identifier: string, newItem: CartItemInterface, userId: string): Promise<CartInterface> {
        // Create in database
        await this.prisma.cartItem.create({
            data: {
                userId,
                productId: newItem.productId,
                variantId: newItem.variantId,
                quantity: newItem.quantity,
                selectedColor: newItem.selectedColor,
                selectedSize: newItem.selectedSize,
                unitPrice: newItem.unitPrice,
                totalPrice: newItem.totalPrice,
            },
        });

        // Return updated cart from database
        return await this.getUserCartFromDatabase(identifier, userId);
    }

    /**
     * Update user cart item in database
     */
    private async updateUserCartItem(identifier: string, itemId: string, quantity: number, userId: string): Promise<CartInterface> {
        // Find the cart item
        const cartItem = await this.prisma.cartItem.findFirst({
            where: { 
                id: itemId, 
                userId 
            },
        });

        if (!cartItem) {
            throw new NotFoundException(CART_ERROR_MESSAGES.ITEM_NOT_FOUND);
        }

        // Update in database
        await this.prisma.cartItem.update({
            where: { id: itemId },
            data: {
                quantity,
                totalPrice: quantity * cartItem.unitPrice,
                updatedAt: new Date(),
            },
        });

        // Return updated cart from database
        return await this.getUserCartFromDatabase(identifier, userId);
    }

    /**
     * Remove item from user cart in database
     */
    private async removeUserCartItem(identifier: string, itemId: string, userId: string): Promise<CartInterface> {
        // Delete from database
        await this.prisma.cartItem.deleteMany({
            where: { 
                id: itemId, 
                userId 
            },
        });

        // Return updated cart from database
        return await this.getUserCartFromDatabase(identifier, userId);
    }

    /**
     * Clear user cart from database
     */
    private async clearUserCart(userId: string): Promise<void> {
        await this.prisma.cartItem.deleteMany({
            where: { userId },
        });
    }

    // ===============================
    // PRIVATE HELPER METHODS - SHARED UTILITIES
    // ===============================

    /**
     * Calculate cart totals automatically
     * Time Complexity: O(n)
     */
    private calculateCartTotals(cart: CartInterface): CartInterface {
        let itemCount = 0;
        let totalQuantity = 0;
        let subtotal = 0;
        let discountAmount = 0;

        // Calculate item-level totals
        cart.items.forEach(item => {
            itemCount++;
            totalQuantity += item.quantity;
            subtotal += item.totalPrice;

            // Calculate discount if product has discount percentage
            if (item.product.discountPercentage && item.product.discountPercentage > 0) {
                const itemDiscount = (item.product.price * item.product.discountPercentage / 100) * item.quantity;
                discountAmount += itemDiscount;
            }
        });

        // Calculate tax (configurable)
        const taxRate = 0.08; // 8% tax rate
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;

        // Calculate shipping (configurable)
        const shippingCost = subtotal > 50 ? 0 : 5.99; // Free shipping over $50

        // Final total
        const totalAmount = subtotal - discountAmount + taxAmount + shippingCost;

        const summary: CartSummaryInterface = {
            itemCount,
            totalQuantity,
            subtotal: Math.round(subtotal * 100) / 100,
            discountAmount: Math.round(discountAmount * 100) / 100,
            taxAmount,
            shippingCost,
            totalAmount: Math.round(totalAmount * 100) / 100,
            currency: 'USD',
        };

        return {
            ...cart,
            summary,
            lastModified: new Date(),
        };
    }

    /**
     * Generate cache key for cart
     */
    private generateCacheKey(identifier: string): any {
        return {
            type: CacheKeyType.CART_DATA,
            identifier,
        };
    }

    /**
     * Update cart cache
     */
    private async updateCartCache(identifier: string, cart: CartInterface): Promise<void> {
        const cacheKey = this.generateCacheKey(identifier);
        await this.cache.set(cacheKey, cart, { 
            ttl: CART_CONSTANTS.CACHE_TTL.GUEST_CART 
        });
    }

    /**
     * Clear cart cache
     */
    private async clearCartCache(identifier: string): Promise<void> {
        const cacheKey = this.generateCacheKey(identifier);
        await this.cache.del(cacheKey);
    }

    /**
     * Validate product exists and is active
     */
    private async validateProduct(productId: string) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                stockQuantity: true,
                isActive: true,
                discountPercentage: true,
                featuredImage: true,
            },
        });

        if (!product) {
            throw new NotFoundException(CART_ERROR_MESSAGES.PRODUCT_NOT_FOUND);
        }

        if (!product.isActive) {
            throw new BadRequestException(CART_ERROR_MESSAGES.PRODUCT_INACTIVE);
        }

        return product;
    }

    /**
     * Validate product variant exists and is active
     */
    private async validateVariant(variantId: string, productId: string) {
        const variant = await this.prisma.productVariant.findFirst({
            where: { 
                id: variantId,
                productId,
            },
            select: {
                id: true,
                color: true,
                size: true,
                price: true,
                stockQuantity: true,
                isActive: true,
            },
        });

        if (!variant) {
            throw new NotFoundException(CART_ERROR_MESSAGES.VARIANT_NOT_FOUND);
        }

        if (!variant.isActive) {
            throw new BadRequestException(CART_ERROR_MESSAGES.VARIANT_INACTIVE);
        }

        return variant;
    }

    /**
     * Find matching cart item with same attributes
     */
    private findMatchingCartItem(
        items: CartItemInterface[],
        attributes: {
            productId: string;
            variantId?: string;
            selectedColor?: string;
            selectedSize?: Size;
        }
    ): CartItemInterface | undefined {
        return items.find(item => this.isMatchingCartItem(item, attributes));
    }

    /**
     * Check if cart item matches given attributes
     */
    private isMatchingCartItem(
        item: CartItemInterface,
        attributes: {
            productId: string;
            variantId?: string;
            selectedColor?: string;
            selectedSize?: Size;
        }
    ): boolean {
        return (
            item.productId === attributes.productId &&
            item.variantId === attributes.variantId &&
            item.selectedColor === attributes.selectedColor &&
            item.selectedSize === attributes.selectedSize
        );
    }

    /**
     * Create cart item from product data
     */
    private createCartItemFromProduct(
        product: any,
        variant: any,
        addToCartDto: AddToCartDto
    ): CartItemInterface {
        const unitPrice = variant?.price ?? product.price;
        const totalPrice = unitPrice * addToCartDto.quantity;

        return {
            id: `temp_${Date.now()}_${Math.random()}`, // Temporary ID for session carts
            productId: product.id,
            variantId: variant?.id,
            quantity: addToCartDto.quantity,
            selectedColor: addToCartDto.selectedColor,
            selectedSize: addToCartDto.selectedSize,
            unitPrice,
            totalPrice,
            product: {
                id: product.id,
                name: product.name,
                slug: product.slug,
                featuredImage: product.featuredImage,
                isActive: product.isActive,
                stockQuantity: product.stockQuantity,
                price: product.price,
                discountPercentage: product.discountPercentage,
            },
            variant: variant ? {
                id: variant.id,
                color: variant.color,
                size: variant.size,
                price: variant.price,
                stockQuantity: variant.stockQuantity,
                isActive: variant.isActive,
            } : undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    /**
     * Create empty cart summary
     */
    private createEmptyCartSummary(): CartSummaryInterface {
        return {
            itemCount: 0,
            totalQuantity: 0,
            subtotal: 0,
            discountAmount: 0,
            taxAmount: 0,
            shippingCost: 0,
            totalAmount: 0,
            currency: 'USD',
        };
    }
}