/**
 * Tradução de erro de domínio para HTTP.
 *
 * Este é o único lugar que conhece códigos HTTP; os casos de uso lançam erros
 * de negócio e ignoram protocolo.
 *
 * Regra de segurança (OWASP A09 — falhas de log e monitoramento / A05):
 * erros inesperados devolvem mensagem genérica ao cliente e detalham apenas no
 * log do servidor. Stack trace e mensagem de banco nunca vão para a resposta,
 * porque revelam schema e caminhos internos.
 */
import { NextResponse } from "next/server";
import { BusinessRuleError, ConflictError, DomainError, ExternalServiceError, ForbiddenError, NotFoundError, PaymentRequiredError, ServiceUnavailableError, TooManyRequestsError, UnauthorizedError, ValidationError } from "@/shared/domain";

const STATUS_BY_ERROR: [new (...args: never[]) => DomainError, number][] = [
  [ValidationError, 400],
  [UnauthorizedError, 401],
  [PaymentRequiredError, 402],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [BusinessRuleError, 422],
  [TooManyRequestsError, 429],
  [ExternalServiceError, 502],
  [ServiceUnavailableError, 503],
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
        // O cliente precisa saber quanto esperar; sem isso, a tela só pode
        // sugerir "tente de novo" e o usuário tenta na hora, de novo bloqueado.
        headers:
          error instanceof TooManyRequestsError
            ? { "Retry-After": String(error.retryAfterSeconds) }
            : undefined,
      }
    );
  }

  // Inesperado: registra o detalhe e responde de forma opaca.
  console.error("[erro não tratado]", error);
  return NextResponse.json(
    { error: "Erro interno. Tente novamente.", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

/** Envelopa um handler para que nenhuma exceção escape sem tradução. */
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
