/** Utility adapters: clock and secret generation. */
import { randomBytes } from "crypto";
import type { Clock, SecretGenerator } from "@/shared/application";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class CryptoSecretGenerator implements SecretGenerator {
  /** Opaque token used to identify a session. */
  token(bytes = 32): string {
    return randomBytes(bytes).toString("hex");
  }
}
