/** Minimum authenticated identity exposed beyond the Better Auth adapter. */
export type AuthenticatedPrincipal = {
  readonly userId: string;
  readonly role: string | null | undefined;
};

/** Expected outcomes of resolving request credentials against Better Auth. */
export type SessionResolution =
  | { readonly _tag: "Authenticated"; readonly principal: AuthenticatedPrincipal }
  | { readonly _tag: "Unauthenticated" }
  | { readonly _tag: "Unavailable"; readonly error: AuthenticationStoreUnavailable };

/** Classified Better Auth or persistence failure encountered during session lookup. */
export type AuthenticationStoreUnavailable = {
  readonly _tag: "AuthenticationStoreUnavailable";
  readonly operation: "resolveSession";
  readonly cause: unknown;
};

/** Create a safe classified failure while retaining its private technical cause. */
function authenticationStoreUnavailable(
  operation: AuthenticationStoreUnavailable["operation"],
  cause: unknown,
): AuthenticationStoreUnavailable {
  return { _tag: "AuthenticationStoreUnavailable", operation, cause };
}

/** Session resolution capability exposed to authentication middleware. */
export type SessionResolver = {
  readonly resolveSession: (headers: Headers) => Promise<SessionResolution>;
};

/** Create session resolution from an injected Better Auth adapter. */
export function createSessionResolver(auth: {
  readonly api: {
    readonly getSession: (input: { readonly headers: Headers }) => Promise<{
      readonly user: { readonly id: string; readonly role?: string | null };
    } | null>;
  };
}): SessionResolver {
/** Resolve an incoming request's Better Auth session into an application-owned result. */
async function resolveSession(headers: Headers): Promise<SessionResolution> {
  try {
    const session = await auth.api.getSession({ headers });
    if (session === null) return { _tag: "Unauthenticated" };
    return {
      _tag: "Authenticated",
      principal: {
        userId: session.user.id,
        role: session.user.role,
      },
    };
  } catch (cause: unknown) {
    return {
      _tag: "Unavailable",
      error: authenticationStoreUnavailable("resolveSession", cause),
    };
  }
}

  return { resolveSession };
}

/** Record one unavailable authentication dependency without exposing credentials or raw causes. */
export function reportAuthenticationStoreUnavailable(
  error: AuthenticationStoreUnavailable,
  boundary: "catalog" | "calorieTracker",
): string {
  const correlationId = crypto.randomUUID();
  console.error("Authentication store unavailable", {
    operation: error.operation,
    boundary,
    errorTag: error._tag,
    causeName: readCauseName(error.cause),
    correlationId,
  });
  return correlationId;
}

/** Project only the safe runtime name of an unknown technical cause. */
function readCauseName(cause: unknown): string {
  return cause instanceof Error && cause.name.length > 0 ? cause.name : "UnknownError";
}
