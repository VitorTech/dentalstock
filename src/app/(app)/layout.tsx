import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/auth";
import TenantTheme from "@/modules/account/ui/TenantTheme";

/**
 * Layout das telas internas.
 *
 * Cookie órfão (sessão expirada ou revogada) passa pela rota que limpa o
 * cookie antes de voltar ao login — ir direto para /login criaria laço, porque
 * o middleware só enxerga a PRESENÇA do cookie, não sua validade.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session) redirect("/api/auth/expired");

  return (
    <>
      <TenantTheme mode={session.tenant.themeMode} accent={session.tenant.accentColor} />
      {children}
    </>
  );
}
