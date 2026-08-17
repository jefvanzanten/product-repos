import { data, type ActionFunctionArgs } from "react-router";
import { requireUser } from "../core/presentation/auth/auth.server";
import { parseBrowserTimezone, serializeBrowserTimezone } from "../core/data/timezone.server";

/**
 * Register the validated browser timezone and trigger protected loader revalidation.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function action({ request }: ActionFunctionArgs) {
  await requireUser(request);
  const formData = await request.formData();
  const timezone = parseBrowserTimezone(formData.get("timezone"));
  if (timezone === null) {
    return data({ ok: false as const }, { status: 400 });
  }
  return data(
    { ok: true as const, timezone },
    { headers: { "Set-Cookie": serializeBrowserTimezone(timezone, request) } },
  );
}
