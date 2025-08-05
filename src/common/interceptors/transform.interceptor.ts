/* eslint-disable prettier/prettier */
// src/shared/interceptors/transform.interceptor.ts

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
//import { plainToInstance } from 'class-transformer';
import { Request, Response } from 'express';

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
    path: string;
    statusCode: number;
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrevious?: boolean;
    };
}

// Alternative simpler version if you prefer less complexity
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        return next.handle().pipe(
        map((data) => ({
            success: true,
            message: 'Operation successful',
            data,
            timestamp: new Date().toISOString(),
            path: request.url,
            statusCode: response.statusCode,
        })),
        );
    }
}