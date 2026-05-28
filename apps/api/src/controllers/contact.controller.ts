import { Request, Response } from 'express';
import { asyncHandler, ApiError, ApiResponse } from 'node-utils-kit';
import { ContactRequestSchema } from '../validators/contact.validator';
import { ContactModel } from '../models/contact.model';
import { EmailService } from '../services/email.service';

export const submitContactForm = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = ContactRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      throw new ApiError(400, `Invalid input: ${errorMsg}`);
    }

    const { firstName, lastName, email, countryCode, phone, message } = parsed.data;

    const contactDoc = await ContactModel.create({
      firstName,
      lastName,
      email,
      countryCode,
      phone,
      message,
    });
    EmailService.sendContactQuery({
      firstName,
      lastName,
      email,
      countryCode,
      phone,
      message,
    }).catch((err) => {
      console.error('[ContactController] Background email dispatch failed:', err);
    });
    return res.status(201).json(
      new ApiResponse(
        201,
        { id: contactDoc._id },
        'Your query has been recorded. The support team has been notified.'
      )
    );
  }
);
