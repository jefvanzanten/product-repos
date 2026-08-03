import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { createPackageImageService } from "../src/modules/catalog/services/package-image.service.ts";

const temporaryDirectories: string[] = [];
const validPngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

/**
 * Create an isolated package-image service for one test.
 *
 * @returns Package-image service backed by a temporary directory.
 */
async function createTestService() {
  const directory = await mkdtemp(join(tmpdir(), "package-images-"));
  temporaryDirectories.push(directory);
  return createPackageImageService(join(directory, "catalog.sqlite"), "https://api.example.test/");
}

describe("package image storage", () => {
  it("stores and serves PNG content under a generated immutable URL", async () => {
    const service = await createTestService();
    const png = new File([validPngBytes], "misleading.jpg", { type: "image/jpeg" });

    const stored = await service.storeImage(png);

    expect(stored.ok).toBe(true);
    if (!stored.ok) throw new Error("PNG upload should succeed");
    expect(stored.imageUrl).toMatch(/^https:\/\/api\.example\.test\/package-images\/[0-9a-f-]+\.png$/);
    const fileName = stored.imageUrl.split("/").at(-1);
    if (fileName === undefined) throw new Error("Stored URL should contain a file name");
    const read = await service.readImage(fileName);
    expect(read?.mediaType).toBe("image/png");
    expect(read?.file.size).toBe(validPngBytes.byteLength);
  });

  it("rejects truncated and unsupported content even when its declared MIME type is an image", async () => {
    const service = await createTestService();
    const truncatedPng = new File([validPngBytes.subarray(0, 9)], "truncated.png", { type: "image/png" });
    const fakeImage = new File(["not an image"], "fake.png", { type: "image/png" });

    expect(await service.storeImage(truncatedPng)).toEqual({ ok: false, message: "Gebruik een geldige PNG-, JPEG- of WebP-afbeelding." });
    expect(await service.storeImage(fakeImage)).toEqual({ ok: false, message: "Gebruik een geldige PNG-, JPEG- of WebP-afbeelding." });
  });

  it("deletes only images managed by the service", async () => {
    const service = await createTestService();
    const stored = await service.storeImage(new File([validPngBytes], "package.png", { type: "image/png" }));
    if (!stored.ok) throw new Error("PNG upload should succeed");
    const fileName = stored.imageUrl.split("/").at(-1);
    if (fileName === undefined) throw new Error("Stored URL should contain a file name");

    await service.deleteImage("https://external.example.test/package.png");
    expect(await service.readImage(fileName)).not.toBeNull();
    await service.deleteImage(stored.imageUrl);
    expect(await service.readImage(fileName)).toBeNull();
  });
});
