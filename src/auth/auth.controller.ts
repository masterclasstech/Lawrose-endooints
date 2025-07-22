/* eslint-disable prettier/prettier */
// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  Get,
  Query,
  Delete,

} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local.guard';
import { JwtAuthGuard } from './guards/jwt.guard';
//import { GoogleAuthGuard } from '../auth/guards/google.guard';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { LoginDto } from './dto/login.dto';
//import { GoogleAuthDto } from './dto/google-auth.dto';
import { Response } from 'express'; 
import { AuthGuard } from '@nestjs/passport';
import { Req, Res } from '@nestjs/common';
import { AuthenticatedRequest } from './types/express';
import { AuthResponse, JwtTokens } from './types/auth.types';
import { $Enums } from '@prisma/client';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle(5, 60000) // 5 requests per minute
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    schema: {
      example: {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            email: 'john.doe@example.com',
            fullName: 'John Doe',
            emailVerified: false,
            role: 'CUSTOMER',
            createdAt: '2025-01-20T10:30:00Z'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already exists',
    schema: {
      example: {
        success: false,
        message: 'User with this email already exists',
        statusCode: 409
      }
    }
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @Throttle(10, 60000) // 10 requests per minute
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto }) // Add this to specify the request body
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            email: 'john.doe@example.com',
            fullName: 'John Doe',
            role: 'CUSTOMER',
            emailVerified: true
          },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or email not verified',
    schema: {
      example: {
        success: false,
        message: 'Invalid credentials',
        statusCode: 401
      }
    }
  })
  async login(
    @Body() loginDto: LoginDto, // Add this to validate the request body
    @Request() req
  ) {
    // The LocalAuthGuard will validate credentials and attach user to req.user
    return this.authService.login(req.user);
  }


  // =====================================================
  // GOOGLE OAUTH ENDPOINTS
  // =====================================================

  @Get('google')
  @ApiOperation({ 
    summary: 'Initiate Google OAuth login',
    description: 'Redirects user to Google OAuth consent screen'
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirects to Google OAuth' 
  })
  @UseGuards(AuthGuard('google'))
  async googleAuth(): Promise<void> {
    // Initiates Google OAuth flow
    // Passport automatically handles the redirect to Google
  }

  @Get('google/redirect')
  @ApiExcludeEndpoint() // Exclude from Swagger as it's a callback URL
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: AuthenticatedRequest, 
    @Res() res: Response
  ): Promise<void> {
    try {
      const user = req.user;
      
      if (!user) {
        console.error('No user found in request after Google OAuth');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/callback?error=no_user&success=false`);
        return;
      }

      // Generate JWT tokens
      const tokens: JwtTokens = await this.authService.generateTokens(
        {
          sub: user.id,
          email: user.email,
          role: user.role as $Enums.UserRole,
        },
        user.id
      );

      // Redirect to frontend with tokens as query params
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&success=true&userId=${user.id}`;
      
      console.log(`Redirecting user ${user.email} to frontend with tokens`);
      res.redirect(redirectUrl);

    } catch (error) {
      console.error('Google OAuth error:', error);
      
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?error=auth_failed&success=false&message=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('google/status')
  @ApiOperation({
    summary: 'Check Google OAuth status',
    description: 'Returns current authentication status'
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        authenticated: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            fullName: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    }
  })
  async getAuthStatus(@Req() req: AuthenticatedRequest): Promise<AuthResponse> {
    if (req.user) {
      return {
        success: true,
        message: 'User is authenticated',
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
            fullName: req.user.fullName,
            role: req.user.role,
            avatarUrl: req.user.avatarUrl
          },
          accessToken: '', // Don't expose tokens in status check
          refreshToken: ''
        }
      };
    }

    return {
      success: false,
      message: 'User is not authenticated',
      error: 'Not authenticated'
    };
  }

  @Get('google/failure')
  @ApiOperation({
    summary: 'Google OAuth failure endpoint',
    description: 'Handles Google authentication failures'
  })
  @ApiResponse({
    status: 401,
    description: 'Google authentication failed'
  })
  async googleFailure(): Promise<AuthResponse> {
    return {
      success: false,
      message: 'Google authentication failed',
      error: 'Authentication failed'
    };
  }

  // =====================================================
  // EMAIL VERIFICATION AND PASSWORD RESET ENDPOINTS  
  // =====================================================

  @Post('verify-email')
  @Throttle(5, 60000)
  @ApiOperation({ summary: 'Verify user email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully and user logged in',
    schema: {
      example: {
        success: true,
        message: 'Email verified successfully. You are now logged in.',
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            email: 'john.doe@example.com',
            fullName: 'John Doe',
            role: 'CUSTOMER',
            emailVerified: true
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired token',
    schema: {
      example: {
        success: false,
        message: 'Invalid or expired verification token',
        statusCode: 400
      }
    }
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email via GET request (for email links)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Email verified successfully and user logged in',
    schema: {
      example: {
        success: true,
        message: 'Email verified successfully. You are now logged in.',
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            email: 'john.doe@example.com',
            fullName: 'John Doe',
            role: 'CUSTOMER',
            emailVerified: true
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  async verifyEmailGet(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @Throttle(3, 60000) // 3 requests per minute
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email sent if email exists and not verified',
    schema: {
      example: {
        success: true,
        message: 'Verification email has been sent.'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Email already verified',
    schema: {
      example: {
        success: false,
        message: 'Email is already verified',
        statusCode: 400
      }
    }
  })
  async resendVerificationEmail(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendVerificationDto.email);
  }

  @Post('forgot-password')
  @Throttle(3, 60000) // 3 requests per minute
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent',
    schema: {
      example: {
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      }
    }
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @Throttle(5, 60000)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successful',
    schema: {
      example: {
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired reset token',
    schema: {
      example: {
        success: false,
        message: 'Invalid or expired reset token',
        statusCode: 400
      }
    }
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('refresh-token')
  @Throttle(10, 60000)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
    schema: {
      example: {
        success: false,
        message: 'Invalid refresh token',
        statusCode: 401
      }
    }
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user from current device' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully',
    schema: {
      example: {
        success: true,
        message: 'Logged out successfully'
      }
    }
  })
  async logout(@Request() req, @Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(req.user.id, refreshTokenDto.refreshToken);
  }

  @Delete('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user from all devices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out from all devices successfully',
    schema: {
      example: {
        success: true,
        message: 'Logged out from all devices successfully'
      }
    }
  })
  async logoutFromAllDevices(@Request() req) {
    return this.authService.logoutFromAllDevices(req.user.id);
  }

  @Delete('cleanup-tokens')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle(1, 300000) // 1 request per 5 minutes
  @ApiOperation({ 
    summary: 'Cleanup expired tokens (Admin only)',
    description: 'This endpoint is typically used by admin or scheduled jobs to clean up expired refresh tokens'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expired tokens cleaned up successfully',
    schema: {
      example: {
        success: true,
        message: 'Cleaned up 15 expired refresh tokens',
        count: 15
      }
    }
  })
  async cleanupExpiredTokens() {
    const count = await this.authService.cleanupExpiredTokens();
    return {
      success: true,
      message: `Cleaned up ${count} expired refresh tokens`,
      count,
    };
  }
}
