/** Adaptadores utilitários: relógio e geração de segredos. */
import { randomBytes } from "crypto";
import type { Clock, SecretGenerator } from "@/shared/application";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class CryptoSecretGenerator implements SecretGenerator {
  /** Token opaco para identificar sessão. */
  token(bytes = 32): string {
    return randomBytes(bytes).toString("hex");
  }
}
