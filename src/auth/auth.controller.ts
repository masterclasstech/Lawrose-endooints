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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local.guard';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RegisterDto } from './dto/register.dto';
//import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

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
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('verify-email')
  @Throttle(5, 60000)
  @ApiOperation({ summary: 'Verify user email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Email verified successfully. You can now login to your account.'
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
  @ApiResponse({ status: HttpStatus.OK, description: 'Email verified successfully' })
  async verifyEmailGet(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
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
  @ApiOperation({ summary: 'Logout user' })
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
}