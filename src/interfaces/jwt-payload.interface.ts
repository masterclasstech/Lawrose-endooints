/* eslint-disable prettier/prettier */
import { $Enums } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: $Enums.UserRole; // Use Prisma's generated enum
  iat?: number;
  exp?: number;
}