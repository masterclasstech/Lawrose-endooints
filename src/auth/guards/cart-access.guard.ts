/* eslint-disable prettier/prettier */
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    //UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CartAccessGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user;
        const guestId = request.headers['x-guest-id'] as string;

        // User is authenticated - allow access
        if (user?.id) {
            return true;
        }

        // Guest access - must have guest ID
        if (!guestId || typeof guestId !== 'string' || guestId.trim() === '') {
            throw new BadRequestException(
                'Guest ID is required for unauthenticated cart access'
            );
        }

        // Validate guest ID format
        if (!guestId.startsWith('guest_') || guestId.length < 20) {
            throw new BadRequestException('Invalid guest ID format');
        }

        return true;
    }
}