/**
 * Nome do cookie de sessão.
 *
 * Arquivo isolado e sem dependências de propósito: é importado pelo middleware,
 * que roda no runtime edge e não pode carregar Prisma nem `next/headers`.
 * Antes o mesmo nome existia em dois lugares (`SESSION_COOKIE` e
 * `ACCESS_TOKEN_COOKIE`); mudar um sem o outro quebraria o login em silêncio.
 */
export const SESSION_COOKIE = "session";
