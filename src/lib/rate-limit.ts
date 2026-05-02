// =============================================================================
// Neighborly MVP — Simple in-memory rate limiting
// =============================================================================
// NOTE: This is per-process in-memory storage. In a multi-instance deployment
// (e.g., multiple Vercel edge functions), use Redis or Upstash instead.
// For MVP/prototype with single instance, this is sufficient.
// =============================================================================

type Window = {
  attempts: number;
  resetAt: number; // epoch ms
};

const store = new Map<string, Window>();

function nowMs() { return Date.now(); }

function getWindow(key: string, windowMs: number): Window {
  const existing = store.get(key);
  const current = nowMs();
  if (existing && existing.resetAt > current) {
    return existing;
  }
  const fresh: Window = { attempts: 0, resetAt: current + windowMs };
  store.set(key, fresh);
  return fresh;
}

/**
 * Check if an action is allowed under the rate limit.
 * @param key    Unique identifier (e.g., "login:192.168.1.1")
 * @param limit  Max attempts allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const w = getWindow(key, windowMs);
  const allowed = w.attempts < limit;
  if (allowed) {
    w.attempts += 1;
  }
  return { allowed, remaining: Math.max(0, limit - w.attempts), resetAt: w.resetAt };
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 15 * 60 * 1000 },          // 5 per 15 min
  signup: { limit: 3, windowMs: 60 * 60 * 1000 },         // 3 per hour
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 },  // 3 per hour
  listingCreate: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  messageSend: { limit: 50, windowMs: 10 * 60 * 1000 },   // 50 per 10 min
} as const;
