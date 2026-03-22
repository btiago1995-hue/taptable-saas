/**
 * Validação de NIF para Cabo Verde (CV) e Portugal (PT)
 *
 * NIF Cabo Verde (DNRE):
 * - 9 dígitos numéricos
 * - Pessoas singulares: começa por 1, 2 (nacionais) ou 3 (estrangeiros)
 * - Empresas/Colectivos: começa por 5, 6, 7, 8
 * - Não pode ser todo zeros
 *
 * NIF Portugal (AT):
 * - 9 dígitos numéricos
 * - Dígito de controlo (módulo 11)
 * - Prefixos válidos: 1,2 (pessoas singulares), 5 (colectivos), 6 (AP), 7,8,9 (outros)
 */

export type NIFCountry = "CV" | "PT";

export interface NIFValidationResult {
  valid: boolean;
  country?: NIFCountry;
  error?: string;
}

/** Remove espaços, traços e pontos do NIF */
function normalizeNIF(nif: string): string {
  return nif.replace(/[\s.\-]/g, "").trim();
}

/** Valida NIF de Cabo Verde */
export function validarNIFCV(nif: string): NIFValidationResult {
  const n = normalizeNIF(nif);
  if (!/^\d{9}$/.test(n)) {
    return { valid: false, error: "NIF de Cabo Verde deve ter 9 dígitos numéricos" };
  }
  if (/^0+$/.test(n)) {
    return { valid: false, error: "NIF inválido" };
  }
  const prefix = parseInt(n[0]);
  const validPrefixes = [1, 2, 3, 5, 6, 7, 8];
  if (!validPrefixes.includes(prefix)) {
    return { valid: false, error: `NIF de Cabo Verde inválido (prefixo ${prefix} não reconhecido)` };
  }
  return { valid: true, country: "CV" };
}

/** Valida NIF de Portugal (dígito de controlo módulo 11) */
export function validarNIFPT(nif: string): NIFValidationResult {
  const n = normalizeNIF(nif);
  if (!/^\d{9}$/.test(n)) {
    return { valid: false, error: "NIF de Portugal deve ter 9 dígitos numéricos" };
  }
  const validPrefixes = ["1", "2", "3", "45", "5", "6", "70", "71", "72", "74", "75", "77", "78", "79", "8", "90", "91", "98", "99"];
  const hasValidPrefix = validPrefixes.some(p => n.startsWith(p));
  if (!hasValidPrefix) {
    return { valid: false, error: "NIF de Portugal com prefixo inválido" };
  }
  // Dígito de controlo
  const digits = n.split("").map(Number);
  const sum = digits[0] * 9 + digits[1] * 8 + digits[2] * 7 + digits[3] * 6 +
              digits[4] * 5 + digits[5] * 4 + digits[6] * 3 + digits[7] * 2;
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;
  if (digits[8] !== checkDigit) {
    return { valid: false, error: "NIF de Portugal com dígito de controlo inválido" };
  }
  return { valid: true, country: "PT" };
}

/**
 * Valida NIF sem saber o país — tenta CV primeiro, depois PT.
 * Útil para formulários onde o utilizador não especifica o país.
 */
export function validarNIF(nif: string): NIFValidationResult {
  if (!nif || typeof nif !== "string") {
    return { valid: false, error: "NIF não pode estar vazio" };
  }
  const n = normalizeNIF(nif);
  if (n.length !== 9) {
    return { valid: false, error: "NIF deve ter 9 dígitos" };
  }
  const cv = validarNIFCV(n);
  if (cv.valid) return cv;
  const pt = validarNIFPT(n);
  if (pt.valid) return pt;
  return { valid: false, error: "NIF inválido para Cabo Verde ou Portugal" };
}
