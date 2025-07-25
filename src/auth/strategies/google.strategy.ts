/* eslint-disable prettier/prettier */
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
            clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        try {
            const { id, name, emails, photos } = profile;
            const user = {
                googleId: id, // Make sure to use profile.id for googleId
                email: emails[0].value,
                firstName: name.givenName,
                lastName: name.familyName,
                fullName: `${name.givenName} ${name.familyName}`,
                picture: photos[0].value,
            };

            // Validate the user through your auth service
            const dbUser = await this.authService.validateGoogleUser(user);

            done(null, dbUser);
        } catch (error) {
            console.error('Google strategy validation error:', error);
            done(error, null);
        }
    }
}