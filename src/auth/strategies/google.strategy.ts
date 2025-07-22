/* eslint-disable prettier/prettier */
// src/auth/strategies/google.strategy.ts - Updated version
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { GoogleUser } from '../types/auth.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {

    private readonly logger = new Logger(GoogleStrategy.name);

    constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    ) {
    super({
        clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
        clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
        callbackURL: '/auth/google/redirect', // Match your Google Console setting
        scope: ['email', 'profile'],
    });

    // Log configuration (without secrets)
    this.logger.log('Google OAuth Strategy initialized');
    this.logger.log(`Callback URL: /auth/google/redirect`);
    }

    async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
    ): Promise<void> {
        try {
            const { id, name, emails, photos } = profile;
            // Validate required fields
        if (!emails || !emails[0] || !emails[0].value) {
        this.logger.error('No email found in Google profile');
        return done(new Error('No email provided by Google'), null);
        }

        if (!name || !name.givenName) {
        this.logger.error('No name found in Google profile');
        return done(new Error('No name provided by Google'), null);
        }

        const googleUserData = {
        googleId: id,
        email: emails[0].value,
        fullName: `${name.givenName} ${name.familyName || ''}`.trim(),
        avatarUrl: photos && photos[0] ? photos[0].value : null,
        provider: 'GOOGLE',
        };

        this.logger.log(`Validating Google user: ${googleUserData.email}`);

        const validatedUser: GoogleUser = await this.authService.validateGoogleUser(googleUserData);
    
        this.logger.log(`Google user validated successfully: ${validatedUser.email}`);
        done(null, validatedUser);

    } catch (error) {
        this.logger.error('Error validating Google user:', error);
        done(error, null);
    }
    }
}