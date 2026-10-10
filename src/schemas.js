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

export const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(1024),
});

export const messagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z
    .string()
    .regex(/^\d{1,15}$/)
    .optional(),
});
