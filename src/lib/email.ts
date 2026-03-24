/**
 * email.ts — Notificações por Email via Resend + React Email
 *
 * Configuração necessária:
 *   RESEND_API_KEY=re_xxxx              (obrigatório para enviar)
 *   EMAIL_FROM=Dineo <noreply@dineo.cv> (opcional, default abaixo)
 *
 * Sem RESEND_API_KEY: o envio é simulado (log em consola), nunca lança erro.
 */

import { Resend } from "resend";
import { render } from "@react-email/components";

const FROM = process.env.EMAIL_FROM || "Dineo <noreply@dineo.cv>";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function sendEmail(params: {
  to:      string;
  subject: string;
  react:   React.ReactElement;
}): Promise<void> {
  const resend = getResend();

  if (!resend) {
    console.log(`[email] MOCK → Para: ${params.to} | Assunto: ${params.subject}`);
    return;
  }

  try {
    const html = await render(params.react);
    const { error } = await resend.emails.send({
      from:    FROM,
      to:      [params.to],
      subject: params.subject,
      html,
    });

    if (error) {
      console.error(`[email] Erro Resend:`, error);
    }
  } catch (err) {
    console.error("[email] Erro de rede:", err);
  }
}

// ─── Boas-vindas ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to:             string;
  restaurantName: string;
  managerName:    string;
  plan:           string;
  trialExpiresAt: string;
}): Promise<void> {
  const { to, restaurantName, managerName, plan, trialExpiresAt } = params;
  const { WelcomeEmail } = await import("./email-templates/welcome");
  const panelUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dineo.cv") + "/admin";

  await sendEmail({
    to,
    subject: `Bem-vindo ao Dineo, ${restaurantName}`,
    react: WelcomeEmail({ restaurantName, managerName, plan, trialExpiresAt, panelUrl }),
  });
}

// ─── Aviso de expiração do trial ─────────────────────────────────────────────

export async function sendTrialWarningEmail(params: {
  to:             string;
  restaurantName: string;
  daysLeft:       number;
  plan:           string;
  amount:         number;
  expiresAt:      string;
}): Promise<void> {
  const { to, restaurantName, daysLeft, plan, amount, expiresAt } = params;
  const { TrialWarningEmail } = await import("./email-templates/trial-warning");
  const upgradeUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dineo.cv") + "/admin/upgrade";

  const subjects: Record<number, string> = {
    7: "O seu trial termina em 7 dias — escolha o seu plano",
    3: "Apenas 3 dias para não perder o acesso ao Dineo",
    1: "Último dia! Garanta o seu plano ainda hoje",
    0: "O seu período de teste terminou",
  };

  await sendEmail({
    to,
    subject: subjects[daysLeft] ?? subjects[0],
    react: TrialWarningEmail({ restaurantName, daysLeft, plan, amount, expiresAt, upgradeUrl }),
  });
}

// ─── Confirmação de contacto PRO (para o cliente) ────────────────────────────

export async function sendContactLeadConfirmation(params: {
  to:           string;
  name:         string;
  businessName: string;
}): Promise<void> {
  const { to, name, businessName } = params;
  const { ContactConfirmationEmail } = await import("./email-templates/contact-confirmation");

  await sendEmail({
    to,
    subject: "Recebemos o seu contacto — Dineo",
    react: ContactConfirmationEmail({ name, businessName }),
  });
}

// ─── Notificação interna de novo lead PRO ────────────────────────────────────

export async function sendContactLeadInternal(params: {
  name:         string;
  email:        string;
  phone?:       string | null;
  businessName: string;
  numLocations: number;
  message?:     string | null;
}): Promise<void> {
  const { name, email, phone, businessName, numLocations, message } = params;
  const { ContactInternalEmail } = await import("./email-templates/contact-internal");
  const teamEmail = process.env.EMAIL_TEAM || "equipa@dineo.cv";

  await sendEmail({
    to:      teamEmail,
    subject: `Novo Lead PRO — ${businessName}`,
    react: ContactInternalEmail({ name, email, phone, businessName, numLocations, message }),
  });
}

