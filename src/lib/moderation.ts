// =============================================================================
// Neighborly MVP — Content moderation helpers
// =============================================================================

const BLOCKED_KEYWORDS = [
  // Weapons
  "gun", "pistol", "rifle", "knife", "weapon", "ammunition", "ammo",
  "firearm", "blade", "machete",
  // Drugs
  "cocaine", "heroin", "meth", "marijuana", "weed", "cannabis",
  "pills", "prescription drugs", "xanax", "oxycontin", "fentanyl",
  // Scam / financial fraud
  "wire transfer", "western union", "moneygram", "crypto investment",
  "guaranteed profit", "get rich", "ponzi", "pyramid scheme",
  // Adult / sexual
  "escort", "prostitute", "sex", "porn", "nude", "explicit",
  // Illegal services
  "fake id", "counterfeit", "stolen", "hacked", "cracked account",
  // Hate / harassment
  "kill", "murder", "attack", "bomb", "terrorist",
];

const NORMALIZED_DELIMITERS = /[-_.\s]+/g;

function normalize(text: string): string {
  return text.toLowerCase().replace(NORMALIZED_DELIMITERS, " ");
}

/**
 * Scan text for blocked keywords.
 * @returns Array of matched keywords (empty = clean)
 */
export function scanText(text: string): string[] {
  const normalized = normalize(text);
  const matches: string[] = [];
  for (const kw of BLOCKED_KEYWORDS) {
    if (normalized.includes(kw)) {
      matches.push(kw);
    }
  }
  return [...new Set(matches)];
}

/**
 * Check if text contains PII patterns (phone, email, URLs).
 * Used for messaging safety warnings.
 * @returns Array of detected PII types
 */
export function detectPii(text: string): string[] {
  const found: string[] = [];

  // Phone: international formats + Spanish local
  if (/\b\+?[\d\s()-]{7,20}\b/.test(text)) found.push("phone");

  // Email
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) found.push("email");

  // URL / link
  if (/https?:\/\/|www\.\S+|\S+\.\S{2,}\/\S+/.test(text)) found.push("link");

  // Payment app references
  if (/\b(bizum|venmo|paypal|revolut|cashapp|zelle)\b/i.test(text)) found.push("payment");

  return found;
}

/**
 * Validate a listing before creation.
 * @returns { ok: true } or { ok: false, reason: string, flags: string[] }
 */
export function validateListing(
  title: string,
  description: string,
): { ok: true } | { ok: false; reason: string; flags: string[] } {
  const flags = scanText(`${title} ${description}`);
  if (flags.length > 0) {
    return {
      ok: false,
      reason: `Listing contains prohibited content: ${flags.join(", ")}`,
      flags,
    };
  }
  return { ok: true };
}

/**
 * Validate a message before sending.
 * @returns { ok: true, pii: string[] } or { ok: false, reason: string, flags: string[], pii: string[] }
 */
export function validateMessage(text: string): {
  ok: boolean;
  pii: string[];
  reason?: string;
  flags?: string[];
} {
  const flags = scanText(text);
  const pii = detectPii(text);

  if (flags.length > 0) {
    return {
      ok: false,
      pii,
      reason: `Message contains prohibited content: ${flags.join(", ")}`,
      flags,
    };
  }

  return { ok: true, pii };
}
