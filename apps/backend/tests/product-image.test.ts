import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { createProductImageService } from "../src/modules/catalog/services/product-image.service.ts";

const temporaryDirectories: string[] = [];
const validPngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

/**
 * Create isolated retained product-image storage for one test.
 *
 * @returns Product-image service, storage path, and a valid generated file name.
 */
async function createTestService() {
  const directory = await mkdtemp(join(tmpdir(), "product-images-"));
  const storageDirectory = join(directory, "package-images");
  const fileName = "7a93b1d8-0765-4858-8639-b5c713f8717a.png";
  temporaryDirectories.push(directory);
  await mkdir(storageDirectory);
  await Bun.write(join(storageDirectory, fileName), validPngBytes);
  return { fileName, service: createProductImageService(join(directory, "sqlite.db")) };
}

describe("retained product image storage", () => {
  it("reads a migrated package image as a product image", async () => {
    const { fileName, service } = await createTestService();

    const image = await service.readImage(fileName);

    expect(image?.mediaType).toBe("image/png");
    expect(image?.file.size).toBe(validPngBytes.byteLength);
  });

  it("rejects traversal and unknown image names", async () => {
    const { service } = await createTestService();

    expect(await service.readImage("../sqlite.db")).toBeNull();
    expect(await service.readImage("unknown.png")).toBeNull();
  });
});
