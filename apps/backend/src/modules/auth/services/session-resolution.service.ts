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

/**
 * Create a safe classified failure while retaining its private technical cause.
 *
 * @param operation - Authentication operation that could not reach its store.
 * @param cause - Private technical cause retained for safe diagnostics.
 * @returns A classified authentication-store failure.
 */
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

/**
 * Create session resolution from an injected Better Auth adapter.
 *
 * @param auth - Better Auth adapter used to resolve sessions.
 * @returns The application-owned session resolver.
 */
export function createSessionResolver(auth: {
  readonly api: {
    readonly getSession: (input: { readonly headers: Headers }) => Promise<{
      readonly user: { readonly id: string; readonly role?: string | null };
    } | null>;
  };
}): SessionResolver {
  /**
   * Resolve an incoming request's Better Auth session into an application-owned result.
   *
   * @param headers - Incoming request headers containing session credentials.
   * @returns The authenticated, unauthenticated, or unavailable session outcome.
   */
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

/**
 * Record one unavailable authentication dependency without exposing credentials or raw causes.
 *
 * @param error - Classified authentication-store failure.
 * @param boundary - Application boundary that attempted authentication.
 * @returns A generated correlation identifier for the safe client response.
 */
export function reportAuthenticationStoreUnavailable(
  error: AuthenticationStoreUnavailable,
  boundary: "catalog" | "calorieTracker" | "inventory" | "locations" | "recipes",
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

/**
 * Project only the safe runtime name of an unknown technical cause.
 *
 * @param cause - Unknown technical cause.
 * @returns A safe runtime error name.
 */
function readCauseName(cause: unknown): string {
  return cause instanceof Error && cause.name.length > 0 ? cause.name : "UnknownError";
}
