import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1),
  bio: z.string().optional(),
  location: z.string().optional(),
  isPrivate: z.boolean().default(false),
  formation: z.string().default('4-4-2')
})

export const updateTeamSchema = createTeamSchema.partial()
