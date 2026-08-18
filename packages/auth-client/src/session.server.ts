import { z } from "zod";

const authenticatedSessionSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
  }),
});

/** Authenticated application user returned by the backend session endpoint. */
export type AuthenticatedUser = z.infer<typeof authenticatedSessionSchema>["user"];

/** Parsed backend session needed by React Router loaders. */
export type AuthenticatedSession = z.infer<typeof authenticatedSessionSchema>;

/** Explicit outcomes produced while resolving an incoming request's session. */
export type SessionLookupResult =
  | { readonly tag: "Authenticated"; readonly session: AuthenticatedSession }
  | { readonly tag: "Unauthenticated" }
  | { readonly tag: "Unavailable"; readonly status: number };

/** Configuration for server-side session lookup. */
export type SessionLookupOptions = {
  /** Absolute backend API URL. */
  readonly apiBaseUrl?: string;
  /** HTTP transport, injectable for deterministic boundary tests. */
  readonly fetch?: typeof fetch;
};

/**
 * Look up the Better Auth session represented by an incoming SSR request cookie.
 *
 * @param request - Incoming application request.
 * @param options - Backend origin and optional HTTP transport.
 * @returns The classified session lookup result.
 */
export async function lookupSession(
  request: Request,
  options: SessionLookupOptions = {},
): Promise<SessionLookupResult> {
  const apiBaseUrl = (
    options.apiBaseUrl ??
    process.env.API_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(`${apiBaseUrl}/api/auth/get-session`, {
      headers,
      signal: request.signal,
    });
  } catch {
    return { tag: "Unavailable", status: 503 };
  }

  if (response.status === 401) return { tag: "Unauthenticated" };
  if (!response.ok) return { tag: "Unavailable", status: response.status };

  const body = await response.json().catch(() => null);
  if (body === null) return { tag: "Unauthenticated" };
  const session = authenticatedSessionSchema.safeParse(body);
  return session.success
    ? { tag: "Authenticated", session: session.data }
    : { tag: "Unavailable", status: 502 };
}
