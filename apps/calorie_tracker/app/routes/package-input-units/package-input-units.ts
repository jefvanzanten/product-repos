import { data, type LoaderFunctionArgs } from "react-router";
import { getAvailableInputUnits } from "../../api/calorie-tracker-api.server";
import { requireUser } from "../../auth/auth.server";
import { readBrowserTimezone } from "../../timezone.server";

/**
 * Load selectable input units for one active package through a protected resource route.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  const packageId = Number(params.packageId);
  if (timezone === null || !Number.isSafeInteger(packageId) || packageId < 1) {
    return data({ ok: false as const, packageId: null, error: "Ongeldige verpakking." }, { status: 400 });
  }
  try {
    return { ok: true as const, packageId, units: await getAvailableInputUnits(packageId, timezone, request) };
  } catch {
    return data({ ok: false as const, packageId, error: "Eenheden laden lukt niet." }, { status: 502 });
  }
}
