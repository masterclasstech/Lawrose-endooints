/* eslint-disable prettier/prettier */
// src/auth/strategies/admin-local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class AdminLocalStrategy extends PassportStrategy(Strategy, 'admin-local') {
    constructor(private authService: AuthService) {
        super({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true, // This allows us to access the request object
        });
    }

    async validate(req: any, email: string, password: string): Promise<any> {
        const adminSecretKey = req.body.adminSecretKey;
    
        if (!adminSecretKey) {
        throw new UnauthorizedException('Admin secret key is required');
        }

        const admin = await this.authService.validateAdminUser(email, password, adminSecretKey);
    
        if (!admin) {
        throw new UnauthorizedException('Invalid admin credentials or access denied');
        }
    
        return admin;
    }
}