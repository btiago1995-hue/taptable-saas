/**
 * email.ts — Notificações por Email via Resend
 *
 * Configuração necessária:
 *   RESEND_API_KEY=re_xxxx          (obrigatório para enviar)
 *   EMAIL_FROM=Dineo <noreply@dineo.cv>  (opcional, default abaixo)
 *
 * Sem RESEND_API_KEY: o envio é simulado (log em consola), nunca lança erro.
 */

const RESEND_API = "https://api.resend.com/emails";
const FROM       = process.env.EMAIL_FROM || "Dineo <noreply@dineo.cv>";

async function sendEmail(params: {
  to:      string;
  subject: string;
  html:    string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.log(`[email] MOCK → Para: ${params.to} | Assunto: ${params.subject}`);
    return;
  }

  try {
    const res = await fetch(RESEND_API, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ from: FROM, to: [params.to], subject: params.subject, html: params.html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Erro Resend (${res.status}):`, body);
    }
  } catch (err) {
    console.error("[email] Erro de rede:", err);
  }
}

// ─── Templates ──────────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b">
      <div style="margin-bottom:24px">
        <span style="font-weight:900;font-size:18px;letter-spacing:-0.5px">Dineo</span>
      </div>
      ${content}
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
        Dineo · Plataforma de Gestão para Restaurantes<br/>
        Cabo Verde &amp; Portugal
      </div>
    </div>
  `;
}

// ─── Lembrete de renovação ─────────────────────────────────────────────────

export async function sendRenewalReminder(params: {
  to:            string;
  restaurantName: string;
  daysLeft:      number;
  plan:          string;
  amount:        number;
  expiresAt:     string;
}): Promise<void> {
  const { to, restaurantName, daysLeft, plan, amount, expiresAt } = params;
  const expDate = new Date(expiresAt).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

  await sendEmail({
    to,
    subject: `⏰ A sua subscrição Dineo expira em ${daysLeft} dia${daysLeft > 1 ? "s" : ""}`,
    html: baseTemplate(`
      <h2 style="font-size:20px;font-weight:800;margin:0 0 8px">
        Renove a sua subscrição
      </h2>
      <p style="color:#475569;margin:0 0 24px">
        Olá! A subscrição <strong>${restaurantName}</strong> expira em
        <strong>${daysLeft} dia${daysLeft > 1 ? "s" : ""}</strong> (${expDate}).
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="font-size:13px;color:#64748b;margin-bottom:4px">Plano actual</div>
        <div style="font-weight:700;font-size:18px">${plan} · ${amount.toLocaleString("pt-PT")} CVE/mês</div>
      </div>
      <p style="color:#475569;font-size:14px">
        Para renovar, fale com a nossa equipa ou efectue o pagamento pelo método habitual.
        Após confirmação do pagamento, a sua conta é renovada automaticamente.
      </p>
    `),
  });
}

// ─── Conta suspensa ────────────────────────────────────────────────────────

export async function sendSuspensionNotice(params: {
  to:             string;
  restaurantName: string;
}): Promise<void> {
  const { to, restaurantName } = params;

  await sendEmail({
    to,
    subject: "🚨 Acesso Dineo suspenso — regularize a sua conta",
    html: baseTemplate(`
      <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#dc2626">
        Conta suspensa
      </h2>
      <p style="color:#475569;margin:0 0 24px">
        O acesso de <strong>${restaurantName}</strong> foi suspenso por falta de pagamento.
      </p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">
        Para reactivar a sua conta, efectue o pagamento da subscrição e contacte a nossa equipa.
        O seu histórico e dados estão preservados.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;font-size:13px;color:#991b1b">
        Após regularização, o acesso é restaurado de imediato.
      </div>
    `),
  });
}

// ─── Confirmação de pagamento ──────────────────────────────────────────────

export async function sendPaymentConfirmation(params: {
  to:             string;
  restaurantName: string;
  amount:         number;
  plan:           string;
  newExpiresAt:   string;
  reference?:     string;
}): Promise<void> {
  const { to, restaurantName, amount, plan, newExpiresAt, reference } = params;
  const newExpDate = new Date(newExpiresAt).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

  await sendEmail({
    to,
    subject: "✅ Pagamento confirmado — Dineo",
    html: baseTemplate(`
      <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#16a34a">
        Pagamento confirmado
      </h2>
      <p style="color:#475569;margin:0 0 24px">
        Obrigado! O pagamento de <strong>${restaurantName}</strong> foi confirmado.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:13px;color:#166534">Plano</span>
          <span style="font-weight:700;color:#166534">${plan}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:13px;color:#166534">Valor pago</span>
          <span style="font-weight:700;color:#166534">${amount.toLocaleString("pt-PT")} CVE</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:13px;color:#166534">Válido até</span>
          <span style="font-weight:700;color:#166534">${newExpDate}</span>
        </div>
        ${reference ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #bbf7d0;font-size:12px;color:#4ade80">Referência: ${reference}</div>` : ""}
      </div>
      <p style="color:#475569;font-size:14px">Bom trabalho! 🚀</p>
    `),
  });
}
