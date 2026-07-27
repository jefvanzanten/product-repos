import { z } from "zod/v4";

export const brandDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const createBrandRequestSchema = z.object({
  name: z.string(),
}).strict();

export type BrandDto = z.infer<typeof brandDtoSchema>;
export type CreateBrandRequest = z.infer<typeof createBrandRequestSchema>;

export const brandSelectSchema = brandDtoSchema;
export const brandInsertSchema = createBrandRequestSchema.extend({ id: z.string().uuid().optional() });
export const brandUpdateSchema = z.object({ id: z.string().uuid().optional(), name: z.string().optional() }).strict();
export type Brand = BrandDto;
export type CreateBrandInput = z.infer<typeof brandInsertSchema>;
export type UpdateBrandInput = z.infer<typeof brandUpdateSchema>;
