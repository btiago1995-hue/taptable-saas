/**
 * efatura-constants.ts
 *
 * Centraliza todas as variáveis de ambiente e constantes do sistema E-Fatura DNRE.
 * Importar este ficheiro em vez de ler process.env directamente.
 *
 * Variáveis de ambiente necessárias:
 *   EFATURA_ENV          — "dev" | "sandbox" | "production"   (default: "dev")
 *   EFATURA_SW_CODE      — Código de software obtido da DNRE   (ex: "SW-12345")
 *   EFATURA_LED          — LED (série de numeração) registado  (ex: "LED-001")
 *   EFATURA_REPOSITORIO  — 3=Teste, 2=Homologação, 1=Produção  (default: 3)
 *   EFATURA_PRIVATE_KEY  — Chave privada PEM do certificado ICP-CV (produção/sandbox)
 *   DNRE_CLIENT_ID       — OAuth 2.0 client_id da DNRE
 *   DNRE_CLIENT_SECRET   — OAuth 2.0 client_secret da DNRE
 */

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

export type EfaturaEnv = "dev" | "sandbox" | "production";

export const EFATURA_ENV: EfaturaEnv =
  (process.env.EFATURA_ENV as EfaturaEnv) || "dev";

export const EFATURA_IS_PROD = EFATURA_ENV === "production";
export const EFATURA_IS_SANDBOX = EFATURA_ENV === "sandbox";
export const EFATURA_IS_DEV = EFATURA_ENV === "dev";

// ---------------------------------------------------------------------------
// Identificação do software (obtida na Fase 0 com a DNRE)
// ---------------------------------------------------------------------------

export const EFATURA_SW_CODE: string =
  process.env.EFATURA_SW_CODE || "SW-00000";

export const EFATURA_LED: string =
  process.env.EFATURA_LED || "LED-000";

/** Repositório DNRE: 3=Teste, 2=Homologação, 1=Produção */
export const EFATURA_REPOSITORIO: number =
  parseInt(process.env.EFATURA_REPOSITORIO || "3", 10);

// ---------------------------------------------------------------------------
// OAuth 2.0 / API DNRE
// ---------------------------------------------------------------------------

export const DNRE_CLIENT_ID: string =
  process.env.DNRE_CLIENT_ID || "";

export const DNRE_CLIENT_SECRET: string =
  process.env.DNRE_CLIENT_SECRET || "";

/** URL base da API DNRE (mesmo URL para todos os repositórios) */
export const DNRE_API_BASE = "https://pe.efatura.cv";

export const DNRE_TOKEN_URL = `${DNRE_API_BASE}/oauth/token`;
export const DNRE_INVOICES_URL = `${DNRE_API_BASE}/api/v1/invoices`;

// ---------------------------------------------------------------------------
// Regras fiscais
// ---------------------------------------------------------------------------

/** Limite acima do qual o NIF do cliente é obrigatório (em CVE) */
export const EFATURA_LIMITE_NIF_OBRIGATORIO = 20_000;

// ---------------------------------------------------------------------------
// Validação de configuração
// ---------------------------------------------------------------------------

/**
 * Verifica se as credenciais DNRE estão configuradas.
 * Usar antes de tentar submeter documentos à API.
 */
export function efaturaCredenciaisConfiguradas(): boolean {
  return !!(DNRE_CLIENT_ID && DNRE_CLIENT_SECRET);
}

/**
 * Verifica se o certificado RSA está disponível (para sandbox/produção).
 */
export function efaturaCertificadoConfigurado(): boolean {
  return !!(process.env.EFATURA_PRIVATE_KEY);
}
