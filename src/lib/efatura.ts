/**
 * Dineo SaaS — Motor E-Fatura (DNRE / Cabo Verde)
 *
 * Geração do IUD — Identificador Único de Documento
 * Conforme especificações técnicas do Sistema E-Fatura da DNRE
 *
 * Estrutura do IUD (45 caracteres):
 * ┌──────────────────────────────────────────────────────────┐
 * │ NIF_EMITENTE │ TIPO_DOC │  ANO  │ SEQUENCIAL │   HASH   │
 * │    9 chars   │  2 chars │4 chars│  8 chars   │ 22 chars │
 * └──────────────────────────────────────────────────────────┘
 * Total: 9 + 2 + 4 + 8 + 22 = 45 caracteres
 *
 * Referência: Especificação técnica E-Fatura DNRE, Artigo 8.º
 *
 * NOTA PARA HOMOLOGAÇÃO:
 * Para certificação plena pela DNRE, a função de hash deve ser substituída
 * por assinatura RSA-SHA1 com chave privada emitida pela DNRE.
 * Esta implementação usa HMAC-SHA256 (truncado a 22 chars) para o ambiente
 * de desenvolvimento/homologação, sendo estruturalmente idêntica à produção.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/**
 * Tipos de documento fiscal reconhecidos pelo E-Fatura.
 *
 * FS — Fatura Simplificada (consumidor final, sem NIF do cliente)
 * FT — Fatura (com NIF do cliente)
 * FR — Fatura-Recibo (fatura + prova de pagamento)
 * GT — Guia de Transporte (acompanha entrega/delivery)
 * NC — Nota de Crédito
 * ND — Nota de Débito
 */
export type TipoDocumento = "FS" | "FT" | "FR" | "GT" | "NC" | "ND";

export interface IUDParams {
  /** NIF do restaurante emitente (até 9 dígitos, preenchido com zeros à esquerda) */
  nifEmitente: string;
  /** Tipo de documento fiscal */
  tipoDocumento: TipoDocumento;
  /** Ano de emissão (ex: 2026) */
  ano: number;
  /** Número sequencial único do documento no ano (começa em 1) */
  numeroSequencial: number;
  /** Data e hora exata de emissão do documento */
  dataHoraEmissao: Date;
  /** Valor total bruto do documento em CVE (escudos inteiros) */
  totalBruto: number;
  /**
   * Hash do documento imediatamente anterior da mesma série.
   * Usar "0" para o primeiro documento do ano/série.
   * Esta cadeia garante a integridade sequencial (não-repúdio).
   */
  hashAnterior: string;
}

export interface IUDResult {
  /** IUD completo — 45 caracteres alfanuméricos maiúsculos */
  iud: string;
  /**
   * Hash de 22 chars deste documento.
   * Deve ser passado como `hashAnterior` ao próximo documento da mesma série.
   * Persistir na coluna `document_hash` da tabela `orders`.
   */
  hash: string;
  /** Número do documento formatado para impressão (ex: "FS 2026/00000001") */
  numeroDoc: string;
  /** Número sequencial com 8 dígitos (ex: "00000001") */
  sequencialFormatado: string;
}

// ---------------------------------------------------------------------------
// Funções auxiliares
// ---------------------------------------------------------------------------

/** Preenche string com zeros à esquerda até atingir o comprimento desejado */
function padStart(value: string | number, length: number): string {
  return String(value).padStart(length, "0");
}

/**
 * Formata data para o padrão E-Fatura: "YYYY-MM-DDTHH:MM:SS"
 * Usar sempre UTC para consistência entre zonas horárias.
 */
function formatDataHora(date: Date): string {
  const iso = date.toISOString(); // "2026-03-21T14:30:00.000Z"
  return iso.substring(0, 19);    // "2026-03-21T14:30:00"
}

// ---------------------------------------------------------------------------
// Motor de hash (Web Crypto API — disponível em Node.js 18+, Edge Runtime)
// ---------------------------------------------------------------------------

/**
 * Calcula o hash E-Fatura de um documento.
 *
 * String de entrada (delimitada por ponto-e-vírgula):
 *   dataHoraEmissao;numeroSequencial;totalBruto;hashAnterior
 *
 * Algoritmo: HMAC-SHA256 com chave derivada do NIF (homologação).
 * Produção: substituir por RSA-SHA1 com certificado DNRE.
 *
 * Retorna os primeiros 22 caracteres do digest em hexadecimal maiúsculo.
 */
export async function calcularHashDocumento(params: {
  nifEmitente: string;
  dataHoraEmissao: string;
  numeroSequencial: string;
  totalBruto: number;
  hashAnterior: string;
}): Promise<string> {
  const { nifEmitente, dataHoraEmissao, numeroSequencial, totalBruto, hashAnterior } = params;

  // String canónica do documento — ordem é parte do protocolo
  const mensagem = [
    dataHoraEmissao,
    numeroSequencial,
    String(totalBruto),
    hashAnterior,
  ].join(";");

  // Chave HMAC derivada do NIF (homologação — sem PKI)
  const chaveHex = nifEmitente.padEnd(32, "0"); // 32 chars para key material
  const chaveBytes = new TextEncoder().encode(chaveHex);
  const mensagemBytes = new TextEncoder().encode(mensagem);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    chaveBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const assinatura = await crypto.subtle.sign("HMAC", cryptoKey, mensagemBytes);

  // Converter para hex maiúsculo e truncar para 22 chars
  const hexCompleto = Array.from(new Uint8Array(assinatura))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  return hexCompleto.substring(0, 22);
}

// ---------------------------------------------------------------------------
// Gerador principal do IUD
// ---------------------------------------------------------------------------

