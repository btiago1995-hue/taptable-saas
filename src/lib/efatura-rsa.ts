/**
 * Dineo SaaS — Assinatura RSA-SHA1 para E-Fatura (DNRE / Cabo Verde)
 *
 * Esta função é usada em produção e sandbox quando o certificado RSA emitido
 * pela DNRE está disponível. Em desenvolvimento usa-se HMAC-SHA256 (ver efatura.ts).
 *
 * Algoritmo exigido pela DNRE: RSASSA-PKCS1-v1_5 com SHA-1
 * Formato de chave esperado: PKCS#8 (-----BEGIN PRIVATE KEY-----)
 *
 * Referência: Especificação técnica E-Fatura DNRE, Artigo 8.º
 */

// ---------------------------------------------------------------------------
// Assinatura RSA-SHA1 (Web Crypto API — disponível em Node.js 18+, Edge Runtime)
// ---------------------------------------------------------------------------

/**
 * Assina uma mensagem com RSA-SHA1 usando a chave privada PEM fornecida pela DNRE.
 *
 * @param mensagem - String canónica do documento (dataHoraEmissao;seq;total;hashAnterior)
 * @param privateKeyPem - Chave privada em formato PEM PKCS#8 completo (com cabeçalho/rodapé)
 * @returns Primeiros 22 chars do digest em hexadecimal maiúsculo (mesmo formato que HMAC dev)
 *
 * @example
 * const hash = await assinarRSASHA1(
 *   "2026-03-21T14:30:00;00000001;2500;0",
 *   process.env.EFATURA_PRIVATE_KEY!
 * );
 * // hash.length === 22 ✓
 */
export async function assinarRSASHA1(
  mensagem: string,
  privateKeyPem: string
): Promise<string> {
  // Remover cabeçalho, rodapé PEM e todos os espaços/newlines
  // Suporta PKCS#8: "-----BEGIN PRIVATE KEY-----"
  const pemLimpo = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");

  // Decodificar base64 para ArrayBuffer
  const binaryStr = atob(pemLimpo);
  const keyBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    keyBytes[i] = binaryStr.charCodeAt(i);
  }

  // Importar chave privada PKCS#8 para Web Crypto
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-1",
    },
    false,
    ["sign"]
  );

  // Assinar a mensagem
  const mensagemBytes = new TextEncoder().encode(mensagem);
  const assinatura = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    mensagemBytes
  );

  // Converter para hex maiúsculo e truncar para 22 chars (formato IUD)
  const hexCompleto = Array.from(new Uint8Array(assinatura))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  return hexCompleto.substring(0, 22);
}
