import { describe, expect, it } from "vitest";
import {
  LOGIN_BLOCK_MS,
  LOGIN_WINDOW_MS,
  afterFailedAttempt,
  secondsUntilUnblocked,
  tooManyAttemptsMessage,
} from "./throttle";

const AGORA = new Date("2026-09-17T10:00:00.000Z");
const LIMITE = 3;

describe("limite de tentativas de login", () => {
  it("a primeira falha abre a janela sem bloquear", () => {
    const estado = afterFailedAttempt(null, AGORA, LIMITE);

    expect(estado).toEqual({ failures: 1, firstFailureAt: AGORA, blockedUntil: null });
    expect(secondsUntilUnblocked(estado, AGORA)).toBe(0);
  });

  it("bloqueia ao alcançar o limite, não depois dele", () => {
    let estado = afterFailedAttempt(null, AGORA, LIMITE);
    estado = afterFailedAttempt(estado, AGORA, LIMITE);
    expect(estado.blockedUntil).toBeNull();

    estado = afterFailedAttempt(estado, AGORA, LIMITE);
    expect(estado.failures).toBe(LIMITE);
    expect(secondsUntilUnblocked(estado, AGORA)).toBe(LOGIN_BLOCK_MS / 1000);
  });

  it("falha antiga não conta: a janela recomeça", () => {
    const antigo = afterFailedAttempt(null, AGORA, LIMITE);
    const depois = new Date(AGORA.getTime() + LOGIN_WINDOW_MS + 1);

    const estado = afterFailedAttempt(antigo, depois, LIMITE);

    expect(estado).toEqual({ failures: 1, firstFailureAt: depois, blockedUntil: null });
  });

  it("o bloqueio termina sozinho quando o prazo passa", () => {
    let estado = afterFailedAttempt(null, AGORA, 1);
    const durante = new Date(AGORA.getTime() + LOGIN_BLOCK_MS - 1000);
    const depois = new Date(AGORA.getTime() + LOGIN_BLOCK_MS + 1000);

    expect(secondsUntilUnblocked(estado, durante)).toBe(1);
    expect(secondsUntilUnblocked(estado, depois)).toBe(0);

    // E uma falha nova durante o bloqueio não estende o prazo original — senão
    // um atacante manteria o usuário legítimo trancado para sempre.
    estado = afterFailedAttempt(estado, durante, 1);
    expect(secondsUntilUnblocked(estado, depois)).toBe(0);
  });

  it("sem contador, nada bloqueia", () => {
    expect(secondsUntilUnblocked(null, AGORA)).toBe(0);
    expect(secondsUntilUnblocked({ failures: 9, firstFailureAt: AGORA, blockedUntil: null }, AGORA)).toBe(0);
  });

  it("a mensagem diz quanto esperar, em minutos inteiros", () => {
    expect(tooManyAttemptsMessage(60)).toContain("1 minuto");
    expect(tooManyAttemptsMessage(61)).toContain("2 minutos");
  });
});
