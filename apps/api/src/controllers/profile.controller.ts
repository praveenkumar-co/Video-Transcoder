import { Request, Response } from 'express';
import { ApiError, ApiResponse, asyncHandler } from 'node-utils-kit';
import { UserModel } from '../models/user.model';
import { VideoModel } from '../models/video.model';
import { usernameBloom } from '../services/bloom.service';
import { uploadToCloudinary } from '../services/cloudinary.service';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }

  const userJson = req.user.toJSON();
  delete userJson.password;

  return res.json(
    new ApiResponse(200, { user: userJson }, 'User profile fetched')
  );
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.userId) {
    throw new ApiError(401, 'Not authenticated');
  }
  const { name, username, avatarUrl, role } = req.body;
  if (name) req.user.name = name;
  if (avatarUrl) {
    if (avatarUrl.startsWith('data:image/')) {
      req.user.avatarUrl = await uploadToCloudinary(avatarUrl);
    } else {
      req.user.avatarUrl = avatarUrl;
    }
  }
  if (role) {
    if (role !== 'free' && role !== 'premium') {
      throw new ApiError(400, 'Invalid role value');
    }
    req.user.role = role;
  }
  if (username) {
    const formattedUsername = username.toLowerCase().trim();
    if (formattedUsername !== req.user.username) {
      const existsInBloom = await usernameBloom.mightContain(formattedUsername);
      if (existsInBloom) {
        const exists = await UserModel.findOne({
          username: formattedUsername,
          _id: { $ne: req.userId },
        });
        if (exists) {
          throw new ApiError(400, 'Username is already taken');
        }
      }
      req.user.username = formattedUsername;
      await usernameBloom.add(formattedUsername);
    }
  }
  await req.user.save();
  const userJson = req.user.toJSON();
  delete userJson.password;
  return res.json(
    new ApiResponse(200, { user: userJson }, 'Profile updated successfully')
  );
});
export const getUserVideos = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'Not authenticated');
  }

  const videos = await VideoModel.find({ userId: req.userId }).sort({ uploadedAt: -1 });
  return res.json(
    new ApiResponse(200, videos, 'User processed videos fetched')
  );
});
