import { resolve, dirname } from "node:path";

const storedFileNamePattern = /^[0-9a-f-]+\.(?:png|jpg|webp)$/;

/** Stored product-image content returned through the legacy public URL. */
export type StoredProductImage = {
  readonly file: Blob;
  readonly mediaType: string;
};

/** Product-image reads backed by the image directory next to SQLite. */
export type ProductImageService = {
  readonly readImage: (fileName: string) => Promise<StoredProductImage | null>;
};

/**
 * Create product-image reads for files retained from package-image storage.
 *
 * @param databasePath - Path to the backend SQLite database.
 * @returns Product-image reads scoped to the database's package-images directory.
 */
export function createProductImageService(databasePath: string): ProductImageService {
  const storageDirectory = resolve(dirname(databasePath), "package-images");

  /**
   * Read a generated image without allowing path traversal.
   *
   * @param fileName - Server-generated image file name.
   * @returns Stored image content and media type, or null when absent.
   */
  async function readImage(fileName: string): Promise<StoredProductImage | null> {
    if (!storedFileNamePattern.test(fileName)) return null;
    const file = Bun.file(resolve(storageDirectory, fileName));
    if (!await file.exists()) return null;
    return { file, mediaType: mediaTypeForFileName(fileName) };
  }

  return { readImage };
}

/**
 * Derive a response media type from a validated generated file name.
 *
 * @param fileName - Validated server-generated image file name.
 * @returns HTTP media type for the stored extension.
 */
function mediaTypeForFileName(fileName: string): string {
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
