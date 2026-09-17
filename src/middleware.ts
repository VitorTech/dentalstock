import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/modules/identity/adapters/in/http/session-cookie";

// Rotas públicas (não exigem login): a landing "/" e a tela de login.
const PUBLIC_PATHS = new Set(["/", "/login"]);
// Para onde o usuário logado vai (o app em si).
const APP_HOME = "/procedimentos";

/** Protege as páginas: sem cookie de sessão → /login (exceto rotas públicas).
 * O middleware roda no edge e não acessa o banco, então aqui só checamos a
 * PRESENÇA do cookie. A validação real (token válido, não expirado) acontece
 * nas rotas de API e nos server components via getSession(). */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // As rotas de API cuidam da própria autenticação e respondem 401 —
  // redirecionar um fetch para HTML de login quebraria o cliente.
  if (pathname.startsWith("/api")) return NextResponse.next();

  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.has(pathname);

  // Sem sessão numa rota protegida → login (guardando o destino).
  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Logado não precisa ver login nem a landing — vai direto ao app.
  if (hasSession && (pathname === "/login" || pathname === "/")) {
    const url = req.nextUrl.clone();
    url.pathname = APP_HOME;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// `sw.js` e o manifesto ficam fora: o navegador recusa registrar um service
// worker servido atrás de redirecionamento, e sem sessão o middleware mandaria
// ambos para /login — o app deixava de ser instalável na landing e no login.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
