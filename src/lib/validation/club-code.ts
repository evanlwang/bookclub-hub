// @spec CLUB-DATA-001, CLUB-DATA-002

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validateCode(raw: string): { valid: boolean; error?: string } {
  const normalized = normalizeCode(raw);
  if (normalized.length < 4) {
    return { valid: false, error: "Code must be at least 4 characters" };
  }
  if (normalized.length > 16) {
    return { valid: false, error: "Code must be at most 16 characters" };
  }
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return { valid: false, error: "Code must be alphanumeric only" };
  }
  return { valid: true };
}
