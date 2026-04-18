function normalizeText(input: string | null | undefined): string {
  if (!input) return "";
  // Remove zero-width and byte-order mark characters that can make titles look blank.
  return input.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function hasMeaningfulChars(input: string): boolean {
  return /[\p{L}\p{N}]/u.test(input);
}

export function getProkerDisplayName(
  namaProker: string | null | undefined,
  description?: string | null,
  fallback = "Untitled Proker"
): string {
  const name = normalizeText(namaProker);
  if (name && hasMeaningfulChars(name)) return name;

  const desc = normalizeText(description);
  if (desc && hasMeaningfulChars(desc)) return desc;

  return fallback;
}
