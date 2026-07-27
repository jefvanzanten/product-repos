import { z } from "zod/v4";

export const categoryDtoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  parentId: z.number().int().nullable(),
});

export const createCategoryRequestSchema = z.object({
  name: z.string(),
  parentId: z.number().int().nullable().optional(),
}).strict();

export type CategoryDto = z.infer<typeof categoryDtoSchema>;
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;
