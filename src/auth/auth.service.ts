/* eslint-disable prettier/prettier */
import { 
  Injectable, 
  ConflictException, 
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../common/notification/email.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { 
  AuthResponse, 
  TokenResponse, 
  UserResponse,
  BasicResponse,
  RefreshTokenResponse 
} from '../interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ success: boolean; message: string; data: { user: UserResponse } }> {
    const { email, password, fullName, phoneNumber } = registerDto;

    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email,
          fullName,
          password: hashedPassword,
          phoneNumber,
          emailVerificationToken,
          emailVerificationExpires,
          provider: AuthProvider.TRADITIONAL,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          emailVerified: true,
          role: true,
          createdAt: true,
        },
      });

      // Send verification email
      await this.emailService.sendVerificationEmail(
        email,
        emailVerificationToken,
        fullName,
      );

      this.logger.log(`User registered successfully: ${email}`);

      return {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: { user },
      };
    } catch (error) {
      this.logger.error(`Registration failed for email: ${email}`, error.stack);
      throw error;
    }
  }

  async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            gte: new Date(),
          },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          emailVerified: true,
        },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      // Update user verification status
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          lastLoginAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          emailVerified: true,
        },
      });

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens({
        sub: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      }, updatedUser.id);

      this.logger.log(`Email verified and user logged in: ${updatedUser.email}`);

      return {
        success: true,
        message: 'Email verified successfully. You are now logged in.',
        data: {
          user: updatedUser,
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      this.logger.error(`Email verification failed for token: ${token}`, error.stack);
      throw error;
    }
  }

  async validateUser(email: string, password: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          fullName: true,
          password: true,
          emailVerified: true,
          isActive: true,
          role: true,
        },
      });

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      if (!user.emailVerified) {
        throw new UnauthorizedException('Please verify your email before logging in');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Your account has been deactivated');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error(`User validation failed for email: ${email}`, error.stack);
      throw error;
    }
  }

  async login(user: any): Promise<AuthResponse> {
    try {
      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      }, user.id);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      this.logger.log(`User logged in successfully: ${user.email}`);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            emailVerified: user.emailVerified,
          },
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      this.logger.error(`Login failed for user: ${user.email}`, error.stack);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { 
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (!storedToken.user.isActive) {
        throw new UnauthorizedException('User account is deactivated');
      }

      const newPayload: JwtPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      const newAccessToken = this.jwtService.sign(newPayload);

      this.logger.log(`Token refreshed for user: ${payload.email}`);

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken: newAccessToken },
      };
    } catch (error) {
      this.logger.error('Token refresh failed', error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(email: string): Promise<BasicResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, fullName: true },
      });

      if (!user) {
        // Don't reveal if email exists
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
        };
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      });

      await this.emailService.sendPasswordResetEmail(
        email,
        resetToken,
        user.fullName,
      );

      this.logger.log(`Password reset requested for email: ${email}`);

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      };
    } catch (error) {
      this.logger.error(`Password reset request failed for email: ${email}`, error.stack);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<BasicResponse> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gte: new Date(),
          },
        },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Use transaction to ensure data consistency
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpires: null,
          },
        }),
        // Invalidate all refresh tokens for security
        this.prisma.refreshToken.deleteMany({
          where: { userId: user.id },
        }),
      ]);

      this.logger.log(`Password reset successful for user: ${user.email}`);

      return {
        success: true,
        message: 'Password reset successful. Please login with your new password.',
      };
    } catch (error) {
      this.logger.error('Password reset failed', error.stack);
      throw error;
    }
  }

  async logout(userId: string, refreshToken: string): Promise<BasicResponse> {
    try {
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });

      this.logger.log(`User logged out: ${userId}`);

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      this.logger.error(`Logout failed for user: ${userId}`, error.stack);
      throw error;
    }
  }

  async logoutFromAllDevices(userId: string): Promise<BasicResponse> {
    try {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });

      this.logger.log(`User logged out from all devices: ${userId}`);

      return {
        success: true,
        message: 'Logged out from all devices successfully',
      };
    } catch (error) {
      this.logger.error(`Logout from all devices failed for user: ${userId}`, error.stack);
      throw error;
    }
  }

  async resendVerificationEmail(email: string): Promise<BasicResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          fullName: true,
          emailVerified: true,
        },
      });

      if (!user) {
        return {
          success: true,
          message: 'If the email exists and is not verified, a verification link has been sent.',
        };
      }

      if (user.emailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // Generate new verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken,
          emailVerificationExpires,
        },
      });

      await this.emailService.sendVerificationEmail(
        email,
        emailVerificationToken,
        user.fullName,
      );

      this.logger.log(`Verification email resent to: ${email}`);

      return {
        success: true,
        message: 'Verification email has been sent.',
      };
    } catch (error) {
      this.logger.error(`Resend verification email failed for: ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Helper method to generate access and refresh tokens
   */
  private async generateTokens(payload: JwtPayload, userId: string): Promise<TokenResponse> {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Helper method to clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error.stack);
      throw error;
    }
  }
}