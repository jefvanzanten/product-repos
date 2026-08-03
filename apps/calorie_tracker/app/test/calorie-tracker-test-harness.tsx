import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type {
  AvailableInputUnit,
  CalorieTrackerConsumptionType,
  ConsumptionInputMode,
  ConsumptionLog,
  DailyStatistics,
  LogList,
  PackageSearchResult,
} from "@product-repos/contracts/calorie-tracker";
import type { ReactNode } from "react";
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from "react-router";

type RequestRecord = {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
};

type PackageFixtureOptions = {
  readonly packageId?: number;
  readonly productName?: string;
  readonly consumptionType?: CalorieTrackerConsumptionType;
  readonly summary?: string;
};

type LogFixtureOptions = {
  readonly id?: string;
  readonly packageId?: number;
  readonly productName?: string;
  readonly consumptionType?: CalorieTrackerConsumptionType;
  readonly consumedAt?: string;
  readonly createdAt?: string;
  readonly quantity?: string;
  readonly inputMode?: ConsumptionInputMode;
  readonly archived?: boolean;
};

/** A manually resolved JSON response used to exercise request cancellation and stale-result protection. */
export class DeferredJsonResponse {
  readonly response: Promise<Response>;
  private resolveResponse: ((response: Response) => void) | null = null;

  /** Create an unresolved response promise. */
  constructor() {
    this.response = new Promise((resolve) => {
      this.resolveResponse = resolve;
    });
  }

  /** Resolve the pending request with a JSON protocol response. */
  resolve(body: unknown, status = 200): void {
    const resolveResponse = this.resolveResponse;
    if (resolveResponse === null) throw new Error("Deferred response was already resolved");
    this.resolveResponse = null;
    resolveResponse(createJsonResponse(body, status));
  }
}

/** A fetch-compatible in-memory HTTP adapter that keeps the real frontend response parsers active. */
export class InMemoryCalorieTrackerServer {
  readonly requests: Array<RequestRecord> = [];
  readonly unexpectedRequests: Array<string> = [];
  private readonly responses = new Map<string, Array<Promise<Response>>>();
  private originalFetch: typeof fetch | null = null;

  /** Install this server at the browser fetch boundary. */
  install(): void {
    if (this.originalFetch !== null) throw new Error("In-memory server is already installed");
    this.originalFetch = globalThis.fetch;
    globalThis.fetch = this.fetch;
  }

  /** Restore the fetch implementation that preceded this server. */
  restore(): void {
    const originalFetch = this.originalFetch;
    if (originalFetch === null) return;
    globalThis.fetch = originalFetch;
    this.originalFetch = null;
  }

  /** Queue an immediate JSON response for one exact method and API path. */
  enqueueJson(method: string, path: string, body: unknown, status = 200): void {
    this.enqueue(method, path, Promise.resolve(createJsonResponse(body, status)));
  }

  /** Queue and return a manually controlled response for one exact method and API path. */
  enqueueDeferred(method: string, path: string): DeferredJsonResponse {
    const deferred = new DeferredJsonResponse();
    this.enqueue(method, path, deferred.response);
    return deferred;
  }

  /** Return recorded requests matching one HTTP method and exact API path. */
  matchingRequests(method: string, path: string): ReadonlyArray<RequestRecord> {
    return this.requests.filter((request) => request.method === method && request.path === path);
  }

  /** Handle a browser request through the queued in-memory protocol responses. */
  readonly fetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const path = `${url.pathname}${url.search}`;
    const body = await readRequestBody(request);
    this.requests.push({ method: request.method, path, body });
    const key = createRequestKey(request.method, path);
    const queue = this.responses.get(key);
    const response = queue?.shift();
    if (response === undefined) {
      this.unexpectedRequests.push(key);
      return createJsonResponse({ code: "INTERNAL_ERROR", message: `Unexpected test request: ${key}` }, 500);
    }
    return await abortableResponse(response, request.signal);
  };

  /** Add one response promise to the queue for an exact request. */
  private enqueue(method: string, path: string, response: Promise<Response>): void {
    const key = createRequestKey(method, path);
    const queue = this.responses.get(key) ?? [];
    queue.push(response);
    this.responses.set(key, queue);
  }
}

/** Render React Router route objects with isolated query state and in-memory navigation. */
export function renderRouteTree(
  routes: ReadonlyArray<RouteObject>,
  initialEntry: string,
): RenderResult & { readonly router: ReturnType<typeof createMemoryRouter>; readonly queryClient: QueryClient } {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  const router = createMemoryRouter([...routes], { initialEntries: [initialEntry] });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}

