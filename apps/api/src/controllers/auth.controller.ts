import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { ApiError, ApiResponse, asyncHandler } from 'node-utils-kit';
import { UserModel } from '../models/user.model';
import { usernameBloom } from '../services/bloom.service';

function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function verifyGoogleToken(idToken: string) {
  if (idToken.startsWith('mock-google-')) {
    const mockEmail = idToken.replace('mock-google-', '') + '@gmail.com';
    const mockName = idToken.replace('mock-google-', '').toUpperCase();
    return {
      email: mockEmail,
      name: mockName,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${mockEmail}`,
    };
  }

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!res.ok) {
      throw new ApiError(400, 'Invalid Google OAuth token');
    }
    const payload = await res.json();
    return {
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    };
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, 'Google token verification failed');
  }
}
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw new ApiError(400, 'A user with this email already exists');
  }

  const user = await UserModel.create({
    name,
    email,
    password,
    role: 'free',
  });

  const token = signToken(user._id.toString(), user.email);
  setAuthCookie(res, token);

  const userJson = user.toJSON();
  delete userJson.password;

  return res.status(201).json(
    new ApiResponse(201, { user: userJson, token }, 'Signup successful')
  );
});
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }
  const user = await UserModel.findOne({ email });
  if (!user || !user.password) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const token = signToken(user._id.toString(), user.email);
  setAuthCookie(res, token);
  const userJson = user.toJSON();
  delete userJson.password;
  return res.json(
    new ApiResponse(200, { user: userJson, token }, 'Login successful')
  );
});
export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) {
    throw new ApiError(400, 'Google idToken is required');
  }
  const payload = await verifyGoogleToken(idToken);
  let user = await UserModel.findOne({ email: payload.email });

  if (!user) {
    user = await UserModel.create({
      name: payload.name,
      email: payload.email,
      avatarUrl: payload.avatarUrl,
      role: 'free',
    });
  } else if (payload.avatarUrl && !user.avatarUrl) {
    user.avatarUrl = payload.avatarUrl;
    await user.save();
  }
  const token = signToken(user._id.toString(), user.email);
  setAuthCookie(res, token);
  const userJson = user.toJSON();
  delete userJson.password;
  return res.json(
    new ApiResponse(200, { user: userJson, token }, 'Google authentication successful')
  );
});
export const signout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.json(
    new ApiResponse(200, null, 'Signout successful')
  );
});

export const checkUsername = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) {
    throw new ApiError(400, 'Username is required');
  }

  const formattedUsername = username.toLowerCase().trim();
  const existsInBloom = await usernameBloom.mightContain(formattedUsername);

  if (!existsInBloom) {
    return res.json(
      new ApiResponse(200, { available: true }, 'Username is available')
    );
  }

  const user = await UserModel.findOne({ username: formattedUsername });
  if (user) {
    return res.json(
      new ApiResponse(200, { available: false }, 'Username is already taken')
    );
  }

  return res.json(
    new ApiResponse(200, { available: true }, 'Username is available')
  );
});

