/**
 * Safe text helpers for user-entered content (task titles/descriptions, etc.).
 *
 * Scope: 04_Security_and_Access.pdf §5, §10 § "Avoid dangerouslySetInnerHTML
 * for task/user-entered text" and "Test XSS payloads in task title/description
 * fields."
 *
 * IMPORTANT: The primary XSS defense is architectural, not this file §
 * render all user-entered text as plain React children/text nodes
 * (`<p>{task.title}</p>`) so React's built-in output escaping applies.
 * NEVER pass user-entered text through `dangerouslySetInnerHTML`.
 *
 * These helpers exist for the remaining cases where text has to leave React's
 * auto-escaping context: HTML attributes built as strings, non-React
 * rendering targets (e.g. `<canvas>` background labels, document.title,
 * OS notifications), and defensive normalization of persisted records.
 */

import type { ValidationResult } from "@/types/security";

/** Characters that must never reach a non-React rendering context unescaped. */
const HTML_ESCAPE_MAP: ReadonlyMap<string, string> = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

/**
 * Escapes HTML-significant characters. Use only when text must be placed into
 * a raw HTML string outside of React's own escaping (e.g. building an
 * attribute string manually, or feeding a non-React template). Prefer
 * rendering as React text children instead of calling this and injecting
 * markup wherever possible.
 */
export function escapeHtml(input: string): string {
  let result = "";
  for (const char of input) {
    result += HTML_ESCAPE_MAP.get(char) ?? char;
  }
  return result;
}

/**
 * Removes ASCII control characters (except tab/newline) that can appear in
 * malformed clipboard input or crafted payloads and have no legitimate use in
 * task titles/descriptions.
 */
export function stripControlCharacters(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/**
 * Normalizes and bounds user-entered plain text before it is persisted or
 * rendered. Does NOT convert to HTML and does NOT need to be paired with
 * `dangerouslySetInnerHTML` § React already escapes the returned string when
 * rendered as text children.
 */
export function sanitizePlainText(input: string, maxLength: number): string {
  const withoutControlChars = stripControlCharacters(input);
  const trimmed = withoutControlChars.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/** Result of validating that a user-entered string is safe plain text. */
export function validatePlainText(
  input: unknown,
  options: { readonly maxLength: number; readonly fieldName: string; readonly allowEmpty?: boolean }
): ValidationResult<string> {
  if (typeof input !== "string") {
    return { ok: false, error: `${options.fieldName} must be a string.` };
  }

  const sanitized = sanitizePlainText(input, options.maxLength);

  if (!options.allowEmpty && sanitized.length === 0) {
    return { ok: false, error: `${options.fieldName} cannot be empty.` };
  }

  return { ok: true, value: sanitized };
}

const DANGEROUS_URL_SCHEMES = ["javascript:", "data:text/html", "vbscript:"] as const;

/**
 * Guards against script-executing URL schemes in any user-provided URL field
 * (e.g. a pasted link). Allows normal http(s)/relative URLs.
 */
export function isSafeUrl(candidate: string): boolean {
  const trimmed = candidate.trim();
  const lower = trimmed.toLowerCase();

  if (DANGEROUS_URL_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    return false;
  }

  if (lower.startsWith("http://") || lower.startsWith("https://") || trimmed.startsWith("/")) {
    return true;
  }

  return false;
}
