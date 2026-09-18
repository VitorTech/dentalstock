/**
 * Translation from domain error to HTTP.
 *
 * This is the only place that knows HTTP status codes; use cases throw
 * business errors and ignore the protocol.
 *
 * Security rule (OWASP A05/A09): unexpected errors return a generic message to
 * the client and are detailed only in the server log. Stack traces and
 * database messages never reach the response, because they reveal the schema
 * and internal paths.
 */
import { NextResponse } from "next/server";
import { BusinessRuleError, ConflictError, DomainError, ForbiddenError, NotFoundError, TooManyRequestsError, UnauthorizedError, ValidationError } from "@/shared/domain";

const STATUS_BY_ERROR: [new (...args: never[]) => DomainError, number][] = [
  [ValidationError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [BusinessRuleError, 422],
  [TooManyRequestsError, 429],
];

export function toHttpResponse(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    const match = STATUS_BY_ERROR.find(([type]) => error instanceof type);
    const status = match ? match[1] : 400;

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.field ? { field: error.field } : {}),
      },
      {
        status,
        // The client needs to know how long to wait. Without this the screen
        // can only say "try again", so the user retries at once — blocked again.
        headers:
          error instanceof TooManyRequestsError
            ? { "Retry-After": String(error.retryAfterSeconds) }
            : undefined,
      }
    );
  }

  // Unexpected: log the detail, answer opaquely.
  console.error("[unhandled error]", error);
  return NextResponse.json(
    { error: "Erro interno. Tente novamente.", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

/** Wraps a handler so that no exception escapes untranslated. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toHttpResponse(error);
    }
  };
}
