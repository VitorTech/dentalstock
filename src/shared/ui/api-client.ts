"use client";

/**
 * Transporte HTTP das telas.
 *
 * É o único lugar que conhece `fetch`, status de erro e redirecionamento de
 * sessão. Nenhuma tela monta requisição à mão: cada feature expõe as suas
 * operações em `modules/<feature>/ui/api.ts`, e elas chamam daqui.
 *
 * Motivo de existir: o middleware roda no edge e só consegue verificar se o
 * cookie de sessão EXISTE — não se ele ainda é válido. Com um cookie expirado,
 * a navegação passa, mas toda a API responde 401 e as telas quebravam ao tentar
 * usar o corpo de erro como lista (`e.map is not a function`).
 *
 * Tratamento central:
 *   401 → sessão inválida  → volta para o login
 *   402 → sem assinatura   → vai para a tela de assinatura
 *   leitura  (`apiGet`)    → devolve o fallback, sem derrubar a tela
 *   escrita  (`apiSend`)   → lança `ApiError`, para a tela decidir o que dizer
 */

/** Falha de escrita com a mensagem que o servidor devolveu. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Campo recusado, quando a validação aponta um. */
    readonly field?: string,
    /** Segundos até poder tentar de novo (respostas 429). */
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let redirecting = false;

function hardRedirect(to: string) {
  if (redirecting || typeof window === "undefined") return;
  redirecting = true;
  window.location.href = to;
}

/**
 * Sessão expirada: limpa o cookie antes de ir para o login.
 *
 * O middleware só enxerga a PRESENÇA do cookie e, sem essa limpeza, devolveria
 * o usuário para o app — criando um ping-pong.
 */
async function handleExpiredSession() {
  if (redirecting) return;
  redirecting = true;
  const next = window.location.pathname;
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* segue para o login de qualquer forma */
  }
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

/** GET que nunca lança: em caso de falha devolve `fallback`. */
export async function apiGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);

    if (res.status === 401) {
      await handleExpiredSession();
      return fallback;
    }
    if (res.status === 402) {
      hardRedirect("/assinatura");
      return fallback;
    }
    if (!res.ok) return fallback;

    const data = await res.json();

    // Se esperamos uma lista e não veio uma, preserva o fallback em vez de
    // deixar a tela explodir num .map().
    if (Array.isArray(fallback) && !Array.isArray(data)) return fallback;

    return data as T;
  } catch {
    return fallback;
  }
}

/**
 * `GET` entra aqui para os poucos casos em que uma leitura precisa mostrar a
 * mensagem do servidor (ex.: "não há cobrança em aberto") em vez de degradar
 * silenciosamente para um valor padrão.
 */
type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Requisição que precisa do resultado. Devolve o corpo convertido ou lança
 * `ApiError`.
 *
 * Diferente do `apiGet` de propósito: uma leitura que falha pode degradar para
 * lista vazia, mas uma escrita que falha em silêncio faz o usuário acreditar
 * que salvou. Quem chama decide como mostrar o erro.
 */
export async function apiSend<T = void>(
  url: string,
  method: Method,
  body?: unknown
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError("Falha de conexão com o servidor.", 0);
  }

  if (res.status === 401) {
    await handleExpiredSession();
    throw new ApiError("Sessão expirada.", 401);
  }
  if (res.status === 402) {
    hardRedirect("/assinatura");
    throw new ApiError("Assinatura necessária.", 402);
  }

  const payload = await readJson(res);

  if (!res.ok) {
    const retryAfter = Number(res.headers.get("retry-after"));
    throw new ApiError(
      typeof payload?.error === "string" ? payload.error : "Não foi possível concluir a operação.",
      res.status,
      typeof payload?.field === "string" ? payload.field : undefined,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined
    );
  }

  return payload as T;
}

/** Corpo vazio (204) ou não-JSON não é erro: vira `undefined`. */
async function readJson(res: Response): Promise<Record<string, unknown> | undefined> {
  const text = await res.text();
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
