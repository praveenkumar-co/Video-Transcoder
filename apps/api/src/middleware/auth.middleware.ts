import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { ApiError, asyncHandler } from 'node-utils-kit';
import { UserModel, UserDocument } from '../models/user.model';
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
    if (req.method === 'OPTIONS') {
      next();
      return;
    }
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      throw new ApiError(401, 'Access denied. Please authenticate first.');
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as DecodedToken;
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new ApiError(401, 'Session invalid. User not found.');
      }
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
