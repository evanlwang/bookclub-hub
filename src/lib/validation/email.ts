// @spec AUTH-DATA-001, AUTH-DATA-002

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(raw: string): { valid: boolean; error?: string } {
  const normalized = normalizeEmail(raw);
  if (!normalized) {
    return { valid: false, error: "Email is required" };
  }
  // Basic email pattern: contains @ with characters on both sides
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) {
    return { valid: false, error: "Invalid email format" };
  }
  return { valid: true };
}
