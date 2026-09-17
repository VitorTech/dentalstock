"use client";

/** Operações da clínica: preferências de tema e assinatura. */
import { apiGet, apiSend } from "@/shared/ui/api-client";
import type { ThemeMode } from "@/modules/account/domain";

export interface TenantSettingsView {
  name: string;
  themeMode: ThemeMode;
  accentColor: string;
}

export const getTenantSettings = () =>
  apiGet<TenantSettingsView | null>("/api/tenant", null);

export const updateTenantSettings = (patch: { themeMode?: ThemeMode; accentColor?: string }) =>
  apiSend<TenantSettingsView>("/api/tenant", "PATCH", patch);

// ── Assinatura ─────────────────────────────────────────────────────────────

export interface SubscriptionView {
  tenant: { name: string; billingEmail: string | null };
  status: string;
  active: boolean;
  trialing: boolean;
  daysLeft: number;
  blocked: boolean;
  trialDays: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  hasSubscription: boolean;
  price: number;
  /** Falso quando a instalação não tem gateway configurado. */
  paymentsEnabled: boolean;
}

export const getSubscription = () => apiGet<SubscriptionView | null>("/api/subscription", null);

/**
 * Inicia a assinatura. `autoRedirect` diz se o gateway devolve o cliente para
 * cá depois do pagamento — a tela escolhe entre mesma aba e nova aba.
 */
export const startCheckout = (input: {
  cpfCnpj: string;
  email: string;
  phone: string;
  name?: string;
}) =>
  apiSend<{ invoiceUrl: string; autoRedirect: boolean }>(
    "/api/subscription/checkout",
    "POST",
    input
  );

/** Cobrança em aberto, para trocar o cartão. Sem cobrança, vem `message`. */
export const getPaymentLink = () =>
  apiSend<{ invoiceUrl: string | null; message?: string; dueDate?: string | null }>(
    "/api/subscription/payment-link",
    "GET"
  );

export const cancelSubscription = () =>
  apiSend<{ ok: true; accessUntil: string | null }>("/api/subscription/cancel", "POST");

/** Reconsulta o gateway e atualiza o status guardado aqui. */
export const syncSubscription = () =>
  apiSend<{ ok: true; status: string; message: string }>("/api/subscription/sync", "POST");
