/**
 * efatura-qrcode.ts
 *
 * Geração de URL e dados para QR Code E-Fatura DNRE.
 * O QR code nos recibos permite ao cliente verificar a autenticidade
 * do documento directamente no portal da DNRE.
 *
 * URL de verificação: https://pe.efatura.cv/dfe/view/{IUD}
 */

import { DNRE_API_BASE } from "./efatura-constants";

// ---------------------------------------------------------------------------
// URL de verificação pública
// ---------------------------------------------------------------------------

/**
 * Gera a URL pública de verificação do documento E-Fatura.
 * Esta URL é colocada no QR code impresso/exibido no recibo.
 *
 * @param iud - IUD de 45 caracteres do documento
 * @returns URL de verificação no portal DNRE
 *
 * @example
 * gerarUrlVerificacaoIUD("200123456FS202600000001A3F9C2E1B8D47F6A09E5")
 * // → "https://pe.efatura.cv/dfe/view/200123456FS202600000001A3F9C2E1B8D47F6A09E5"
 */
export function gerarUrlVerificacaoIUD(iud: string): string {
  return `${DNRE_API_BASE}/dfe/view/${iud}`;
}

// ---------------------------------------------------------------------------
// Dados estruturados para componente QR Code
// ---------------------------------------------------------------------------

export interface QRCodeData {
  /** URL a codificar no QR code */
  url: string;
  /** IUD do documento */
  iud: string;
  /** Número do documento formatado (ex: "FS 2026/00000001") */
  numeroDoc: string;
  /** Texto de legenda a mostrar sob o QR code */
  legenda: string;
}

/**
 * Prepara todos os dados necessários para renderizar o QR code no recibo.
 */
export function prepararDadosQRCode(params: {
  iud: string;
  numeroDoc: string;
}): QRCodeData {
  const { iud, numeroDoc } = params;
  return {
    url: gerarUrlVerificacaoIUD(iud),
    iud,
    numeroDoc,
    legenda: `Documento E-Fatura: ${numeroDoc}`,
  };
}

// ---------------------------------------------------------------------------
// Componente React (dados apenas — renderização no componente UI)
// ---------------------------------------------------------------------------

/**
 * Gera o conteúdo do atributo alt/title para o QR code (acessibilidade).
 */
export function gerarAltQRCode(iud: string): string {
  return `QR Code E-Fatura — IUD: ${iud}`;
}
