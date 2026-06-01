import { Request, Response } from 'express';
import { ApiError, ApiResponse, asyncHandler } from 'node-utils-kit';
import { FeedbackModel } from '../models/feedback.model';


export const createFeedback = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.userId) {
    throw new ApiError(401, 'Not authenticated');
  }

  const { rating, feedback } = req.body;

  if (rating === undefined || !feedback) {
    throw new ApiError(400, 'Rating and feedback are required');
  }

  const numericRating = Number(rating);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new ApiError(400, 'Rating must be a number between 1 and 5');
  }

  const entry = await FeedbackModel.create({
    userId: req.userId,
    name: req.user.name,
    email: req.user.email,
    rating: numericRating,
    feedback: feedback.trim(),
  });

  return res.status(201).json(
    new ApiResponse(201, entry, 'Feedback submitted successfully')
  );
});

export const getMyFeedbacks = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'Not authenticated');
  }

  const feedbacks = await FeedbackModel.find({ userId: req.userId }).sort({ createdAt: -1 });

  return res.json(
    new ApiResponse(200, feedbacks, 'User feedbacks fetched')
  );
});

export const updateFeedback = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'Not authenticated');
  }

  const { feedbackId } = req.params;
  const { rating, feedback } = req.body;

  if (!feedbackId) {
    throw new ApiError(400, 'Feedback ID is required');
  }

  const existingFeedback = await FeedbackModel.findById(feedbackId);
  if (!existingFeedback) {
    throw new ApiError(404, 'Feedback not found');
  }

  if (existingFeedback.userId.toString() !== req.userId) {
    throw new ApiError(403, 'Forbidden. You do not own this feedback.');
  }

  if (rating !== undefined) {
    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new ApiError(400, 'Rating must be a number between 1 and 5');
    }
    existingFeedback.rating = numericRating;
  }

  if (feedback !== undefined) {
    if (!feedback.trim()) {
      throw new ApiError(400, 'Feedback comment cannot be empty');
    }
    existingFeedback.feedback = feedback.trim();
  }

  await existingFeedback.save();

  return res.json(
    new ApiResponse(200, existingFeedback, 'Feedback updated successfully')
  );
});

export const deleteFeedback = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'Not authenticated');
  }

  const { feedbackId } = req.params;

  if (!feedbackId) {
    throw new ApiError(400, 'Feedback ID is required');
  }

  const existingFeedback = await FeedbackModel.findById(feedbackId);
  if (!existingFeedback) {
    throw new ApiError(404, 'Feedback not found');
  }

  if (existingFeedback.userId.toString() !== req.userId) {
    throw new ApiError(403, 'Forbidden. You do not own this feedback.');
  }

  await FeedbackModel.findByIdAndDelete(feedbackId);

  return res.json(
    new ApiResponse(200, null, 'Feedback deleted successfully')
  );
});
