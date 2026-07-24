export function normalizeProductTypeName(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  return trimmedValue.charAt(0).toUpperCase() + trimmedValue.slice(1);
}
