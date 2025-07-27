/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminLocalAuthGuard extends AuthGuard('admin-local') {
    handleRequest(err: any, user: any) {
        if (err || !user) {
        throw err || new UnauthorizedException('Invalid admin credentials or access denied');
        }
        return user;
    }
}