/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: this.configService.get('EMAIL_SERVICE'),
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, fullName: string) {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Verify Your Email - Lawrose E-commerce',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Lawrose E-commerce, ${fullName}!</h2>
          <p>Thank you for registering with us. Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            If you didn't create an account with us, please ignore this email.
          </p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, token: string, fullName: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Password Reset Request - Lawrose E-commerce',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${fullName},</p>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #f44336; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>Note:</strong> This reset link will expire in 1 hour.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }
}