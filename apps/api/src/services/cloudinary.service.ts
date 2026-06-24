import { env } from '../env';
import { v2 as cloudinary } from 'cloudinary';

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}
export async function uploadToCloudinary(fileData: string): Promise<string> {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    const cloudName = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn("Cloudinary configuration variables are missing.");
      return fileData; 
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }
  try {
    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      folder: 'videoforge_avatars',
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
      transformation: [
        { width: 150, height: 150, crop: 'thumb', gravity: 'face' }
      ]
    });
    return uploadResponse.secure_url;
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload profile picture: " + (error.message || error));
  }
}