/** Render one route component at an explicit in-memory path. */
export function renderRoute(element: ReactNode, routePath: string, initialEntry: string): ReturnType<typeof renderRouteTree> {
  return renderRouteTree([{ path: routePath, element }], initialEntry);
}

/** Build a valid active package protocol projection for route tests. */
export function createPackageFixture(options: PackageFixtureOptions = {}): PackageSearchResult {
  const packageId = options.packageId ?? 1;
  const consumptionType = options.consumptionType ?? "FOOD";
  return {
    packageId,
    productId: createUuid(packageId),
    productName: options.productName ?? "Volkoren cracker",
    displayName: options.productName ?? "Volkoren cracker",
    brand: { id: "10000000-0000-4000-8000-000000000001", name: "Testmerk" },
    consumptionType,
    packageType: { id: 1, name: "Pak" },
    contentAmount: "250",
    contentUnit: createMassUnit(),
    portion: {
      name: "Cracker",
      contentAmount: "25",
      contentUnit: createMassUnit(),
      portionsPerPackage: 10,
    },
    summary: options.summary ?? "Pak 250 g (10 × 25 g per cracker)",
    imageUrl: null,
  };
}

/** Build a valid parsed consumption-log projection, including optional archive state. */
export function createLogFixture(options: LogFixtureOptions = {}): ConsumptionLog {
  const productPackage = createPackageFixture(options);
  const inputMode = options.inputMode ?? "CONTENT_UNIT";
  const consumedAt = options.consumedAt ?? "2024-02-29T08:00:00.000Z";
  return {
    id: options.id ?? "20000000-0000-4000-8000-000000000001",
    package: {
      ...productPackage,
      productArchived: options.archived ?? false,
      packageArchived: options.archived ?? false,
    },
    quantity: options.quantity ?? "100",
    inputMode,
    inputUnitType: inputMode === "CONTENT_UNIT" ? createMassUnit() : null,
    consumedAt,
    timezone: "UTC",
    localDate: consumedAt.slice(0, 10),
    derivedQuantityLabel: "100 g",
    macroValues: { caloriesKcal: "120", proteinG: "4.5", carbohydratesG: "20", fatG: "2" },
    createdAt: options.createdAt ?? "2024-02-29T08:01:00.000Z",
    updatedAt: "2024-02-29T08:02:00.000Z",
  };
}

/** Build a valid date/filter-scoped log-list response. */
export function createLogListFixture(
  items: ReadonlyArray<ConsumptionLog>,
  type: LogList["type"] = "all",
  date = "2024-02-29",
): LogList {
  return { date, timezone: "UTC", type, items: [...items] };
}

/** Build a valid statistics response with caller-selected totals and goals. */
export function createStatisticsFixture(
  totals: DailyStatistics["totals"],
  goals: DailyStatistics["goals"] = null,
): DailyStatistics {
  return { date: "2024-02-29", timezone: "UTC", totals, goals };
}

/** Build a package-level quantity unit response. */
export function createPackageUnitFixture(label = "Hele verpakking"): AvailableInputUnit {
  return { inputMode: "PACKAGE", unitType: null, label };
}

/** Create a deterministic UUID with a valid version and variant for fixture IDs. */
function createUuid(value: number): string {
  return `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}

/** Build the shared gram unit projection used by package and log fixtures. */
function createMassUnit(): PackageSearchResult["contentUnit"] {
  return { id: 1, name: "gram", symbol: "g", dimension: "MASS", conversionToBase: "1" };
}

/** Encode an exact HTTP request queue key. */
function createRequestKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/** Return a strict JSON response for the real API parser. */
function createJsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Read a request body without consuming the request supplied to cancellation handling. */
async function readRequestBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const text = await request.clone().text();
  if (text === "") return null;
  const value: unknown = JSON.parse(text);
  return value;
}

/** Reject a queued response when its request signal is cancelled. */
async function abortableResponse(response: Promise<Response>, signal: AbortSignal): Promise<Response> {
  if (signal.aborted) throw new DOMException("Request aborted", "AbortError");
  return await new Promise<Response>((resolve, reject) => {
    /** Reject the in-memory request with the same error class as browser fetch. */
    function abort(): void {
      reject(new DOMException("Request aborted", "AbortError"));
    }
    signal.addEventListener("abort", abort, { once: true });
    void response.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (cause: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(cause);
      },
    );
  });
}
