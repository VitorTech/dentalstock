/**
 * Leitura segura da requisição.
 *
 * Defesas aplicadas (OWASP A03/A04):
 *  - Content-Type conferido: evita processar corpo de origem inesperada;
 *  - limite de tamanho do corpo: barra payload gigante que consumiria memória;
 *  - JSON inválido vira ValidationError, não erro 500;
 *  - identificadores de rota validados por formato antes de virar consulta.
 */
import type { NextRequest } from "next/server";
import { ValidationError } from "@/shared/domain";

const MAX_BODY_BYTES = 64 * 1024; // 64 KB: mais que suficiente para nossos formulários

export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ValidationError("Content-Type deve ser application/json.");
  }

  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    throw new ValidationError("Corpo da requisição muito grande.");
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new ValidationError("Corpo da requisição muito grande.");
  }
  if (raw.trim() === "") return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError("JSON inválido.");
  }

  // Array ou primitivo no lugar de objeto costuma indicar tentativa de burlar
  // a validação de campos — recusamos explicitamente.
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError("Corpo deve ser um objeto JSON.");
  }
  return parsed as Record<string, unknown>;
}

/**
 * Valida identificador vindo da URL.
 *
 * Os ids são cuid (alfanuméricos). Restringir por allowlist impede que caminhos
 * inesperados cheguem à camada de dados, mesmo com o Prisma já protegendo
 * contra injeção.
 */
export function readId(value: unknown, field = "id"): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    throw new ValidationError("Identificador inválido.", field);
  }
  return value;
}

/** Inteiro de query string com limites — evita paginação abusiva. */
export function readInt(
  value: string | null,
  opts: { min: number; max: number; fallback: number }
): number {
  if (value === null || value.trim() === "") return opts.fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return opts.fallback;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(parsed)));
}

/** Texto de busca saneado: aparado e truncado. */
export function readSearch(value: string | null, max = 120): string {
  if (!value) return "";
  return value.trim().slice(0, max);
}

/**
 * Endereço do cliente, para limitar tentativas por origem.
 *
 * Em produção quem termina o TLS é o Caddy, que preenche `X-Forwarded-For`; o
 * primeiro elemento da lista é o cliente. O cabeçalho é falsificável por quem
 * fala DIRETAMENTE com a aplicação, então isto só vale porque o container só
 * recebe tráfego do proxy — nunca exponha a porta 3000 para fora.
 *
 * Devolve `null` quando não há cabeçalho: nesse caso o limite por conta segue
 * valendo, e é ele que protege a senha de um usuário específico.
 */
export function readClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim();
  if (!candidate) return null;
  // Teto de tamanho: o valor vira chave de linha no banco.
  return candidate.slice(0, 45);
}
