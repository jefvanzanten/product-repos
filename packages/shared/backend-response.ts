/**
 * Read an untrusted JSON response without asserting its protocol shape.
 *
 * @param response - Backend response.
 * @returns Parsed JSON or null for an invalid response body.
 */
export async function readUnknownJson(response: Response): Promise<unknown> {
  try {
    const value: unknown = await response.json();
    return value;
  } catch {
    return null;
  }
}
