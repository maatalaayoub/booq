import { NextResponse } from 'next/server';
import { ValidationError } from './validate';

// ─── STANDARDIZED API RESPONSE HELPERS ──────────────────────────────────
// These produce the same JSON shapes already used across the app,
// but provide a single, consistent way to create them.

/**
 * Return a JSON error response.
 * Shape: { error: string, details?: string }
 */
export function apiError(message, status = 500, details) {
  const body = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Return a JSON success response with arbitrary data merged in.
 * Shape: { success: true, ...data }
 */
export function apiSuccess(data = {}) {
  return NextResponse.json({ success: true, ...data });
}

/**
 * Return a JSON data response (no success wrapper).
 * Shape: { ...data }
 */
export function apiData(data, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Convert a ValidationError (from parseBody/parseQuery) to a NextResponse.
 * Usage in API routes:
 *   const { error, data } = parseBody(schema, body);
 *   if (error) return validationResponse(error);
 */
export function validationResponse(validationError) {
  if (validationError instanceof ValidationError) {
    return apiError(validationError.message, validationError.status);
  }
  return apiError('Validation failed', 400);
}
