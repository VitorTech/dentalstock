/**
 * Domain errors.
 *
 * Domain layer: it knows nothing about HTTP, Prisma, Next or any library.
 * Inbound adapters translate these errors into their own protocol (e.g.
 * NotFoundError -> HTTP 404), which is what keeps business rules independent
 * of the framework, as required by the Dependency Rule.
 *
 * Messages stay in Portuguese on purpose: they are shown to the end user, and
 * the product is sold to Brazilian dental clinics.
 */

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input rejected by the business rules. */
export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  constructor(
    message: string,
    /** Offending field, when there is one — lets the form highlight it. */
    readonly field?: string
  ) {
    super(message);
  }
}

/** Resource that does not exist, or lies outside the caller's scope. */
export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  constructor(what = "Recurso não encontrado.") {
    super(what);
  }
}

/** Conflicts with the current state (e.g. e-mail already taken). */
export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
}

/** Missing or invalid credentials. */
export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  constructor(message = "Não autenticado.") {
    super(message);
  }
}

/** Valid credentials, but not allowed to perform the operation. */
export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  constructor(message = "Acesso negado.") {
    super(message);
  }
}

/** Business rule violation that does not fit the cases above. */
export class BusinessRuleError extends DomainError {
  readonly code = "BUSINESS_RULE";
}

/**
 * Too many attempts within a time window.
 *
 * Carries how long is left: the HTTP adapter turns it into the `Retry-After`
 * header, so the screen can tell the user how long to wait instead of just
 * repeating "try again".
 */
export class TooManyRequestsError extends DomainError {
  readonly code = "TOO_MANY_REQUESTS";
  constructor(
    message: string,
    readonly retryAfterSeconds: number
  ) {
    super(message);
  }
}
