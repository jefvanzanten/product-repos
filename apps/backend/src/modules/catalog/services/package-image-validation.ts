/** Supported persisted package-image metadata. */
export type SupportedImage = {
  readonly extension: "png" | "jpg" | "webp";
  readonly mediaType: "image/png" | "image/jpeg" | "image/webp";
};

/**
 * Detect structurally valid supported image content without trusting client metadata.
 *
 * @param bytes - Uploaded file bytes.
 * @returns Persisted image metadata, or null for malformed or unsupported content.
 */
export function detectSupportedImage(bytes: Uint8Array): SupportedImage | null {
  if (isValidPng(bytes)) return { extension: "png", mediaType: "image/png" };
  if (isValidJpeg(bytes)) return { extension: "jpg", mediaType: "image/jpeg" };
  if (isValidWebP(bytes)) return { extension: "webp", mediaType: "image/webp" };
  return null;
}

/**
 * Validate required PNG chunks and non-zero dimensions.
 * @param bytes - Candidate PNG bytes.
 * @returns Whether the PNG structure is complete.
 */
function isValidPng(bytes: Uint8Array): boolean {
  if (!hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return false;
  let offset = 8;
  let hasHeader = false;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length) return false;
    const type = readAscii(bytes, offset + 4, 4);
    if (!hasHeader) {
      if (type !== "IHDR" || length !== 13 || readUint32(bytes, offset + 8) === 0 || readUint32(bytes, offset + 12) === 0) return false;
      hasHeader = true;
    }
    if (type === "IEND") return hasHeader && length === 0 && chunkEnd === bytes.length;
    offset = chunkEnd;
  }
  return false;
}

/**
 * Validate JPEG framing and require frame dimensions.
 * @param bytes - Candidate JPEG bytes.
 * @returns Whether the JPEG structure is complete.
 */
function isValidJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 8 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return false;
  let offset = 2;
  let hasFrame = false;
  while (offset + 1 < bytes.length - 2) {
    if (bytes[offset] !== 0xff) return false;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined || marker === 0x00) return false;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return false;
    const length = readUint16(bytes, offset);
    if (length < 2 || offset + length > bytes.length) return false;
    if (isStartOfFrame(marker)) {
      if (length < 7 || readUint16(bytes, offset + 3) === 0 || readUint16(bytes, offset + 5) === 0) return false;
      hasFrame = true;
    }
    if (marker === 0xda) return hasFrame;
    offset += length;
  }
  return false;
}

/**
 * Validate the RIFF envelope and dimensions of a WebP image.
 * @param bytes - Candidate WebP bytes.
 * @returns Whether the WebP structure is complete.
 */
function isValidWebP(bytes: Uint8Array): boolean {
  if (bytes.length < 30 || readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WEBP") return false;
  if (readUint32LittleEndian(bytes, 4) + 8 !== bytes.length) return false;
  const chunkType = readAscii(bytes, 12, 4);
  const chunkSize = readUint32LittleEndian(bytes, 16);
  if (20 + chunkSize + (chunkSize % 2) > bytes.length) return false;
  if (chunkType === "VP8X") return chunkSize >= 10 && readUint24LittleEndian(bytes, 24) < 0xff_ffff && readUint24LittleEndian(bytes, 27) < 0xff_ffff;
  if (chunkType === "VP8L") return chunkSize >= 5 && bytes[20] === 0x2f;
  return chunkType === "VP8 " && chunkSize >= 10 && hasBytes(bytes, 23, [0x9d, 0x01, 0x2a]) && (readUint16LittleEndian(bytes, 26) & 0x3fff) > 0 && (readUint16LittleEndian(bytes, 28) & 0x3fff) > 0;
}

/**
 * Check for an expected byte signature.
 * @param bytes - Candidate bytes.
 * @param offset - Signature start offset.
 * @param signature - Expected bytes.
 * @returns Whether the signature matches.
 */
function hasBytes(bytes: Uint8Array, offset: number, signature: ReadonlyArray<number>): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

/**
 * Read an ASCII fragment.
 * @param bytes - Source bytes.
 * @param offset - Fragment start offset.
 * @param length - Character count.
 * @returns Decoded ASCII fragment.
 */
function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

/**
 * Read an unsigned big-endian 16-bit integer.
 * @param bytes - Source bytes.
 * @param offset - Integer start offset.
 * @returns Decoded integer.
 */
function readUint16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

/**
 * Read an unsigned little-endian 16-bit integer.
 * @param bytes - Source bytes.
 * @param offset - Integer start offset.
 * @returns Decoded integer.
 */
function readUint16LittleEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

/**
 * Read an unsigned big-endian 32-bit integer.
 * @param bytes - Source bytes.
 * @param offset - Integer start offset.
 * @returns Decoded integer.
 */
function readUint32(bytes: Uint8Array, offset: number): number {
  return (((bytes[offset] ?? 0) * 0x1000000) + ((bytes[offset + 1] ?? 0) << 16) + ((bytes[offset + 2] ?? 0) << 8) + (bytes[offset + 3] ?? 0)) >>> 0;
}

/**
 * Read an unsigned little-endian 24-bit integer.
 * @param bytes - Source bytes.
 * @param offset - Integer start offset.
 * @returns Decoded integer.
 */
function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

/**
 * Read an unsigned little-endian 32-bit integer.
 * @param bytes - Source bytes.
 * @param offset - Integer start offset.
 * @returns Decoded integer.
 */
function readUint32LittleEndian(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16) | ((bytes[offset + 3] ?? 0) << 24)) >>> 0;
}

/**
 * Return whether a JPEG marker carries frame dimensions.
 * @param marker - JPEG marker byte.
 * @returns Whether the marker starts a frame.
 */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
}
