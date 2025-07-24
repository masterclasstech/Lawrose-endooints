/* eslint-disable prettier/prettier */
import { 
  Injectable, 
  ConflictException, 
  UnauthorizedException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/notification/email.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { 
  AuthResponse, 
  TokenResponse, 
  UserResponse,
  BasicResponse,
  RefreshTokenResponse 
} from '../interfaces/auth-response.interface';
import { GoogleUser } from './types/auth.types';
import { UserRole } from '@prisma/client';

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

  /**
   * Google OAuth Authentication
   * Handles both registration and login for Google users
   */
  async googleAuth(googleAuthDto: GoogleAuthDto): Promise<AuthResponse> {
    const { googleId, email, fullName, avatarUrl } = googleAuthDto;

    try {
      // Check if user exists with this email
      let user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          emailVerified: true,
          isActive: true,
          provider: true,
          googleId: true,
          avatarUrl: true,
        },
      });

      if (user) {
        // User exists
        if (!user.isActive) {
          throw new UnauthorizedException('Your account has been deactivated');
        }

        // If user exists but doesn't have googleId, link the Google account
        if (!user.googleId) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              avatarUrl: avatarUrl || user.avatarUrl,
              provider: AuthProvider.GOOGLE, // Update to Google provider
              emailVerified: true, // Google accounts are pre-verified
              lastLoginAt: new Date(),
            },
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              emailVerified: true,
              avatarUrl: true,
              isActive: true,
              googleId: true,
              provider: true,
            },
          });

          this.logger.log(`Google account linked to existing user: ${email}`);
        } else {
          // Update last login and avatar if provided
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              avatarUrl: avatarUrl || user.avatarUrl,
            },
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              emailVerified: true,
              avatarUrl: true,
              isActive: true,
              googleId: true,
              provider: true,
            },
          });

          this.logger.log(`Existing Google user logged in: ${email}`);
        }
      } else {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email,
            fullName,
            googleId,
            avatarUrl,
            provider: AuthProvider.GOOGLE,
            emailVerified: true, // Google accounts are pre-verified
            lastLoginAt: new Date(),
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            emailVerified: true,
            avatarUrl: true,
            isActive: true,
            googleId: true,
            provider: true,
          },
        });

        this.logger.log(`New Google user registered: ${email}`);
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      }, user.id);

      return {
        success: true,
        message: user.googleId ? 'Google login successful' : 'Google account created and logged in successfully',
        data: {
          user,
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      this.logger.error(`Google auth failed for email: ${email}`, error.stack);
      throw new InternalServerErrorException('Google authentication failed');
    }
  }

  /**
   * Validate Google user from Passport strategy
   */
  async validateGoogleUser(googleData: any): Promise<GoogleUser> {
    try {
      // Check if user already exists (adjust method name based on your service)
      let user = await this.findByGoogleId(googleData.googleId);
    
      if (!user) {
        // Create new user if doesn't exist (adjust method name based on your service)
        user = await this.createGoogleUser({
          googleId: googleData.googleId,
          email: googleData.email,
          fullName: googleData.fullName,
          avatarUrl: googleData.avatarUrl,
          provider: googleData.provider,
          // Add other required fields based on your GoogleUser interface
          role: 'CUSTOMER', // or whatever default role you want
          emailVerified: true, // Fixed property name - Google emails are pre-verified
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Update existing user info if needed
          user = await this.updateUser(user.id, {
            fullName: googleData.fullName,
            avatarUrl: googleData.avatarUrl,
            updatedAt: new Date(),
          });
      }

      // Return the user object that matches GoogleUser interface
      return {
        id: user.id,
        googleId: user.googleId,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        role: user.role,
        emailVerified: user.emailVerified, 
        isActive: user.isActive, 
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt, 
        
      };

    } catch (error) {
      this.logger.error('Error validating Google user:', error);
      throw error;
    }
  } 

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string) {
    return this.prisma.user.findFirst({
      where: { googleId },
    });
  }

  /**
   * Create a new Google user
   */
  async createGoogleUser(data: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    provider: string;
    role: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return this.prisma.user.create({
      data: {
        googleId: data.googleId,
        email: data.email,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        provider: data.provider as AuthProvider,
        role: data.role as UserRole,
        emailVerified: data.emailVerified,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  /**
   * Update user by ID
   */
  async updateUser(userId: string, data: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
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
          provider: true,
        },
      });

      if (!user || !user.password) {
        return null;
      }

      // Check if user registered with Google
      if (user.provider === AuthProvider.GOOGLE && !user.password) {
        throw new UnauthorizedException('This account was created with Google. Please login with Google.');
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
        select: { 
          id: true, 
          fullName: true,
          provider: true,
        },
      });

      if (!user) {
        // Don't reveal if email exists
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
        };
      }

      // Check if user registered with Google
      if (user.provider === AuthProvider.GOOGLE) {
        throw new BadRequestException('This account was created with Google. Please login with Google instead.');
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
        select: { 
          id: true, 
          email: true,
          provider: true,
        },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Check if user registered with Google
      if (user.provider === AuthProvider.GOOGLE) {
        throw new BadRequestException('This account was created with Google. Password reset is not applicable.');
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
          provider: true,
        },
      });

      if (!user) {
        return {
          success: true,
          message: 'If the email exists and is not verified, a verification link has been sent.',
        };
      }

      if (user.provider === AuthProvider.GOOGLE) {
        throw new BadRequestException('Google accounts are automatically verified');
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
  public async generateTokens(payload: JwtPayload, userId: string): Promise<TokenResponse> {
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