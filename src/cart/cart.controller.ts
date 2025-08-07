/* eslint-disable prettier/prettier */
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Session,
    UseGuards,
    HttpStatus,
    HttpCode,
    ValidationPipe,
    UsePipes,
    Logger,
    Request,
    Injectable,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
    ApiBearerAuth,
    ApiUnauthorizedResponse,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartInterface } from '../interfaces/cart.interface';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
//import { AuthGuard } from '@nestjs/passport';

// Define the User interface for type safety
interface AuthenticatedUser {
    id: string;
    email?: string;
    role?: string;
}

// Extend Express Request to include user property
interface RequestWithUser extends ExpressRequest {
    user?: AuthenticatedUser;
}

// Optional Auth Guard - allows both authenticated and unauthenticated access
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
    handleRequest(err: any, user: any) {
        // Return user if authenticated, null if not (but don't throw error)
        return user || null;
    }
}

@ApiTags('Cart')
@Controller('cart')
export class CartController {
    private readonly logger = new Logger(CartController.name);

    constructor(private readonly cartService: CartService) {}

    // ===============================
    // PUBLIC ENDPOINTS (UNIVERSAL ACCESS)
    // ===============================

    /**
     * Get current cart
     * Works for both authenticated and unauthenticated users
     */
    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ 
        summary: 'Get current cart',
        description: 'Retrieve the current cart contents. Works for both authenticated and guest users.' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Cart retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Cart retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        sessionId: { type: 'string' },
                        userId: { type: 'string', nullable: true },
                        items: { type: 'array' },
                        summary: {
                            type: 'object',
                            properties: {
                                itemCount: { type: 'number' },
                                totalQuantity: { type: 'number' },
                                subtotal: { type: 'number' },
                                discountAmount: { type: 'number' },
                                taxAmount: { type: 'number' },
                                shippingCost: { type: 'number' },
                                totalAmount: { type: 'number' },
                                currency: { type: 'string' },
                            }
                        },
                        lastModified: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    async getCart(
        @Session() session: Record<string, any>,
        @Request() req: RequestWithUser
    ) {
        try {
            const identifier = this.getCartIdentifier(session, req.user);
            const cart = await this.cartService.getCart(identifier, req.user?.id);
            
            this.logger.log(`Cart retrieved for identifier: ${identifier}`);
            
            return {
                success: true,
                message: 'Cart retrieved successfully',
                data: cart,
            };
        } catch (error) {
            this.logger.error(`Failed to get cart: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Add item to cart
     */
    @Post('items')
    @UseGuards(OptionalJwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    @ApiOperation({ 
        summary: 'Add item to cart',
        description: 'Add a product or variant to the shopping cart' 
    })
    @ApiBody({ type: AddToCartDto })
    @ApiResponse({ 
        status: 200, 
        description: 'Item added to cart successfully' 
    })
    @ApiBadRequestResponse({ 
        description: 'Invalid input data, insufficient stock, or cart limits exceeded' 
    })
    @ApiNotFoundResponse({ 
        description: 'Product or variant not found' 
    })
    async addToCart(
        @Body() addToCartDto: AddToCartDto,
        @Session() session: Record<string, any>,
        @Request() req: RequestWithUser
    ) {
        try {
            const identifier = this.getCartIdentifier(session, req.user);
            const cart = await this.cartService.addToCart(identifier, addToCartDto, req.user?.id);
            
            this.logger.log(`Item added to cart for identifier: ${identifier}`);
            
            return {
                success: true,
                message: 'Item added to cart successfully',
                data: cart,
            };
        } catch (error) {
            this.logger.error(`Failed to add to cart: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Update cart item quantity
     */
    @Put('items/:itemId')
    @UseGuards(OptionalJwtAuthGuard)
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    @ApiOperation({ 
        summary: 'Update cart item',
        description: 'Update the quantity of a specific cart item' 
    })
    @ApiParam({ 
        name: 'itemId', 
        description: 'Cart item ID',
        type: 'string' 
    })
    @ApiBody({ type: UpdateCartItemDto })
    @ApiResponse({ 
        status: 200, 
        description: 'Cart item updated successfully' 
    })
    @ApiBadRequestResponse({ 
        description: 'Invalid quantity or insufficient stock' 
    })
    @ApiNotFoundResponse({ 
        description: 'Cart item not found' 
    })
    async updateCartItem(
        @Param('itemId') itemId: string,
        @Body() updateDto: UpdateCartItemDto,
        @Session() session: Record<string, any>,
        @Request() req: RequestWithUser
    ) {
        try {
            const identifier = this.getCartIdentifier(session, req.user);
            const cart = await this.cartService.updateCartItem(identifier, itemId, updateDto, req.user?.id);
            
            this.logger.log(`Cart item updated for identifier: ${identifier}`);
            
            return {
                success: true,
                message: 'Cart item updated successfully',
                data: cart,
            };
        } catch (error) {
            this.logger.error(`Failed to update cart item: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Remove item from cart
     */
    @Delete('items/:itemId')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ 
        summary: 'Remove cart item',
        description: 'Remove a specific item from the cart' 
    })
    @ApiParam({ 
        name: 'itemId', 
        description: 'Cart item ID',
        type: 'string' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Item removed from cart successfully' 
    })
    @ApiNotFoundResponse({ 
        description: 'Cart item not found' 
    })
    async removeCartItem(
        @Param('itemId') itemId: string,
        @Session() session: Record<string, any>,
        @Request() req: RequestWithUser
    ) {
        try {
            const identifier = this.getCartIdentifier(session, req.user);
            const cart = await this.cartService.removeCartItem(identifier, itemId, req.user?.id);
            
            this.logger.log(`Item removed from cart for identifier: ${identifier}`);
            
            return {
                success: true,
                message: 'Item removed from cart successfully',
                data: cart,
            };
        } catch (error) {
            this.logger.error(`Failed to remove cart item: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Clear entire cart
     */
    @Delete()
    @UseGuards(OptionalJwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ 
        summary: 'Clear cart',
        description: 'Remove all items from the cart' 
    })
    @ApiResponse({ 
        status: 204, 
        description: 'Cart cleared successfully' 
    })
    async clearCart(
        @Session() session: Record<string, any>,
        @Request() req: RequestWithUser
    ) {
        try {
            const identifier = this.getCartIdentifier(session, req.user);
            await this.cartService.clearCart(identifier, req.user?.id);
            
            this.logger.log(`Cart cleared for identifier: ${identifier}`);
            
            return {
                success: true,
                message: 'Cart cleared successfully',
            };
        } catch (error) {
            this.logger.error(`Failed to clear cart: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get cart item count (for badge/indicator)
     */
    @Get('count')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ 
        summary: 'Get cart item count',
        description: 'Get the total number of items in cart for UI indicators' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Cart item count retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Cart count retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        count: { type: 'number', example: 3 }
                    }
                }
            }
        }
    })
    async getCartItemCount(
        @Session() session: Record<string, any>,
        @Request() req: RequestWithUser
    ) {
        try {
            const identifier = this.getCartIdentifier(session, req.user);
            const count = await this.cartService.getCartItemCount(identifier, req.user?.id);
            
            return {
                success: true,
                message: 'Cart count retrieved successfully',
                data: { count },
            };
        } catch (error) {
            this.logger.error(`Failed to get cart count: ${error.message}`, error.stack);
            // Return 0 count on error to prevent UI breaking
            return {
                success: false,
                message: 'Failed to get cart count',
                data: { count: 0 },
            };
        }
    }

    // ===============================
    // AUTHENTICATED ENDPOINTS
    // ===============================
    
    /**
     * Validate cart for checkout (requires authentication)
     */
    @Get('validate')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Validate cart for checkout',
        description: 'Validate cart contents before proceeding to checkout. Requires authentication.' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Cart validation completed',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        isValid: { type: 'boolean' },
                        errors: { 
                            type: 'array', 
                            items: { type: 'string' }
                        },
                        warnings: { 
                            type: 'array', 
                            items: { type: 'string' }
                        }
                    }
                }
            }
        }
    })
    @ApiUnauthorizedResponse({ 
        description: 'Authentication required for checkout' 
    })
    async validateCartForCheckout(
        @Session() session: Record<string, any>,
        @Request() req: RequestWithUser
    ) {
        try {
            if (!req.user?.id) {
                throw new Error('User authentication required');
            }

            const identifier = this.getCartIdentifier(session, req.user);
            const validation = await this.cartService.validateCartForCheckout(identifier, req.user.id);
            
            this.logger.log(`Cart validation completed for user: ${req.user.id}`);
            
            return {
                success: true,
                message: 'Cart validation completed',
                data: validation,
            };
        } catch (error) {
            this.logger.error(`Failed to validate cart: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Merge session cart with user cart (called after login)
     */
    @Post('merge')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Merge session cart with user cart',
        description: 'Merge anonymous session cart with authenticated user cart after login' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Cart merged successfully' 
    })
    @ApiUnauthorizedResponse({ 
        description: 'Authentication required' 
    })
    async mergeCart(
        @Session() session: Record<string, any>,
        @Request() req: RequestWithUser
    ) {
        try {
            if (!req.user?.id) {
                throw new Error('User authentication required');
            }

            const sessionId = this.getOrCreateSessionId(session);
            const cart = await this.cartService.mergeSessionCartWithUserCart(sessionId, req.user.id);
            
            this.logger.log(`Cart merged for user: ${req.user.id}`);
            
            return {
                success: true,
                message: 'Cart merged successfully',
                data: cart,
            };
        } catch (error) {
            this.logger.error(`Failed to merge cart: ${error.message}`, error.stack);
            throw error;
        }
    }

    // ===============================
    // PRIVATE HELPER METHODS
    // ===============================

    /**
     * Get cart identifier (user ID for authenticated users, session ID for anonymous)
     */
    private getCartIdentifier(session: Record<string, any>, user?: AuthenticatedUser): string {
        if (user?.id) {
            return `user_${user.id}`;
        }
        return this.getOrCreateSessionId(session);
    }

    /**
     * Get or create session ID
     */
    private getOrCreateSessionId(session: Record<string, any>): string {
        if (!session.cartId) {
            session.cartId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return session.cartId;
    }
}

// ===============================
// RESPONSE DTOs
// ===============================

export class CartItemCountResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
    };
}

export class CartValidationResponse {
    success: boolean;
    message: string;
    data: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
        requiresAuthentication?: boolean;
    };
}

export class CartResponse {
    success: boolean;
    message: string;
    data: CartInterface;
}

export class ErrorResponse {
    success: boolean;
    message: string;
    error?: string;
    statusCode: number;
}