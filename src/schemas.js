import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  displayName: z.string().trim().min(1).max(50),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z
    .string()
    .max(254)
    .transform((email) => email.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});
