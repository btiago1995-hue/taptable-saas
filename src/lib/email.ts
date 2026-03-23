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

// ─── Boas-vindas ───────────────────────────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to:             string;
  restaurantName: string;
  managerName:    string;
  plan:           string;
  trialExpiresAt: string;
}): Promise<void> {
  const { to, restaurantName, managerName, plan, trialExpiresAt } = params;
  const trialEnd = new Date(trialExpiresAt).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
  const panelUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dineo.cv") + "/admin";

  await sendEmail({
    to,
    subject: `Bem-vindo ao Dineo, ${restaurantName}`,
    html: baseTemplate(`
      <h2 style="font-size:22px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px">
        Olá, ${managerName}! 👋
      </h2>
      <p style="color:#475569;margin:0 0 24px;font-size:15px">
        O <strong>${restaurantName}</strong> está pronto para começar no Dineo.
        Tem <strong>30 dias de acesso gratuito</strong> a todas as funcionalidades do plano <strong>${plan}</strong>.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:13px;color:#166534">Plano trial</span>
          <span style="font-weight:700;color:#166534">${plan}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:13px;color:#166534">Trial válido até</span>
          <span style="font-weight:700;color:#166534">${trialEnd}</span>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:28px">
        <a href="${panelUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:-0.3px">
          Entrar no Painel →
        </a>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0">
        Precisa de ajuda? Responda a este email ou contacte a nossa equipa em
        <a href="mailto:suporte@dineo.cv" style="color:#16a34a">suporte@dineo.cv</a>.
      </p>
    `),
  });
}

// ─── Aviso de expiração do trial ──────────────────────────────────────────

export async function sendTrialWarningEmail(params: {
  to:             string;
  restaurantName: string;
  daysLeft:       number;
  plan:           string;
  amount:         number;
  expiresAt:      string;
}): Promise<void> {
  const { to, restaurantName, daysLeft, plan, amount, expiresAt } = params;
  const expDate = new Date(expiresAt).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
  const upgradeUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dineo.cv") + "/admin/upgrade";

  const subjects: Record<number, string> = {
    7: "O seu trial termina em 7 dias — escolha o seu plano",
    3: "Apenas 3 dias para não perder o acesso ao Dineo",
    1: "Último dia! Garanta o seu plano ainda hoje",
    0: "O seu período de teste terminou",
  };

  const headerColors: Record<number, { bg: string; border: string; text: string; label: string }> = {
    7: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", label: "7 dias restantes" },
    3: { bg: "#fffbeb", border: "#fde68a", text: "#b45309", label: "Apenas 3 dias!" },
    1: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", label: "Último dia!" },
    0: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", label: "Trial expirado" },
  };

  const c = headerColors[daysLeft] ?? headerColors[0];
  const subject = subjects[daysLeft] ?? subjects[0];

  const body = daysLeft === 0
    ? `O período de teste de <strong>${restaurantName}</strong> terminou hoje.<br/>Subscreva agora para manter o acesso a todos os seus dados e funcionalidades.`
    : `O período de teste de <strong>${restaurantName}</strong> termina em <strong>${daysLeft} dia${daysLeft > 1 ? "s" : ""}</strong> (${expDate}).<br/>Após essa data, o acesso ao painel será suspenso.`;

  await sendEmail({
    to,
    subject,
    html: baseTemplate(`
      <div style="background:${c.bg};border:1px solid ${c.border};border-radius:12px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;font-weight:900;font-size:16px;color:${c.text}">${c.label}</p>
      </div>
      <h2 style="font-size:20px;font-weight:800;margin:0 0 8px">${subject}</h2>
      <p style="color:#475569;margin:0 0 20px;font-size:14px;line-height:1.6">${body}</p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="font-size:13px;color:#64748b;margin-bottom:4px">Plano actual</div>
        <div style="font-weight:700;font-size:17px">${plan} · ${amount.toLocaleString("pt-PT")} CVE/mês</div>
      </div>
      <div style="text-align:center;margin-bottom:16px">
        <a href="${upgradeUrl}" style="display:inline-block;background:${daysLeft === 0 ? "#dc2626" : "#16a34a"};color:#fff;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
          ${daysLeft === 0 ? "Reactivar agora →" : "Escolher plano →"}
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center">
        Questões? Contacte-nos em <a href="mailto:suporte@dineo.cv" style="color:#64748b">suporte@dineo.cv</a>
      </p>
    `),
  });
}

// ─── Confirmação de contacto PRO (para o cliente) ──────────────────────────

export async function sendContactLeadConfirmation(params: {
  to:           string;
  name:         string;
  businessName: string;
}): Promise<void> {
  const { to, name, businessName } = params;

  await sendEmail({
    to,
    subject: "Recebemos o seu contacto — Dineo",
    html: baseTemplate(`
      <h2 style="font-size:20px;font-weight:800;margin:0 0 8px">Recebemos o seu pedido</h2>
      <p style="color:#475569;margin:0 0 20px;font-size:14px">
        Olá <strong>${name}</strong>, recebemos o seu interesse no Dineo para <strong>${businessName}</strong>.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#166534">
        A nossa equipa irá entrar em contacto consigo nas próximas <strong>24 horas</strong> para apresentar
        a proposta adequada ao seu negócio e responder a todas as suas questões.
      </div>
      <p style="color:#64748b;font-size:13px">
        Entretanto, se tiver alguma questão urgente, pode contactar-nos directamente em
        <a href="mailto:comercial@dineo.cv" style="color:#16a34a">comercial@dineo.cv</a>.
      </p>
    `),
  });
}

// ─── Notificação interna de novo lead PRO ──────────────────────────────────

export async function sendContactLeadInternal(params: {
  name:         string;
  email:        string;
  phone?:       string | null;
  businessName: string;
  numLocations: number;
  message?:     string | null;
}): Promise<void> {
  const { name, email, phone, businessName, numLocations, message } = params;
  const teamEmail = process.env.EMAIL_TEAM || "equipa@dineo.cv";
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 12px;font-size:13px;color:#64748b;white-space:nowrap;border-bottom:1px solid #f1f5f9">${label}</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9">${value}</td></tr>`;

  await sendEmail({
    to:      teamEmail,
    subject: `Novo Lead PRO — ${businessName}`,
    html: baseTemplate(`
      <h2 style="font-size:20px;font-weight:800;margin:0 0 16px">Novo pedido de contacto PRO</h2>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:24px">
        <tbody>
          ${row("Nome", name)}
          ${row("Email", `<a href="mailto:${email}" style="color:#16a34a">${email}</a>`)}
          ${row("Telefone", phone || "—")}
          ${row("Negócio", businessName)}
          ${row("Nº Localizações", String(numLocations))}
          ${message ? row("Mensagem", message) : ""}
        </tbody>
      </table>
      <p style="color:#64748b;font-size:12px">Recebido em ${new Date().toLocaleString("pt-PT")}</p>
    `),
  });
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
