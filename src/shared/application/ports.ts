/**
 * Portas técnicas compartilhadas.
 *
 * Relógio e geração de segredos são injetáveis para que regras temporais e
 * identificadores sejam determinísticos nos testes.
 */

/** Relógio injetável — deixa as regras temporais testáveis. */
export interface Clock {
  now(): Date;
}

/** Geração de segredos aleatórios (identificador de sessão, nonces). */
export interface SecretGenerator {
  token(bytes?: number): string;
}
