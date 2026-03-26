/**
 * efatura-dnre.ts
 *
 * Cliente OAuth 2.0 + submissão de documentos à API DNRE (Cabo Verde).
 * Endpoint: https://pe.efatura.cv/api/v1/invoices
 *
 * Fluxo:
 *   1. obterTokenDNRE()     — OAuth 2.0 client_credentials
 *   2. submeterDocumentoDNRE() — POST XML assinado
 *   3. Resultado: autorizado | rejeitado | erro
 *
 * O token é cacheado em memória com TTL automático para evitar
 * um pedido OAuth por cada documento emitido.
 */

import {
  DNRE_TOKEN_URL,
  DNRE_INVOICES_URL,
  DNRE_CLIENT_ID,
  DNRE_CLIENT_SECRET,
  EFATURA_REPOSITORIO,
  efaturaCredenciaisConfiguradas,
} from "./efatura-constants";

// ---------------------------------------------------------------------------
// Cache de token OAuth
// ---------------------------------------------------------------------------

interface TokenCache {
  token: string;
  expiresAt: number; // timestamp ms
}

let _tokenCache: TokenCache | null = null;

/** Margem de segurança antes de expirar o token (30 segundos) */
const TOKEN_EXPIRY_MARGIN_MS = 30_000;

// ---------------------------------------------------------------------------
// OAuth 2.0
// ---------------------------------------------------------------------------

/**
 * Obtém (ou reutiliza do cache) o token de acesso OAuth 2.0 da DNRE.
 * Usa o fluxo `client_credentials`.
 *
 * @throws {Error} Se as credenciais não estiverem configuradas ou o pedido falhar
 */
export async function obterTokenDNRE(): Promise<string> {
  // Verificar cache
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - TOKEN_EXPIRY_MARGIN_MS) {
    return _tokenCache.token;
  }

  if (!efaturaCredenciaisConfiguradas()) {
    throw new Error(
      "Credenciais DNRE não configuradas. " +
      "Definir DNRE_CLIENT_ID e DNRE_CLIENT_SECRET nas variáveis de ambiente."
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: DNRE_CLIENT_ID,
    client_secret: DNRE_CLIENT_SECRET,
  });

  const resp = await fetch(DNRE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const texto = await resp.text().catch(() => "");
    throw new Error(
      `DNRE OAuth falhou (${resp.status}): ${texto}`
    );
  }

  const json = await resp.json();
  const { access_token, expires_in } = json as {
    access_token: string;
    expires_in?: number;
  };

  if (!access_token) {
    throw new Error("DNRE OAuth: resposta sem access_token");
  }

  // Cache por expires_in segundos (default: 3600)
  _tokenCache = {
    token: access_token,
    expiresAt: Date.now() + (expires_in ?? 3600) * 1000,
  };

  return access_token;
}

/** Força limpeza do cache de token (útil após erros 401) */
export function limparCacheTokenDNRE(): void {
  _tokenCache = null;
}

// ---------------------------------------------------------------------------
// Submissão de documentos
// ---------------------------------------------------------------------------

export interface RespostaDNRE {
  /** true se DNRE aceitou e autorizou o documento */
  autorizado: boolean;
  /** Código de autorização DNRE (quando autorizado) */
  codigoAutorizacao?: string;
  /** Mensagem de erro da DNRE (quando rejeitado) */
  erro?: string;
  /** Código de erro DNRE (quando rejeitado) */
  codigoErro?: string;
  /** Resposta HTTP raw para debug */
  httpStatus: number;
}

/**
 * Submete um documento XML assinado à API DNRE.
 *
 * @param xmlAssinado - XML completo do documento (TVE/FTE/NCE)
 * @returns Resultado da submissão com código de autorização ou erro
 *
 * @example
 * const resultado = await submeterDocumentoDNRE(xmlAssinado);
 * if (resultado.autorizado) {
 *   console.log("Autorizado:", resultado.codigoAutorizacao);
 * }
 */
export async function submeterDocumentoDNRE(
  xmlAssinado: string
): Promise<RespostaDNRE> {
  let token: string;
  try {
    token = await obterTokenDNRE();
  } catch (err: any) {
    return {
      autorizado: false,
      erro: `Falha na autenticação OAuth: ${err.message}`,
      httpStatus: 0,
    };
  }

  let resp: Response;
  try {
    resp = await fetch(DNRE_INVOICES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/xml; charset=utf-8",
        "X-Repositorio": String(EFATURA_REPOSITORIO),
      },
      body: xmlAssinado,
    });
  } catch (err: any) {
    // Erro de rede — activar modo offline
    return {
      autorizado: false,
      erro: `Erro de rede ao contactar DNRE: ${err.message}`,
      httpStatus: 0,
    };
  }

  // Token expirado — limpar cache e retornar para retry pelo caller
  if (resp.status === 401) {
    limparCacheTokenDNRE();
    return {
      autorizado: false,
      erro: "Token DNRE expirado. Tentar novamente.",
      codigoErro: "TOKEN_EXPIRED",
      httpStatus: 401,
    };
  }

  const corpo = await resp.text().catch(() => "");

  if (resp.ok) {
    // Tentar extrair código de autorização do XML de resposta
    const matchAutorizacao = corpo.match(/<CodigoAutorizacao>([^<]+)<\/CodigoAutorizacao>/);
    const codigoAutorizacao = matchAutorizacao?.[1] || `DNRE-${Date.now()}`;

    return {
      autorizado: true,
      codigoAutorizacao,
      httpStatus: resp.status,
    };
  }

  // Resposta de erro — extrair código e mensagem
  const matchCodigo = corpo.match(/<Codigo>([^<]+)<\/Codigo>/);
  const matchMensagem = corpo.match(/<Mensagem>([^<]+)<\/Mensagem>/);

  return {
    autorizado: false,
    erro: matchMensagem?.[1] || corpo || `Erro HTTP ${resp.status}`,
    codigoErro: matchCodigo?.[1],
    httpStatus: resp.status,
  };
}

// ---------------------------------------------------------------------------
// Submissão com retry automático (1 retry após 401)
// ---------------------------------------------------------------------------

/**
 * Submete documento com retry automático após token expirado.
 * Usa submeterDocumentoDNRE internamente.
 */
export async function submeterDocumentoDNREComRetry(
  xmlAssinado: string
): Promise<RespostaDNRE> {
  const resultado = await submeterDocumentoDNRE(xmlAssinado);

  // Retry uma vez se token expirou
  if (resultado.codigoErro === "TOKEN_EXPIRED") {
    return submeterDocumentoDNRE(xmlAssinado);
  }

  return resultado;
}
