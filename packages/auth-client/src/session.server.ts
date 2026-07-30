/** Authenticated application user returned by the backend session endpoint. */
export type AuthenticatedUser = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: string;
};

/** Parsed backend session needed by React Router loaders. */
export type AuthenticatedSession = {
  readonly user: AuthenticatedUser;
};

/** Explicit outcomes produced while resolving an incoming request's session. */
export type SessionLookupResult =
  | { readonly _tag: "Authenticated"; readonly session: AuthenticatedSession }
  | { readonly _tag: "Unauthenticated" }
  | { readonly _tag: "Unavailable"; readonly status: number };

/** Configuration for server-side session lookup. */
export type SessionLookupOptions = {
  /** Absolute backend API URL. */
  readonly apiBaseUrl?: string;
};

/** Determine whether an unknown value is a non-null object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Parse the minimum authenticated session projection required by host applications. */
function parseSession(value: unknown): AuthenticatedSession | null {
  if (!isRecord(value) || !isRecord(value.user)) return null;
  const { id, email, name, role } = value.user;
  if (
    typeof id !== "string" ||
    typeof email !== "string" ||
    typeof name !== "string" ||
    typeof role !== "string"
  ) {
    return null;
  }
  return { user: { id, email, name, role } };
}

/** Look up the Better Auth session represented by an incoming SSR request cookie. */
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
    response = await fetch(`${apiBaseUrl}/api/auth/get-session`, {
      headers,
      signal: request.signal,
    });
  } catch {
    return { _tag: "Unavailable", status: 503 };
  }

  if (response.status === 401) return { _tag: "Unauthenticated" };
  if (!response.ok) return { _tag: "Unavailable", status: response.status };

  const body: unknown = await response.json().catch(() => null);
  if (body === null) return { _tag: "Unauthenticated" };
  const session = parseSession(body);
  return session
    ? { _tag: "Authenticated", session }
    : { _tag: "Unavailable", status: 502 };
}
