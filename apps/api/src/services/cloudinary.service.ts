import { env } from '../env';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if all env variables are present
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Uploads a base64 image or local file path to Cloudinary.
 * @param fileData The base64 data URL or local file path
 * @returns The secure, optimized URL of the uploaded image
 */
export async function uploadToCloudinary(fileData: string): Promise<string> {
  // Safe validation check for Cloudinary credentials
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    // If not in env, check raw process.env just in case Zod failed to propagate them
    const cloudName = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn("Cloudinary configuration variables are missing. Using fallback (storing locally).");
      return fileData; // Fallback to base64 storage in database
    }

    // Initialize with direct process.env values if present
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
