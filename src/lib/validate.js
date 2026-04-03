import { z } from 'zod';

// ─── SHARED REFINEMENTS ─────────────────────────────────────────────────
export const zUUID = z.string().uuid();
export const zDateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
export const zTimeStr = z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM');

// ─── VALIDATION ERROR ───────────────────────────────────────────────────

/**
 * Framework-agnostic validation error.
 * Contains a message and HTTP status — the caller decides how to respond.
 */
export class ValidationError {
  constructor(message, status = 400) {
    this.message = message;
    this.status = status;
  }
}

// ─── PARSE HELPERS ──────────────────────────────────────────────────────

/**
 * Parse a JSON body through a Zod schema.
 * Returns { data } on success, { error: ValidationError } on failure.
 */
export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return { error: new ValidationError(message, 400) };
  }
  return { data: result.data };
}

/**
 * Parse URL search params through a Zod schema.
 * Converts URLSearchParams to a plain object first.
 */
export function parseQuery(schema, searchParams) {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return { error: new ValidationError(message, 400) };
  }
  return { data: result.data };
}
