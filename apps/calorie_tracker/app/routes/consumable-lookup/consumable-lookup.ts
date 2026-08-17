import { data, type LoaderFunctionArgs } from "react-router";
import { getUnifiedSearch } from "../../features/consumption-logs/data/consumption-log-api.server";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { getProductSearchMode } from "../../features/consumption-logs/presentation/components/log-form/product-search";
import { readBrowserTimezone } from "../../core/data/timezone.server";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";

/**
 * Load recent or searched packages and dishes through a protected resource route.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  const url = new URL(request.url);
  const mode = getProductSearchMode(url.searchParams.get("query") ?? "");
  const query = mode.tag === "Search" ? mode.query : null;
  const timezone = readBrowserTimezone(request);
  if (timezone === null) return data({ ok: false as const, query, error: "Browsertijdzone ontbreekt." }, { status: 409 });
  if (mode.tag === "TooShort") return { ok: true as const, query: url.searchParams.get("query"), results: [] };
  try {
    return {
      ok: true as const,
      query,
      results: await getUnifiedSearch(query, createBackendRequestContext(request, timezone)),
    };
  } catch {
    return data({ ok: false as const, query, error: "Zoeken lukt niet." }, { status: 502 });
  }
}
