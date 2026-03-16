import { z } from 'zod';

export const videoProgressSchema = z.object({
  last_position_seconds: z.number().int().min(0),
  is_completed: z.boolean(),
});