// ─── Dunning ─────────────────────────────────────────────────────────────────

export async function sendDunningEmail(params: {
  to:                  string;
  restaurantName:      string;
  plan:                string;
  amount:              number;
  daysUntilSuspension: number;
}): Promise<void> {
  const { to, restaurantName, plan, amount, daysUntilSuspension } = params;
  const billingUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dineo.cv") + "/admin/billing";
  const isDay1 = daysUntilSuspension >= 4;

  // Reutiliza o TrialWarningEmail com daysLeft=1 ou 0 como proxy visual
  const { TrialWarningEmail } = await import("./email-templates/trial-warning");
  const subject = isDay1
    ? `Pagamento em atraso — o acesso ao Dineo será suspenso em ${daysUntilSuspension} dias`
    : `Urgente: a sua conta Dineo será suspensa em ${daysUntilSuspension} dia${daysUntilSuspension > 1 ? "s" : ""}`;

  await sendEmail({
    to,
    subject,
    react: TrialWarningEmail({
      restaurantName,
      daysLeft:   isDay1 ? 1 : 0,
      plan,
      amount,
      expiresAt:  new Date(Date.now() + daysUntilSuspension * 86400000).toISOString(),
      upgradeUrl: billingUrl,
    }),
  });
}

// ─── Lembrete de renovação ───────────────────────────────────────────────────

export async function sendRenewalReminder(params: {
  to:             string;
  restaurantName: string;
  daysLeft:       number;
  plan:           string;
  amount:         number;
  expiresAt:      string;
}): Promise<void> {
  const { to, restaurantName, daysLeft, plan, amount, expiresAt } = params;
  const { TrialWarningEmail } = await import("./email-templates/trial-warning");
  const upgradeUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dineo.cv") + "/admin/billing";

  await sendEmail({
    to,
    subject: `A sua subscrição Dineo expira em ${daysLeft} dia${daysLeft > 1 ? "s" : ""}`,
    react: TrialWarningEmail({ restaurantName, daysLeft, plan, amount, expiresAt, upgradeUrl }),
  });
}

// ─── Conta suspensa ──────────────────────────────────────────────────────────

export async function sendSuspensionNotice(params: {
  to:             string;
  restaurantName: string;
}): Promise<void> {
  const { to, restaurantName } = params;
  const { TrialWarningEmail } = await import("./email-templates/trial-warning");
  const upgradeUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dineo.cv") + "/admin/upgrade";

  await sendEmail({
    to,
    subject: "Acesso Dineo suspenso — regularize a sua conta",
    react: TrialWarningEmail({
      restaurantName,
      daysLeft:   0,
      plan:       "—",
      amount:     0,
      expiresAt:  new Date().toISOString(),
      upgradeUrl,
    }),
  });
}

// ─── Confirmação de pagamento ────────────────────────────────────────────────

export async function sendPaymentConfirmation(params: {
  to:             string;
  restaurantName: string;
  amount:         number;
  plan:           string;
  newExpiresAt:   string;
  reference?:     string;
}): Promise<void> {
  const { to, restaurantName, amount, plan, newExpiresAt, reference } = params;
  const { WelcomeEmail } = await import("./email-templates/welcome");
  const panelUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dineo.cv") + "/admin";
  const newExpDate = new Date(newExpiresAt).toLocaleDateString("pt-PT", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Reutiliza WelcomeEmail como proxy — suficiente para confirmação de pagamento
  await sendEmail({
    to,
    subject: "Pagamento confirmado — Dineo",
    react: WelcomeEmail({
      restaurantName,
      managerName:    restaurantName,
      plan:           `${plan} · ${amount.toLocaleString("pt-PT")} CVE · válido até ${newExpDate}${reference ? ` · Ref: ${reference}` : ""}`,
      trialExpiresAt: newExpiresAt,
      panelUrl,
    }),
  });
}
