import { z } from "zod/v4";

export const packageTypeDtoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export type PackageTypeDto = z.infer<typeof packageTypeDtoSchema>;
