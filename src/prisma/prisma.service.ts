/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma, OrderStatus } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'> implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
      errorFormat: 'colorless',
    });

    // Log all queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to MongoDB via Prisma');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from MongoDB');
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Clean disconnect method
   */
  async cleanUp(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use a simple query to check MongoDB connection
      await this.user.findFirst({
        select: { id: true },
        take: 1,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Transaction wrapper with error handling
   */
  async executeTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.$transaction(callback, {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      });
    } catch (error) {
      this.logger.error('Transaction failed', error);
      throw error;
    }
  }

  // ================================
  // USER MANAGEMENT METHODS
  // ================================

  /**
   * Find user by email with optional relations
   */
  async findUserByEmail(email: string, includeRelations = false) {
    return this.user.findUnique({
      where: { email },
      include: includeRelations ? {
        shippingAddresses: true,
        orders: {
          include: {
            items: true,
            payments: true,
          },
        },
        cartItems: {
          include: {
            product: true,
            variant: true,
          },
        },
        wishlistItems: {
          include: {
            product: true,
          },
        },
        reviews: true,
        ratings: true,
      } : undefined,
    });
  }

  /**
   * Find user by Google ID
   */
  async findUserByGoogleId(googleId: string) {
    return this.user.findUnique({
      where: { googleId },
    });
  }

  /**
   * Update user last login
   */
  async updateUserLastLogin(userId: string) {
    return this.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  // ================================
  // PRODUCT METHODS
  // ================================

  /**
   * Get products with filters and pagination
   */
  async getProducts(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
    include?: Prisma.ProductInclude;
  }) {
    const { skip, take, where, orderBy, include } = params;
    
    return this.product.findMany({
      skip,
      take,
      where: {
        isActive: true,
        ...where,
      },
      orderBy,
      include: include || {
        category: true,
        subcategory: true,
        collection: true,
        variants: true,
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { fullName: true, avatarUrl: true } } },
        },
        ratings: true,
      },
    });
  }

  /**
   * Get product by slug with all relations
   */
  async getProductBySlug(slug: string) {
    return this.product.findUnique({
      where: { slug, isActive: true },
      include: {
        category: true,
        subcategory: true,
        collection: true,
        variants: {
          where: { isActive: true },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: { fullName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        ratings: true,
      },
    });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 8) {
    return this.product.findMany({
      where: { isFeatured: true, isActive: true },
      take: limit,
      include: {
        category: true,
        variants: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Search products
   */
  async searchProducts(query: string, filters?: {
    categoryId?: string;
    subcategoryId?: string;
    collectionId?: string;
    gender?: string;
    minPrice?: number;
    maxPrice?: number;
    sizes?: string[];
    colors?: string[];
  }) {
    const searchWhere: Prisma.ProductWhereInput = {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ],
    };

    if (filters) {
      if (filters.categoryId) searchWhere.categoryId = filters.categoryId;
      if (filters.subcategoryId) searchWhere.subcategoryId = filters.subcategoryId;
      if (filters.collectionId) searchWhere.collectionId = filters.collectionId;
      if (filters.gender) searchWhere.gender = filters.gender as any;
      if (filters.minPrice || filters.maxPrice) {
        searchWhere.price = {};
        if (filters.minPrice) searchWhere.price.gte = filters.minPrice;
        if (filters.maxPrice) searchWhere.price.lte = filters.maxPrice;
      }
      if (filters.sizes?.length) {
        // Convert string array to Size enum array
        const validSizes = filters.sizes.filter(size => 
          ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(size)
        ) as unknown as import('@prisma/client').Size[];
        
        if (validSizes.length > 0) {
          searchWhere.sizes = { hasSome: validSizes };
        }
      }
      if (filters.colors?.length) {
        searchWhere.colors = { hasSome: filters.colors };
      }
    }

    return this.product.findMany({
      where: searchWhere,
      include: {
        category: true,
        subcategory: true,
        collection: true,
        variants: {
          where: { isActive: true },
        },
      },
    });
  }


  // ================================
  // CART METHODS
  // ================================

  /**
   * Get user's cart with all items
   */
  async getUserCart(userId: string) {
    return this.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            variants: {
              where: { isActive: true },
            },
          },
        },
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add or update cart item
   */
  async addToCart(data: {
    userId: string;
    productId: string;
    variantId?: string;
    quantity: number;
    selectedColor?: string;
    selectedSize?: string;
  }) {
    const { userId, productId, variantId, quantity, selectedColor, selectedSize } = data;

    // Get product details for pricing
    const product = await this.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product) throw new Error('Product not found');

    const variant = variantId 
      ? product.variants.find(v => v.id === variantId)
      : null;

    const unitPrice = variant?.price || product.price;
    const totalPrice = unitPrice * quantity;

    return this.cartItem.upsert({
      where: {
        userId_productId_variantId: {
          userId,
          productId,
          variantId: variantId || null,
        },
      },
      update: {
        quantity: { increment: quantity },
        totalPrice: { increment: totalPrice },
        updatedAt: new Date(),
      },
      create: {
        userId,
        productId,
        variantId,
        quantity,
        selectedColor,
        selectedSize: selectedSize as any,
        unitPrice,
        totalPrice,
      },
    });
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string) {
    return this.cartItem.deleteMany({
      where: { userId },
    });
  }

  // ================================
  // ORDER METHODS
  // ================================

  /**
   * Create order from cart
   */
  async createOrderFromCart(data: {
    userId: string;
    shippingAddressId: string;
    shippingOptionId?: string;
    paymentMethod: string;
    customerNotes?: string;
  }) {
    return this.executeTransaction(async (tx) => {
      // Get cart items
      const cartItems = await tx.cartItem.findMany({
        where: { userId: data.userId },
        include: { product: true, variant: true },
      });

      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // Get shipping cost
      let shippingCost = 0;
      if (data.shippingOptionId) {
        const shippingOption = await tx.shippingOption.findUnique({
          where: { id: data.shippingOptionId },
        });
        shippingCost = shippingOption?.baseCost || 0;
      }

      const totalAmount = subtotal + shippingCost;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: data.userId,
          shippingAddressId: data.shippingAddressId,
          shippingOptionId: data.shippingOptionId,
          subtotal,
          shippingCost,
          totalAmount,
          paymentMethod: data.paymentMethod as any,
          customerNotes: data.customerNotes,
        },
      });

      // Create order items
      const orderItems = await Promise.all(
        cartItems.map((cartItem) =>
          tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: cartItem.productId,
              variantId: cartItem.variantId,
              quantity: cartItem.quantity,
              unitPrice: cartItem.unitPrice,
              totalPrice: cartItem.totalPrice,
              productName: cartItem.product.name,
              productImage: cartItem.product.featuredImage,
              selectedColor: cartItem.selectedColor,
              selectedSize: cartItem.selectedSize,
            },
          }),
        ),
      );

      // Update product stock
      for (const cartItem of cartItems) {
        if (cartItem.variantId) {
          await tx.productVariant.update({
            where: { id: cartItem.variantId },
            data: { stockQuantity: { decrement: cartItem.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: cartItem.productId },
            data: { stockQuantity: { decrement: cartItem.quantity } },
          });
        }
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { userId: data.userId },
      });

      return { order, orderItems };
    });
  }

  /**
   * Get user orders with items
   */
  async getUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    return this.order.findMany({
      where: { userId },
      skip,
      take: limit,
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        shippingAddress: true,
        shippingOption: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get order by ID with all relations
   */
  async getOrderById(orderId: string) {
    return this.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        shippingAddress: true,
        shippingOption: true,
        payments: true,
      },
    });
  }

  // ================================
  // CATEGORY METHODS
  // ================================

  /**
   * Get all categories with subcategories
   */
  async getCategories() {
    return this.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get category by slug with products
   */
  async getCategoryBySlug(slug: string, includeProducts = false) {
    return this.category.findUnique({
      where: { slug, isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
        },
        products: includeProducts ? {
          where: { isActive: true },
          include: { variants: true },
          take: 20,
        } : false,
      },
    });
  }

  // ================================
  // REVIEW AND RATING METHODS
  // ================================

  /**
   * Create review and rating
   */
  async createReview(data: {
    userId: string;
    productId: string;
    title?: string;
    content: string;
    rating: number;
    isVerifiedPurchase?: boolean;
  }) {
    return this.executeTransaction(async (tx) => {
      // Create or update rating
      await tx.rating.upsert({
        where: {
          userId_productId: {
            userId: data.userId,
            productId: data.productId,
          },
        },
        update: { rating: data.rating },
        create: {
          userId: data.userId,
          productId: data.productId,
          rating: data.rating,
        },
      });

      // Create or update review
      return tx.review.upsert({
        where: {
          userId_productId: {
            userId: data.userId,
            productId: data.productId,
          },
        },
        update: {
          title: data.title,
          content: data.content,
          rating: data.rating,
          isVerifiedPurchase: data.isVerifiedPurchase,
        },
        create: {
          userId: data.userId,
          productId: data.productId,
          title: data.title,
          content: data.content,
          rating: data.rating,
          isVerifiedPurchase: data.isVerifiedPurchase,
        },
      });
    });
  }

  // ================================
  // ANALYTICS METHODS
  // ================================

  /**
   * Get basic dashboard stats
   */
  async getDashboardStats() {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      totalRevenue,
    ] = await Promise.all([
      this.user.count({ where: { isActive: true } }),
      this.product.count({ where: { isActive: true } }),
      this.order.count(),
      this.order.count({ where: { status: 'PENDING' } }),
      this.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: ['DELIVERED', OrderStatus.DELIVERED] } },
      }),
    ]);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
    };
  }
}