/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { WishlistResponseDto } from '../../wishlist/dto/wishlist-response.dto';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.createTransporter();
    this.verifyConnection();
  }

  private createTransporter() {
    const emailUser = this.configService.get('EMAIL_USER');
    const emailPass = this.configService.get('EMAIL_PASS');
    
    if (!emailUser || !emailPass) {
      this.logger.error('Email credentials are missing in environment variables');
      throw new Error('Email configuration is incomplete');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      
    });

    this.logger.log('Email transporter created successfully');
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified successfully');
    } catch (error) {
      this.logger.error('Email service connection failed:', error.message);
      this.logger.error('Full error:', error);
      
      // Log configuration details (without sensitive info)
      this.logger.error('Email configuration check:', {
        emailUser: this.configService.get('EMAIL_USER') ? '✓ Set' : '✗ Missing',
        emailPass: this.configService.get('EMAIL_PASS') ? '✓ Set' : '✗ Missing',
        frontendUrl: this.configService.get('FRONTEND_URL') ? '✓ Set' : '✗ Missing'
      });
    }
  }

  async sendVerificationEmail(email: string, token: string, fullName: string): Promise<boolean> {
    try {
      // Validate inputs
      if (!email || !token || !fullName) {
        this.logger.error('Missing required parameters for verification email', {
          email: email ? '✓' : '✗',
          token: token ? '✓' : '✗',
          fullName: fullName ? '✓' : '✗'
        });
        return false;
      }

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
      
      this.logger.log(`Preparing to send verification email to: ${email}`);
      this.logger.log(`Verification URL: ${verificationUrl}`);
      
      const mailOptions = {
        from: `"Lawrose E-commerce" <${this.configService.get('EMAIL_USER')}>`,
        to: email,
        subject: 'Verify Your Email - Lawrose E-commerce',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4CAF50; margin: 0;">Lawrose E-commerce</h1>
              </div>
              
              <h2 style="color: #333;">Welcome ${fullName}!</h2>
              <p style="color: #666; line-height: 1.6;">Thank you for registering with Lawrose E-commerce. To complete your registration and start shopping, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #4CAF50; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;
                          font-weight: bold; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4CAF50; background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace;">
                ${verificationUrl}
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 14px;"><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
                <p style="color: #888; font-size: 12px;">
                  If you didn't create an account with Lawrose E-commerce, please ignore this email and no account will be created.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent successfully to: ${email}`);
      this.logger.log(`Message ID: ${result.messageId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error.message);
      this.logger.error('Full email error:', error);
      
      // More detailed error logging
      if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
      }
      if (error.response) {
        this.logger.error(`SMTP Response: ${error.response}`);
      }
      
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, fullName: string): Promise<boolean> {
    try {
      // Validate inputs
      if (!email || !token || !fullName) {
        this.logger.error('Missing required parameters for password reset email', {
          email: email ? '✓' : '✗',
          token: token ? '✓' : '✗',
          fullName: fullName ? '✓' : '✗'
        });
        return false;
      }

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
      
      this.logger.log(`Preparing to send password reset email to: ${email}`);
      
      const mailOptions = {
        from: `"Lawrose E-commerce" <${this.configService.get('EMAIL_USER')}>`,
        to: email,
        subject: 'Password Reset Request - Lawrose E-commerce',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #f44336; margin: 0;">Lawrose E-commerce</h1>
              </div>
              
              <h2 style="color: #333;">Password Reset Request</h2>
              <p style="color: #666; line-height: 1.6;">Hi ${fullName},</p>
              <p style="color: #666; line-height: 1.6;">You requested to reset your password for your Lawrose E-commerce account. Click the button below to set a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #f44336; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;
                          font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #f44336; background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace;">
                ${resetUrl}
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 14px;"><strong>Important:</strong> This reset link will expire in 1 hour for security reasons.</p>
                <p style="color: #888; font-size: 12px;">
                  If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent successfully to: ${email}`);
      this.logger.log(`Message ID: ${result.messageId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error.message);
      this.logger.error('Full email error:', error);
      return false;
    }
  }

  async sendWishlistShareEmail(
    recipientEmail: string,
    senderName: string,
    senderEmail: string,
    wishlistData: WishlistResponseDto,
    message?: string
  ): Promise<boolean> {
    try {
      // Validate inputs
      if (!recipientEmail || !senderName || !senderEmail || !wishlistData) {
        this.logger.error('Missing required parameters for wishlist share email', {
          recipientEmail: recipientEmail ? '✓' : '✗',
          senderName: senderName ? '✓' : '✗',
          senderEmail: senderEmail ? '✓' : '✗',
          wishlistData: wishlistData ? '✓' : '✗'
        });
        return false;
      }

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      
      // Generate wishlist items HTML
      const wishlistItemsHtml = wishlistData.items.map(item => {
        const currentPrice = item.product.discountPercentage 
          ? item.product.price * (1 - item.product.discountPercentage / 100)
          : item.product.price;
        
        const isOnSale = item.product.discountPercentage && item.product.discountPercentage > 0;
        const productUrl = `${frontendUrl}/products/${item.product.slug}`;
        
        return `
          <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #eee; margin-bottom: 15px;">
            <div style="flex-shrink: 0; width: 80px; height: 80px; margin-right: 15px;">
              ${item.product.featuredImage 
                ? `<img src="${item.product.featuredImage}" alt="${item.product.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` 
                : `<div style="width: 100%; height: 100%; background-color: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">No Image</div>`
              }
            </div>
            <div style="flex-grow: 1;">
              <h3 style="margin: 0 0 5px 0; font-size: 16px; color: #333;">
                <a href="${productUrl}" style="color: #333; text-decoration: none;">${item.product.name}</a>
              </h3>
              <div style="margin-bottom: 8px;">
                ${isOnSale 
                  ? `<span style="color: #e74c3c; font-weight: bold; font-size: 18px;">${currentPrice.toFixed(2)}</span>
                     <span style="color: #999; text-decoration: line-through; margin-left: 8px;">${item.product.price.toFixed(2)}</span>
                     <span style="background-color: #e74c3c; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 8px;">${item.product.discountPercentage}% OFF</span>`
                  : `<span style="color: #333; font-weight: bold; font-size: 18px;">${currentPrice.toFixed(2)}</span>`
                }
              </div>
              <div style="font-size: 14px; color: #666;">
                ${item.product.colors.length > 0 ? `Colors: ${item.product.colors.join(', ')}` : ''}
                ${item.product.colors.length > 0 && item.product.sizes.length > 0 ? ' • ' : ''}
                ${item.product.sizes.length > 0 ? `Sizes: ${item.product.sizes.join(', ')}` : ''}
              </div>
              ${item.product.stockQuantity > 0 
                ? `<div style="color: #27ae60; font-size: 12px; margin-top: 5px;">✓ In Stock</div>`
                : `<div style="color: #e74c3c; font-size: 12px; margin-top: 5px;">✗ Out of Stock</div>`
              }
            </div>
          </div>
        `;
      }).join('');

      this.logger.log(`Preparing to send wishlist share email to: ${recipientEmail}`);
      
      const mailOptions = {
        from: `"Lawrose E-commerce" <${this.configService.get('EMAIL_USER')}>`,
        to: recipientEmail,
        subject: `${senderName} shared their wishlist with you - Lawrose E-commerce`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #9b59b6; margin: 0;">Lawrose E-commerce</h1>
              </div>
              
              <h2 style="color: #333; margin-bottom: 10px;">💝 Wishlist Shared!</h2>
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                <strong>${senderName}</strong> (${senderEmail}) has shared their wishlist with you!
              </p>
              
              ${message ? `
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #9b59b6; margin: 20px 0; border-radius: 5px;">
                  <p style="margin: 0; color: #495057; font-style: italic;">"${message}"</p>
                </div>
              ` : ''}
              
              <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
                <div style="display: inline-block; margin: 0 20px;">
                  <div style="font-size: 24px; font-weight: bold; color: #9b59b6;">${wishlistData.totalItems}</div>
                  <div style="font-size: 14px; color: #666;">Items</div>
                </div>
                <div style="display: inline-block; margin: 0 20px;">
                  <div style="font-size: 24px; font-weight: bold; color: #27ae60;">${wishlistData.totalValue.toFixed(2)}</div>
                  <div style="font-size: 14px; color: #666;">Total Value</div>
                </div>
              </div>
              
              <h3 style="color: #333; margin: 30px 0 20px 0; border-bottom: 2px solid #9b59b6; padding-bottom: 10px;">
                🛍️ Wishlist Items
              </h3>
              
              <div style="margin: 20px 0;">
                ${wishlistItemsHtml}
              </div>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${frontendUrl}/products" 
                   style="background-color: #9b59b6; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 25px; display: inline-block;
                          font-weight: bold; font-size: 16px;">
                  🛒 Start Shopping
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <p style="color: #888; font-size: 14px; margin-bottom: 15px;">
                  Want to create your own wishlist? Join Lawrose E-commerce today!
                </p>
                <a href="${frontendUrl}/register" 
                   style="color: #9b59b6; text-decoration: none; font-weight: bold;">
                  Create Account →
                </a>
              </div>
            </div>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Wishlist share email sent successfully to: ${recipientEmail}`);
      this.logger.log(`Message ID: ${result.messageId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to send wishlist share email to ${recipientEmail}:`, error.message);
      this.logger.error('Full wishlist email error:', error);
      return false;
    }
  }

  async sendWishlistNotificationEmail(
    userEmail: string,
    userName: string,
    notificationType: 'PRICE_DROP' | 'BACK_IN_STOCK' | 'LOW_STOCK',
    productName: string,
    productSlug: string,
    oldPrice?: number,
    newPrice?: number
  ): Promise<boolean> {
    try {
      if (!userEmail || !userName || !notificationType || !productName || !productSlug) {
        this.logger.error('Missing required parameters for wishlist notification email');
        return false;
      }

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const productUrl = `${frontendUrl}/products/${productSlug}`;
      
      let subject = '';
      let heading = '';
      let message = '';
      let buttonColor = '#9b59b6';
      let emoji = '🔔';

      switch (notificationType) {
        case 'PRICE_DROP':
          subject = `💰 Price Drop Alert: ${productName}`;
          heading = '💰 Great News! Price Dropped!';
          message = `The price for <strong>${productName}</strong> in your wishlist has dropped from <span style="text-decoration: line-through;">${oldPrice?.toFixed(2)}</span> to <span style="color: #27ae60; font-weight: bold;">${newPrice?.toFixed(2)}</span>!`;
          buttonColor = '#27ae60';
          emoji = '💰';
          break;
        case 'BACK_IN_STOCK':
          subject = `📦 Back in Stock: ${productName}`;
          heading = '📦 It\'s Back in Stock!';
          message = `Good news! <strong>${productName}</strong> from your wishlist is now back in stock. Don't wait too long - it might sell out again!`;
          buttonColor = '#3498db';
          emoji = '📦';
          break;
        case 'LOW_STOCK':
          subject = `⚠️ Low Stock Alert: ${productName}`;
          heading = '⚠️ Hurry! Almost Sold Out!';
          message = `<strong>${productName}</strong> from your wishlist is running low on stock. Grab it before it's gone!`;
          buttonColor = '#f39c12';
          emoji = '⚠️';
          break;
      }

      this.logger.log(`Preparing to send ${notificationType} notification email to: ${userEmail}`);
      
      const mailOptions = {
        from: `"Lawrose E-commerce" <${this.configService.get('EMAIL_USER')}>`,
        to: userEmail,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: ${buttonColor}; margin: 0;">Lawrose E-commerce</h1>
              </div>
              
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">${emoji}</div>
                <h2 style="color: #333; margin: 0;">${heading}</h2>
              </div>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">Hi ${userName},</p>
              <p style="color: #666; line-height: 1.6; font-size: 16px;">${message}</p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${productUrl}" 
                   style="background-color: ${buttonColor}; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 25px; display: inline-block;
                          font-weight: bold; font-size: 16px;">
                  View Product
                </a>
              </div>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${frontendUrl}/wishlist" 
                   style="color: ${buttonColor}; text-decoration: none; font-size: 14px;">
                  View Your Wishlist →
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 12px; text-align: center;">
                  You're receiving this because you have this item in your wishlist. 
                  <a href="${frontendUrl}/account/notifications" style="color: ${buttonColor};">Manage your notification preferences</a>
                </p>
              </div>
            </div>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`${notificationType} notification email sent successfully to: ${userEmail}`);
      this.logger.log(`Message ID: ${result.messageId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to send ${notificationType} notification email to ${userEmail}:`, error.message);
      this.logger.error('Full notification email error:', error);
      return false;
    }
  }

  // Test method to verify email functionality
  async testEmailConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email connection test failed:', error);
      return false;
    }
  }
}