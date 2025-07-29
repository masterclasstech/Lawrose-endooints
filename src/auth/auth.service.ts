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
import { UserRole } from '@prisma/client';
import { AdminRegisterDto } from '../auth/dto/admin.reg.dto';
import { AdminLoginDto } from '../auth/dto/admin.login.dto';

interface CreateUserData {
  email: string;
  fullName: string;
  password?: string;
  phoneNumber?: string;
  role?: UserRole;
  emailVerified?: boolean;
  provider?: AuthProvider;
  isActive?: boolean;
  googleId?: string;
  avatarUrl?: string;
}

interface ValidateCredentialsOptions {
  requireAdminRole?: boolean;
  requireAdminSecret?: boolean;
  adminSecretKey?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  /**
   * Centralized user existence checker
   */
  private async checkUserExists(email: string): Promise<{ 
    exists: boolean; 
    user?: any; 
    isAdmin?: boolean; 
  }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { 
        id: true, 
        role: true, 
        email: true,
        fullName: true,
        password: true,
        emailVerified: true,
        isActive: true,
        provider: true,
        googleId: true,
        avatarUrl: true,
      },
    });

    if (!existingUser) {
      return { exists: false };
    }

    return {
      exists: true,
      user: existingUser,
      isAdmin: existingUser.role === 'ADMIN',
    };
  }

  /**
   * Centralized admin secret validation
   */
  private validateAdminSecret(adminSecretKey: string): void {
    const validAdminSecret = this.configService.get('ADMIN_CREATION_SECRET');
    if (!validAdminSecret || adminSecretKey !== validAdminSecret) {
      throw new UnauthorizedException('Invalid admin secret key. Access denied.');
    }
  }

  /**
   * Centralized credential validation
   */
  private async validateCredentials(
    email: string, 
    password: string, 
    options: ValidateCredentialsOptions = {}
  ): Promise<any> {
    const { requireAdminRole, requireAdminSecret, adminSecretKey } = options;

    // Validate admin secret if required
    if (requireAdminSecret && adminSecretKey) {
      this.validateAdminSecret(adminSecretKey);
    }

    const { exists, user } = await this.checkUserExists(email);
    
    if (!exists || !user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check admin role requirement
    if (requireAdminRole && user.role !== 'ADMIN') {
      throw new UnauthorizedException('Access denied. Admin privileges required.');
    }

    // Check account status
    if (!user.isActive) {
      const accountType = requireAdminRole ? 'Admin' : 'User';
      throw new UnauthorizedException(`${accountType} account has been deactivated`);
    }

    // Validate password
    if (!user.password) {
      if (user.provider === AuthProvider.GOOGLE) {
        throw new UnauthorizedException('This account was created with Google. Please login with Google.');
      }
      throw new UnauthorizedException('Invalid account configuration');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check email verification for regular users
    if (!requireAdminRole && !user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    return user;
  }

  /**
   * Centralized user creation - OPTIMIZED VERSION
   */
  private async createUser(userData: CreateUserData): Promise<any> {
    const {
      email,
      fullName,
      password,
      phoneNumber,
      role = UserRole.CUSTOMER,
      emailVerified = false,
      provider = AuthProvider.TRADITIONAL,
      isActive = true,
      googleId,
      avatarUrl,
    } = userData;

    const createData: any = {
      email,
      fullName,
      role,
      emailVerified,
      provider,
      isActive,
      phoneNumber,
      googleId,
      avatarUrl,
    };

    // Handle password hashing
    if (password) {
      createData.password = await bcrypt.hash(password, 12);
    }

    // Handle email verification for traditional users
    if (provider === AuthProvider.TRADITIONAL && !emailVerified) {
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);
      
      createData.emailVerificationToken = emailVerificationToken;
      createData.emailVerificationExpires = emailVerificationExpires;
    }

    // Set last login for active accounts
    if (isActive && emailVerified) {
      createData.lastLoginAt = new Date();
    }

    return this.prisma.user.create({
      data: createData,
      select: {
        id: true,
        email: true,
        fullName: true,
        emailVerified: true,
        role: true,
        isActive: true,
        createdAt: true,
        avatarUrl: true,
        googleId: true,
        provider: true,
        // Include the verification token in response for email sending
        emailVerificationToken: true,
        emailVerificationExpires: true,
      },
    });
  }

  /**
   * Centralized authentication response builder
   */
  private async buildAuthResponse(
    user: any,
    message: string,
    includeTokens: boolean = true
  ): Promise<AuthResponse> {
    let tokens: TokenResponse = { accessToken: '', refreshToken: '' };

    if (includeTokens) {
      tokens = await this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      }, user.id);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    return {
      success: true,
      message,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          emailVerified: user.emailVerified,
          //avatarUrl: user.avatarUrl,
        },
        ...(includeTokens && tokens),
      },
    };
  }

  /**
   * Centralized email sending with better error handling - OPTIMIZED VERSION
   */
  private async sendEmailSafely(
    emailType: 'verification' | 'passwordReset',
    email: string,
    token: string,
    fullName: string
  ): Promise<boolean> {
    try {
      this.logger.log(`Attempting to send ${emailType} email to: ${email}`);
      this.logger.log(`Token provided: ${token ? 'Yes' : 'No'}`);
      this.logger.log(`Full name provided: ${fullName ? 'Yes' : 'No'}`);

      const emailSent = emailType === 'verification' 
        ? await this.emailService.sendVerificationEmail(email, token, fullName)
        : await this.emailService.sendPasswordResetEmail(email, token, fullName);
      
      if (emailSent) {
        this.logger.log(`✅ ${emailType} email sent successfully to: ${email}`);
        return true;
      } else {
        this.logger.warn(`⚠️ ${emailType} email failed to send to: ${email}`);
        return false;
      }
    } catch (emailError) {
      this.logger.error(`❌ ${emailType} email service failed for: ${email}`, emailError.stack);
      return false;
    }
  }

  // ===========================================
  // PUBLIC METHODS (Refactored using DRY principles)
  // ===========================================

  /**
   * Optimized user registration with better email handling
   */
  async register(registerDto: RegisterDto): Promise<{ success: boolean; message: string; data: { user: UserResponse } }> {
    const { email, password, fullName, phoneNumber } = registerDto;

    try {
      this.logger.log(`Starting registration process for: ${email}`);

      // Check if user exists
      const { exists } = await this.checkUserExists(email);
      if (exists) {
        throw new ConflictException('User with this email already exists');
      }

      // Create user
      const user = await this.createUser({
        email,
        password,
        fullName,
        phoneNumber,
        role: UserRole.CUSTOMER,
        emailVerified: false,
        provider: AuthProvider.TRADITIONAL,
      });

      this.logger.log(`User created successfully: ${email}`);
      this.logger.log(`Email verification token generated: ${user.emailVerificationToken ? 'Yes' : 'No'}`);

      // Send verification email safely
      if (user.emailVerificationToken) {
        this.logger.log(`Attempting to send verification email...`);
        const emailSent = await this.sendEmailSafely(
          'verification', 
          email, 
          user.emailVerificationToken, 
          fullName
        );
        
        if (!emailSent) {
          this.logger.warn(`Verification email failed to send to: ${email}, but user registration was successful`);
          // Don't throw error here, user is still registered successfully
          // You might want to add a flag or notification system for failed emails
        }
      } else {
        this.logger.error(`No email verification token generated for user: ${email}`);
      }

      this.logger.log(`Registration process completed for: ${email}`);

      // Remove sensitive data from response
      const { ...userResponse } = user;

      return {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: { user: userResponse },
      };
    } catch (error) {
      this.logger.error(`Registration failed for email: ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Admin Registration
   * Creates an admin account with secret key validation
   */
  async adminRegister(adminRegisterDto: AdminRegisterDto): Promise<AuthResponse> {
    const { email, password, fullName, phoneNumber, adminSecretKey } = adminRegisterDto;

    try {
      // Validate admin secret
      this.validateAdminSecret(adminSecretKey);

      // Check if user exists
      const { exists, isAdmin } = await this.checkUserExists(email);
      if (exists) {
        const errorMessage = isAdmin 
          ? 'Admin with this email already exists'
          : 'User with this email already exists as a customer';
        throw new ConflictException(errorMessage);
      }

      // Create admin user
      const admin = await this.createUser({
        email,
        password,
        fullName,
        phoneNumber,
        role: UserRole.ADMIN,
        emailVerified: true, // Admins are auto-verified
        provider: AuthProvider.TRADITIONAL,
        isActive: true,
      });

      this.logger.log(`Admin account created successfully: ${email}`);

      return this.buildAuthResponse(
        admin, 
        'Admin account created successfully. You are now logged in.'
      );
    } catch (error) {
      this.logger.error(`Admin registration failed for email: ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Admin Login
   * Authenticates admin users with secret key validation
   */
  async adminLogin(adminLoginDto: AdminLoginDto): Promise<AuthResponse> {
    const { email, password, adminSecretKey } = adminLoginDto;

    try {
      const admin = await this.validateCredentials(email, password, {
        requireAdminRole: true,
        requireAdminSecret: true,
        adminSecretKey,
      });

      this.logger.log(`Admin logged in successfully: ${email}`);

      return this.buildAuthResponse(admin, 'Admin login successful');
    } catch (error) {
      this.logger.error(`Admin login failed for email: ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate Admin User (for guards)
   * Similar to validateUser but specifically for admin authentication
   */
  async validateAdminUser(email: string, password: string, adminSecretKey: string) {
    try {
      const admin = await this.validateCredentials(email, password, {
        requireAdminRole: true,
        requireAdminSecret: true,
        adminSecretKey,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = admin;
      return result;
    } catch (error) {
      this.logger.error(`Admin validation failed for email: ${email}`, error.stack);
      return null;
    }
  }

  /**
   * Regular user validation (for guards)
   */
  async validateUser(email: string, password: string) {
    try {
      const user = await this.validateCredentials(email, password, {
        requireAdminRole: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error(`User validation failed for email: ${email}`, error.stack);
      return null;
    }
  }

  /**
   * Regular user login
   */
  async login(user: any): Promise<AuthResponse> {
    try {
      this.logger.log(`User logged in successfully: ${user.email}`);
      return this.buildAuthResponse(user, 'Login successful');
    } catch (error) {
      this.logger.error(`Login failed for user: ${user.email}`, error.stack);
      throw error;
    }
  }

  // ===========================================
  // GOOGLE OAUTH METHODS (Unchanged but optimized)
  // ===========================================

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
        // Create new user using our centralized method
        user = await this.createUser({
          email,
          fullName,
          googleId,
          avatarUrl,
          provider: AuthProvider.GOOGLE,
          emailVerified: true,
          role: UserRole.CUSTOMER,
        });

        this.logger.log(`New Google user registered: ${email}`);
      }

      const message = user.googleId ? 'Google login successful' : 'Google account created and logged in successfully';
      return this.buildAuthResponse(user, message);
    } catch (error) {
      this.logger.error(`Google auth failed for email: ${email}`, error.stack);
      throw new InternalServerErrorException('Google authentication failed');
    }
  }

  /**
   * Validate Google user
   * This method is called by the GoogleStrategy to validate the user
   */
  async validateGoogleUser(googleUser: any) {
    try {
      // Check if user already exists
      let user = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (user) {
        // Update user with Google info if needed
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            fullName: googleUser.fullName,
            avatarUrl: googleUser.picture,
            emailVerified: true, // Google emails are verified
            // Only update if user doesn't have Google ID
            ...((!user.googleId) && { googleId: googleUser.id }),
          },
        });
      } else {
        // Create new user using our centralized method
        user = await this.createUser({
          email: googleUser.email,
          fullName: googleUser.fullName,
          avatarUrl: googleUser.picture,
          googleId: googleUser.id,
          emailVerified: true,
          provider: AuthProvider.GOOGLE,
          role: UserRole.CUSTOMER,
        });
      }

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      };
    } catch (error) {
      console.error('Error validating Google user:', error);
      throw new Error('Failed to validate Google user');
    }
  }

  // ===========================================
  // UTILITY METHODS (Optimized existing methods)
  // ===========================================

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

      this.logger.log(`Email verified and user logged in: ${updatedUser.email}`);

      return this.buildAuthResponse(
        updatedUser, 
        'Email verified successfully. You are now logged in.'
      );
    } catch (error) {
      this.logger.error(`Email verification failed for token: ${token}`, error.stack);
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

      await this.sendEmailSafely('passwordReset', email, resetToken, user.fullName);

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

      await this.sendEmailSafely('verification', email, emailVerificationToken, user.fullName);

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

  // ===========================================
  // EXISTING UTILITY METHODS (Unchanged)
  // ===========================================

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
    return this.createUser({
      googleId: data.googleId,
      email: data.email,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
      provider: data.provider as AuthProvider,
      role: data.role as UserRole,
      emailVerified: data.emailVerified,
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