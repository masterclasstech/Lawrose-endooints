/* eslint-disable prettier/prettier */
import { GoogleUser } from './auth.types';

declare global {
    namespace Express {
        interface Request {
            user?: GoogleUser;
        }
    }
}

// Alternative approach: Create a custom request interface
export interface AuthenticatedRequest extends Request {
    user?: GoogleUser;
}