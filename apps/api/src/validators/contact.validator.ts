import { z } from 'zod';

export const ContactRequestSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  countryCode: z.string().min(1, 'Country code is required').max(10),
  phone: z.string().min(1, 'Phone number is required').max(25),
  message: z.string().min(1, 'Message is required').max(5000),
});

export type ContactRequest = z.infer<typeof ContactRequestSchema>;
