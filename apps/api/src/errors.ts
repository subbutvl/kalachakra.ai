import { EngineError } from "@kalachakra/engine";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";

/** The one error shape (phase 1 spec, section 7). */
export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      field: z.string().optional(),
      message: z.string(),
    }),
  })
  .meta({
    id: "Error",
    example: {
      error: {
        code: "invalid_date",
        field: "person.dob",
        message: "30 February 2026 is not a date.",
      },
    },
  });

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

const STATUS: Record<string, ContentfulStatusCode> = {
  unknown_profile: 404,
  invalid_output: 500,
};

export function errorBody(code: string, message: string, field?: string) {
  return { error: field === undefined ? { code, message } : { code, field, message } };
}

/** Turns any thrown error into the error shape. Messages never include request data beyond the field name. */
export function handleError(err: unknown, c: Context) {
  if (err instanceof ApiError)
    return c.json(errorBody(err.code, err.message, err.field), err.status);
  if (err instanceof HTTPException) {
    // For example a body that is not valid JSON.
    const code = err.status === 400 ? "invalid_input" : "http_error";
    return c.json(
      errorBody(code, err.status === 400 ? "The request body is not valid JSON." : err.message),
      err.status,
    );
  }
  if (err instanceof EngineError) {
    return c.json(errorBody(err.code, err.message, err.field), STATUS[err.code] ?? 400);
  }
  console.error("Unexpected error:", err instanceof Error ? err.message : "unknown");
  return c.json(errorBody("internal_error", "Something went wrong. Please try again."), 500);
}

/** Request validation failures from zod-openapi, as the error shape with the first field that failed. */
export function validationHook(
  result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
  c: Context,
) {
  if (result.success || !result.error) return;
  const first = result.error.issues[0];
  const field = first?.path.map(String).join(".") || undefined;
  const message = result.error.issues
    .slice(0, 5)
    .map((i) => `${i.path.map(String).join(".") || "body"}: ${i.message}`)
    .join("; ");
  return c.json(errorBody("invalid_input", message, field), 400);
}
