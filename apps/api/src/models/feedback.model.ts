import mongoose, { Schema, Document } from 'mongoose';

export interface FeedbackDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  rating: number;
  feedback: string;
  createdAt: Date;
}

const FeedbackSchema = new Schema<FeedbackDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: false,
    },
    versionKey: false,
  }
);

export const FeedbackModel = mongoose.model<FeedbackDocument>('Feedback', FeedbackSchema);
