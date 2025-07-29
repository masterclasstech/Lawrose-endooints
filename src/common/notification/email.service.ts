/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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