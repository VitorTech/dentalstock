/**
 * Erros de domínio.
 *
 * Camada de domínio: NÃO conhece HTTP, Prisma, Next ou qualquer biblioteca.
 * Os adaptadores de entrada traduzem estes erros para o protocolo deles
 * (ex.: NotFoundError -> HTTP 404). Assim a regra de negócio permanece
 * independente de framework, conforme a Regra de Dependência.
 */

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Dados de entrada inválidos segundo as regras de negócio. */
export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  constructor(
    message: string,
    /** Campo que falhou, quando aplicável — útil para o formulário destacar. */
    readonly field?: string
  ) {
    super(message);
  }
}

/** Recurso inexistente ou fora do escopo do solicitante. */
export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  constructor(what = "Recurso não encontrado.") {
    super(what);
  }
}

/** Conflito com o estado atual (ex.: e-mail já cadastrado). */
export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
}

/** Falta de credencial válida. */
export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  constructor(message = "Não autenticado.") {
    super(message);
  }
}

/** Credencial válida, mas sem permissão para a operação. */
export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  constructor(message = "Acesso negado.") {
    super(message);
  }
}

/** Assinatura inativa: o acesso depende de pagamento. */
export class PaymentRequiredError extends DomainError {
  readonly code = "SUBSCRIPTION_REQUIRED";
  constructor(message = "Assinatura necessária.") {
    super(message);
  }
}

/** Regra de negócio violada que não se encaixa nas anteriores. */
export class BusinessRuleError extends DomainError {
  readonly code = "BUSINESS_RULE";
}

/**
 * Excesso de tentativas em uma janela de tempo.
 *
 * Carrega quanto falta para liberar: o adaptador HTTP transforma isso no
 * cabeçalho `Retry-After`, e a tela consegue dizer ao usuário quanto esperar
 * em vez de só repetir "tente de novo".
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

/** Falha em serviço externo (gateway de pagamento, etc.). */
export class ExternalServiceError extends DomainError {
  readonly code = "EXTERNAL_SERVICE";
}

/**
 * Recurso indisponível por configuração ausente, não por erro do solicitante.
 *
 * Distinto de ExternalServiceError de propósito: "pagamentos não configurados
 * nesta instalação" é um estado do ambiente que a tela precisa saber
 * diferenciar de "o gateway falhou agora".
 */
export class ServiceUnavailableError extends DomainError {
  readonly code = "SERVICE_UNAVAILABLE";
}
