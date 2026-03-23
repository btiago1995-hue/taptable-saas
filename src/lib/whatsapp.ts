/**
 * whatsapp.ts — Envio de mensagens WhatsApp (server-side only)
 *
 * Suporta dois providers via variáveis de ambiente:
 *
 * ── Provider A: Meta Cloud API (oficial, gratuito) ───────────────────────────
 *   WHATSAPP_PROVIDER=meta
 *   WHATSAPP_TOKEN=<token permanente ou temporário do Meta>
 *   WHATSAPP_PHONE_NUMBER_ID=<Phone Number ID no Meta Business>
 *
 * ── Provider B: Generic REST (Z-API, Evolution API, WPPConnect, etc.) ────────
 *   WHATSAPP_PROVIDER=generic   (ou omitir — é o default)
 *   WHATSAPP_API_URL=https://api.z-api.io/instances/XXX/token/YYY
 *   WHATSAPP_API_TOKEN=<token do provider>
 *
 * Sem credenciais configuradas: simula envio (log em consola), nunca lança erro.
 */

const PROVIDER = process.env.WHATSAPP_PROVIDER || "generic";

// ─── Formatar número para E.164 (remover espaços, +, zeros à esquerda) ──────
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Se começa com 0, assume PT (351)
  if (digits.startsWith("0") && digits.length <= 10) return `351${digits.slice(1)}`;
  return digits;
}

// ─── Enviar mensagem de texto ─────────────────────────────────────────────────
export async function sendWhatsApp(to: string, message: string): Promise<void> {
  const phone = formatPhone(to);

  if (PROVIDER === "meta") {
    await sendViaMeta(phone, message);
  } else {
    await sendViaGeneric(phone, message);
  }
}

// ── Meta Cloud API ─────────────────────────────────────────────────────────────
async function sendViaMeta(phone: string, message: string): Promise<void> {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.log(`[WhatsApp MOCK Meta] → ${phone}: ${message}`);
    return;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to:                phone,
          type:              "text",
          text:              { body: message },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[WhatsApp Meta] Erro (${res.status}):`, err);
    }
  } catch (err) {
    console.error("[WhatsApp Meta] Erro de rede:", err);
  }
}

// ── Provider Genérico (Z-API, Evolution API, WPPConnect, etc.) ────────────────
async function sendViaGeneric(phone: string, message: string): Promise<void> {
  const apiUrl   = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !apiToken) {
    console.log(`[WhatsApp MOCK Generic] → ${phone}: ${message}`);
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/message/sendText`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ number: phone, text: message }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[WhatsApp Generic] Erro (${res.status}):`, err);
    }
  } catch (err) {
    console.error("[WhatsApp Generic] Erro de rede:", err);
  }
}

// ─── Mensagens pré-formatadas ─────────────────────────────────────────────────

export function msgOrderPlaced(restaurantName: string, shortId: string, orderType: string): string {
  const emoji = orderType === "delivery" ? "🛵" : orderType === "pickup" ? "🛍️" : "🍽️";
  return `${emoji} *${restaurantName}*\n\nRecebemos o seu pedido *#${shortId}*! Estamos a processar. Irá receber uma mensagem quando estiver pronto.`;
}

export function msgOrderPreparing(restaurantName: string, shortId: string): string {
  return `👨‍🍳 *${restaurantName}*\n\nO seu pedido *#${shortId}* foi aceite e está a ser preparado na cozinha. 🔥`;
}

export function msgOrderReady(restaurantName: string, shortId: string, orderType: string): string {
  if (orderType === "delivery") {
    return `🚚 *${restaurantName}*\n\nO seu pedido *#${shortId}* saiu para entrega! Estará consigo em breve. 💨`;
  }
  if (orderType === "pickup") {
    return `✅ *${restaurantName}*\n\nO seu pedido *#${shortId}* está pronto para levantar no balcão! 🛍️`;
  }
  return `✅ *${restaurantName}*\n\nO seu pedido *#${shortId}* está pronto para ser servido! 🍽️`;
}

export function msgOrderDelivered(restaurantName: string, shortId: string): string {
  return `🎉 *${restaurantName}*\n\nO seu pedido *#${shortId}* foi entregue! Bom apetite!\n\nObrigado por escolher o ${restaurantName}. 🙏`;
}

export function msgPaymentConfirmed(restaurantName: string, amount: number): string {
  return `💳 *${restaurantName}*\n\nPagamento de *${amount.toLocaleString("pt-PT")} CVE* confirmado! Obrigado.\n\nO seu acesso Dineo foi renovado. ✅`;
}

export function msgDunning(restaurantName: string, daysLeft: number, billingUrl: string): string {
  if (daysLeft >= 4) {
    return `⚠️ *Dineo — ${restaurantName}*\n\nO pagamento da sua subscrição está em atraso. O acesso será suspenso em *${daysLeft} dias*.\n\nRegularize em: ${billingUrl}`;
  }
  return `🚨 *Dineo — ${restaurantName}*\n\nUrgente! A sua conta será suspensa em *${daysLeft} dia${daysLeft > 1 ? "s" : ""}*.\n\nRegularize agora: ${billingUrl}`;
}
