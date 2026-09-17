/**
 * Política de limite de tentativas de login (OWASP A07 — falhas de
 * identificação e autenticação).
 *
 * É uma função pura sobre um contador: a decisão de bloquear não depende de
 * banco, relógio do sistema nem HTTP, e por isso é testável direto.
 *
 * Duas chaves são contadas em paralelo, porque protegem de ataques diferentes:
 *
 *  - por CONTA: impede força bruta contra a senha de um usuário específico,
 *    mesmo que o atacante troque de IP a cada tentativa;
 *  - por ORIGEM (IP): impede varredura de senha comum ("password spraying")
 *    contra muitas contas, caso em que nenhuma conta sozinha chega ao limite.
 *
 * Os limites são diferentes de propósito. O da conta é o mais delicado: um
 * limite muito baixo transforma o mecanismo em negação de serviço contra o
 * usuário legítimo — basta o atacante errar a senha de propósito para trancar
 * a recepção da clínica. Por isso o bloqueio é curto e a contagem zera no
 * primeiro acerto, em vez de exigir intervenção de um administrador.
 */

/** Janela em que as falhas se acumulam. Falha isolada e antiga não conta. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Quanto tempo o acesso fica bloqueado depois de estourar o limite. */
export const LOGIN_BLOCK_MS = 15 * 60 * 1000;

/** Falhas toleradas para a mesma conta antes do bloqueio. */
export const LOGIN_MAX_FAILURES_PER_ACCOUNT = 10;

/**
 * Falhas toleradas para o mesmo IP. Mais alto que o da conta porque uma
 * clínica inteira costuma sair por um único endereço.
 */
export const LOGIN_MAX_FAILURES_PER_IP = 30;

/** Contador persistido de uma chave (conta ou IP). */
export interface LoginAttemptState {
  failures: number;
  /** Início da janela corrente. */
  firstFailureAt: Date;
  blockedUntil: Date | null;
}

/**
 * Segundos que ainda faltam para liberar; `0` quando não está bloqueado.
 *
 * Arredonda para cima para nunca prometer liberação antes da hora.
 */
export function secondsUntilUnblocked(
  state: LoginAttemptState | null,
  now: Date
): number {
  if (!state?.blockedUntil) return 0;
  const remaining = state.blockedUntil.getTime() - now.getTime();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Próximo estado depois de uma tentativa falha.
 *
 * Janela expirada recomeça a contagem: quem errou a senha uma vez ontem não
 * carrega isso para sempre.
 */
export function afterFailedAttempt(
  state: LoginAttemptState | null,
  now: Date,
  maxFailures: number
): LoginAttemptState {
  // Já bloqueado: o contador não anda. Somar aqui deixaria o prazo sempre à
  // frente do relógio, e quem errasse a senha durante o bloqueio jamais sairia
  // dele — inclusive o usuário legítimo tentando de novo.
  if (secondsUntilUnblocked(state, now) > 0) return state as LoginAttemptState;

  const expired =
    state === null || now.getTime() - state.firstFailureAt.getTime() > LOGIN_WINDOW_MS;

  const failures = expired ? 1 : state.failures + 1;
  const blocked = failures >= maxFailures;

  return {
    failures,
    firstFailureAt: expired ? now : state.firstFailureAt,
    blockedUntil: blocked ? new Date(now.getTime() + LOGIN_BLOCK_MS) : null,
  };
}

/** Mensagem única para qualquer chave: não revela se foi a conta ou o IP. */
export function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Muitas tentativas de login. Tente novamente em ${minutes} ${
    minutes === 1 ? "minuto" : "minutos"
  }.`;
}
