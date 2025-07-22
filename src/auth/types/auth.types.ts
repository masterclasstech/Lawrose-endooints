/* eslint-disable prettier/prettier */
export interface GoogleUser {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    role: string;
    googleId?: string;
    provider: string;
    emailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
}

export interface JwtTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
        user: Partial<GoogleUser>;
        accessToken: string;
        refreshToken: string;
    };
    error?: string;
}