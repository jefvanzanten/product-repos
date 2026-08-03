/** Prefix an app-internal path with a public application basename. */
export function toPublicAppPath(basePath: string, internalPath: string): string {
  const normalizedBasePath = basePath.replace(/\/+$/, "");
  const normalizedInternalPath = internalPath === "/" ? "" : `/${internalPath.replace(/^\/+/, "")}`;
  return `${normalizedBasePath}${normalizedInternalPath}`;
}