/**
 * Gera o IUD (Identificador Único de Documento) conforme E-Fatura DNRE.
 *
 * @example
 * const resultado = await gerarIUD({
 *   nifEmitente: "200123456",
 *   tipoDocumento: "FS",
 *   ano: 2026,
 *   numeroSequencial: 1,
 *   dataHoraEmissao: new Date(),
 *   totalBruto: 2500,
 *   hashAnterior: "0",
 * });
 * // resultado.iud → "200123456FS202600000001A3F9C2E1B8D47F6A09E5"
 * // resultado.iud.length === 45 ✓
 */
export async function gerarIUD(params: IUDParams): Promise<IUDResult> {
  const { nifEmitente, tipoDocumento, ano, numeroSequencial, dataHoraEmissao, totalBruto, hashAnterior } = params;

  // Formatar cada segmento conforme especificação
  const nifFormatado = padStart(nifEmitente.replace(/\D/g, ""), 9); // 9 dígitos
  const anoFormatado = String(ano);                                  // 4 dígitos
  const seqFormatado = padStart(numeroSequencial, 8);                // 8 dígitos
  const dataHoraStr = formatDataHora(dataHoraEmissao);

  // Calcular hash de 22 chars
  const hash = await calcularHashDocumento({
    nifEmitente: nifFormatado,
    dataHoraEmissao: dataHoraStr,
    numeroSequencial: seqFormatado,
    totalBruto,
    hashAnterior,
  });

  // Montar IUD: 9 + 2 + 4 + 8 + 22 = 45
  const iud = `${nifFormatado}${tipoDocumento}${anoFormatado}${seqFormatado}${hash}`;

  // Sanidade: garantir exactamente 45 caracteres
  if (iud.length !== 45) {
    throw new Error(
      `IUD inválido: comprimento ${iud.length} (esperado 45). Segmentos: NIF=${nifFormatado} Tipo=${tipoDocumento} Ano=${anoFormatado} Seq=${seqFormatado} Hash=${hash}`
    );
  }

  return {
    iud,
    hash,
    numeroDoc: `${tipoDocumento} ${anoFormatado}/${seqFormatado}`,
    sequencialFormatado: seqFormatado,
  };
}

// ---------------------------------------------------------------------------
// Validador de IUD (para verificação de documentos recebidos)
// ---------------------------------------------------------------------------

/**
 * Valida a estrutura de um IUD recebido.
 * Não verifica o hash (requer os dados originais do documento).
 */
export function validarEstruturaIUD(iud: string): {
  valido: boolean;
  erros: string[];
  segmentos?: {
    nif: string;
    tipoDocumento: string;
    ano: string;
    sequencial: string;
    hash: string;
  };
} {
  const erros: string[] = [];

  if (typeof iud !== "string") {
    return { valido: false, erros: ["IUD deve ser uma string"] };
  }

  if (iud.length !== 45) {
    erros.push(`Comprimento inválido: ${iud.length} (esperado 45)`);
    return { valido: false, erros };
  }

  const nif = iud.substring(0, 9);
  const tipo = iud.substring(9, 11);
  const ano = iud.substring(11, 15);
  const seq = iud.substring(15, 23);
  const hash = iud.substring(23, 45);

  if (!/^\d{9}$/.test(nif)) erros.push(`NIF inválido: "${nif}" (deve ter 9 dígitos)`);
  if (!["FS", "FT", "FR", "GT", "NC", "ND"].includes(tipo)) erros.push(`Tipo de documento inválido: "${tipo}"`);
  if (!/^\d{4}$/.test(ano)) erros.push(`Ano inválido: "${ano}"`);
  if (!/^\d{8}$/.test(seq)) erros.push(`Sequencial inválido: "${seq}"`);
  if (hash.length !== 22) erros.push(`Hash inválido: comprimento ${hash.length} (esperado 22)`);

  if (erros.length > 0) return { valido: false, erros };

  return {
    valido: true,
    erros: [],
    segmentos: { nif, tipoDocumento: tipo, ano, sequencial: seq, hash },
  };
}

// ---------------------------------------------------------------------------
// Utilitários de formatação para UI
// ---------------------------------------------------------------------------

/** Formata IUD para exibição legível: "XXXXXXXXX FS 2026 00000001 XXXXXXXXXXXXXXXXXXXXXX" */
export function formatarIUDDisplay(iud: string): string {
  if (iud.length !== 45) return iud;
  return `${iud.substring(0, 9)} ${iud.substring(9, 11)} ${iud.substring(11, 15)} ${iud.substring(15, 23)} ${iud.substring(23)}`;
}

/** Retorna o tipo de documento a partir do IUD */
export function getTipoDocumentoIUD(iud: string): TipoDocumento | null {
  if (iud.length < 11) return null;
  const tipo = iud.substring(9, 11) as TipoDocumento;
  return ["FS", "FT", "FR", "GT", "NC", "ND"].includes(tipo) ? tipo : null;
}

/**
 * Determina o tipo de documento E-Fatura adequado com base nos dados do pedido.
 *
 * Regra DNRE:
 * - Cliente com NIF → FT (Fatura)
 * - Delivery (com guia de transporte) → GT (Guia de Transporte)
 * - Consumidor final sem NIF → FS (Fatura Simplificada)
 */
export function determinarTipoDocumento(opts: {
  customerNif?: string | null;
  isDelivery?: boolean;
  isGuiaTransporte?: boolean;
}): TipoDocumento {
  if (opts.isGuiaTransporte) return "GT";
  if (opts.customerNif) return "FT";
  return "FS";
}
