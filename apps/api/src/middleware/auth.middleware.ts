import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { ApiError, asyncHandler } from 'node-utils-kit';
import { UserModel, UserDocument } from '../models/user.model';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      userId?: string;
    }
  }
}

interface DecodedToken {
  userId: string;
  email: string;
}

export const isAuthenticated = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    // 1. Get token from cookies or Authorization header
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Access denied. Please authenticate first.');
    }

    try {
      // 2. Verify JWT token
      const decoded = jwt.verify(token, env.JWT_SECRET) as DecodedToken;

      // 3. Find user in database
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new ApiError(401, 'Session invalid. User not found.');
      }

      // 4. Attach user object & ID to request
      req.user = user;
      req.userId = user._id.toString();

      next();
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(401, 'Authentication token is invalid or expired.');
    }
  }
);
