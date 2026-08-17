import {
  sendBrowserBackendRequest,
  type BackendRequest,
  type BackendResponse,
  type BackendTransportFailure,
} from "@product-repos/shared/browser-backend-api";

const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;
const apiBaseUrl = typeof configuredApiUrl === "string" ? configuredApiUrl : "http://localhost:3000";

export type { BackendRequest, BackendResponse, BackendTransportFailure };

/**
 * Perform one request using the Inventory application's configured backend origin.
 *
 * @param path - Absolute backend endpoint path.
 * @param request - Request method, body and cancellation signal.
 * @returns The raw HTTP response or a transport failure.
 */
export function sendBackendRequest(path: string, request: BackendRequest): Promise<BackendResponse> {
  return sendBrowserBackendRequest(apiBaseUrl, path, request);
}
