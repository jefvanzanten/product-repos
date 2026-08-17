import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { getAvailableInputUnits } from "../../features/consumption-logs/data/consumption-log-api.server";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { readBrowserTimezone } from "../../core/data/timezone.server";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";

/**
 * Load valid quantity units for one selected concrete product.
 *
 * @param properties - Route loader arguments.
 * @returns Product unit options or a safe resource-route failure.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  const productId = params.productId;
  if (timezone === null || productId === undefined) {
    return data({ ok: false as const, productId: null, error: "Ongeldig product." }, { status: 400 });
  }
  try {
    return { ok: true as const, productId, units: await getAvailableInputUnits(productId, createBackendRequestContext(request, timezone)) };
  } catch {
    return data({ ok: false as const, productId, error: "Eenheden laden lukt niet." }, { status: 502 });
  }
}
