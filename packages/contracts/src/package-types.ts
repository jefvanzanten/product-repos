import { z } from "zod/v4";

/** Package-type reference value with grammatical display forms. */
export const packageTypeDtoSchema = z.object({
  id: z.number().int(),
  singularName: z.string().trim().min(1),
  pluralName: z.string().trim().min(1),
}).strict();

export type PackageTypeDto = z.infer<typeof packageTypeDtoSchema>;
