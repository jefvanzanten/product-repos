import { data, type LoaderFunctionArgs } from "react-router";
import { getLoggablePackages } from "../../api/calorie-tracker-api.server";
import { requireUser } from "../../auth/auth.server";
import { getProductSearchMode } from "../../domain/consumption-types";
import { readBrowserTimezone } from "../../timezone.server";

/**
 * Load recent or searched packages through a protected resource route.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  const url = new URL(request.url);
  const mode = getProductSearchMode(url.searchParams.get("query") ?? "");
  const query = mode._tag === "Search" ? mode.query : null;
  const timezone = readBrowserTimezone(request);
  if (timezone === null) return data({ ok: false as const, query, error: "Browsertijdzone ontbreekt." }, { status: 409 });
  if (mode._tag === "TooShort") return { ok: true as const, query: url.searchParams.get("query"), packages: [] };
  try {
    return {
      ok: true as const,
      query,
      packages: await getLoggablePackages(query, timezone, request),
    };
  } catch {
    return data({ ok: false as const, query, error: "Producten laden lukt niet." }, { status: 502 });
  }
}
