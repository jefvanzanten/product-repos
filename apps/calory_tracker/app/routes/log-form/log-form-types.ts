import type { ConsumptionLog, CreateConsumptionLog, UpdateConsumptionLog } from "@product-repos/contracts/calorie-tracker";

/** Add/edit form route mode with data required for optimistic updates. */
export type LogFormMode =
  | { readonly _tag: "Create" }
  | { readonly _tag: "Edit"; readonly log: ConsumptionLog };

/** Mutation command assembled by the shared form coordinator. */
export type FormMutationInput =
  | { readonly _tag: "Create"; readonly body: CreateConsumptionLog }
  | { readonly _tag: "Edit"; readonly logId: string; readonly body: UpdateConsumptionLog };
