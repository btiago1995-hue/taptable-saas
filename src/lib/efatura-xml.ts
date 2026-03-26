/**
 * efatura-xml.ts
 *
 * Motor de geração de XML para o sistema E-Fatura DNRE (Cabo Verde).
 * Gera documentos TVE (FS), FTE (FT), NCE (NC) conforme especificação DNRE.
 *
 * NOTA: O namespace e estrutura exactos dependem do XSD oficial da DNRE.
 * Este ficheiro foi construído com base na especificação conhecida.
 * Quando o XSD oficial for obtido (Fase 0, passo 0.7), validar e ajustar.
 *
 * Tipos de documento:
 *   FS / TVE — Fatura Simplificada (consumidor final sem NIF)
 *   FT / FTE — Fatura (com NIF do cliente)
 *   NC / NCE — Nota de Crédito (cancelamento, referencia documento original)
 *   FR       — Fatura-Recibo
 *   GT       — Guia de Transporte
 */

import { type TipoDocumento } from "./efatura";
import {
  EFATURA_SW_CODE,
  EFATURA_LED,
  EFATURA_REPOSITORIO,
  EFATURA_ENV,
} from "./efatura-constants";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ItemDocumento {
  codigo: string;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  /** Taxa IVA em % (0 para regime de isenção) */
  taxaIva?: number;
  /** Código de isenção IVA (ex: "M40" para restauração CV) */
  codigoIsencao?: string;
}

export interface EmitenteDNRE {
  nif: string;
  nome: string;
  morada: string;
  cidade?: string;
  pais?: string;
}

export interface DestinatarioDNRE {
  nif: string;
  nome: string;
}

export interface BuildDocumentoXmlParams {
  /** IUD de 45 chars gerado por gerarIUD() */
  iud: string;
  tipoDocumento: TipoDocumento;
  /** Número formatado (ex: "FS 2026/00000001") */
  numeroDoc: string;
  /** Número sequencial (ex: 1) */
  numeroSequencial: number;
  emitente: EmitenteDNRE;
  /** Obrigatório quando tipoDocumento === "FT" ou total >= 20.000 CVE */
  destinatario?: DestinatarioDNRE | null;
  items: ItemDocumento[];
  /** Total bruto em CVE (escudos inteiros) */
  totalBruto: number;
  dataHoraEmissao: Date;
  /** Hash de 22 chars deste documento (do IUDResult) */
  hashDocumento: string;
  /** Hash do documento anterior para cadeia de integridade */
  hashAnterior?: string;
}

export interface BuildNotaCreditoXmlParams extends BuildDocumentoXmlParams {
  /** IUD do documento original que está a ser anulado */
  iudOriginal: string;
  /** Motivo da anulação */
  motivoAnulacao?: string;
}

// ---------------------------------------------------------------------------
// Utilitários XML
// ---------------------------------------------------------------------------

/** Escapa caracteres especiais XML */
function esc(str: string | number | null | undefined): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Formata data para ISO 8601 sem milissegundos */
function fmtDataHora(date: Date): string {
  return date.toISOString().substring(0, 19);
}

/** Formata data apenas (YYYY-MM-DD) */
function fmtData(date: Date): string {
  return date.toISOString().substring(0, 10);
}

/** Formata valor monetário com 2 casas decimais */
function fmtMontante(valor: number): string {
  return valor.toFixed(2);
}

// ---------------------------------------------------------------------------
// Builders de secções XML comuns
// ---------------------------------------------------------------------------

function buildCabecalho(params: BuildDocumentoXmlParams): string {
  const {
    iud,
    tipoDocumento,
    numeroDoc,
    numeroSequencial,
    emitente,
    dataHoraEmissao,
    hashDocumento,
    hashAnterior,
  } = params;

  return `  <Cabecalho>
    <Repositorio>${EFATURA_REPOSITORIO}</Repositorio>
    <CodigoSoftware>${esc(EFATURA_SW_CODE)}</CodigoSoftware>
    <LED>${esc(EFATURA_LED)}</LED>
    <IUD>${esc(iud)}</IUD>
    <TipoDocumento>${esc(tipoDocumento)}</TipoDocumento>
    <NumeroDocumento>${esc(numeroDoc)}</NumeroDocumento>
    <NumeroSequencial>${numeroSequencial}</NumeroSequencial>
    <DataHoraEmissao>${fmtDataHora(dataHoraEmissao)}</DataHoraEmissao>
    <DataEmissao>${fmtData(dataHoraEmissao)}</DataEmissao>
    <Hash>${esc(hashDocumento)}</Hash>
    <HashAnterior>${esc(hashAnterior || "0")}</HashAnterior>
    <NifEmitente>${esc(emitente.nif)}</NifEmitente>
    <NomeEmitente>${esc(emitente.nome)}</NomeEmitente>
    <MoradaEmitente>${esc(emitente.morada)}</MoradaEmitente>
    <CidadeEmitente>${esc(emitente.cidade || "Praia")}</CidadeEmitente>
    <PaisEmitente>${esc(emitente.pais || "CV")}</PaisEmitente>
  </Cabecalho>`;
}

function buildDestinatario(dest: DestinatarioDNRE | null | undefined): string {
  if (!dest) {
    return `  <Destinatario>
    <NifDestinatario>CONSUMIDOR-FINAL</NifDestinatario>
    <NomeDestinatario>Consumidor Final</NomeDestinatario>
  </Destinatario>`;
  }
  return `  <Destinatario>
    <NifDestinatario>${esc(dest.nif)}</NifDestinatario>
    <NomeDestinatario>${esc(dest.nome)}</NomeDestinatario>
  </Destinatario>`;
}

function buildLinhas(items: ItemDocumento[]): string {
  return items
    .map(
      (item, idx) => `  <Linha>
    <NumeroLinha>${idx + 1}</NumeroLinha>
    <CodigoProduto>${esc(item.codigo.substring(0, 30))}</CodigoProduto>
    <DescricaoProduto>${esc(item.descricao)}</DescricaoProduto>
    <Quantidade>${item.quantidade.toFixed(2)}</Quantidade>
    <PrecoUnitario>${fmtMontante(item.precoUnitario)}</PrecoUnitario>
    <TotalLinha>${fmtMontante(item.total)}</TotalLinha>
    <TaxaIva>${(item.taxaIva ?? 0).toFixed(2)}</TaxaIva>${item.codigoIsencao ? `\n    <CodigoIsencao>${esc(item.codigoIsencao)}</CodigoIsencao>` : ""}
  </Linha>`
    )
    .join("\n");
}

function buildTotais(items: ItemDocumento[], totalBruto: number): string {
  const totalIva = items.reduce((s, item) => {
    const iva = ((item.taxaIva ?? 0) / 100) * item.total;
    return s + iva;
  }, 0);
  const totalSemIva = totalBruto - totalIva;

  return `  <Totais>
    <TotalSemIva>${fmtMontante(totalSemIva)}</TotalSemIva>
    <TotalIva>${fmtMontante(totalIva)}</TotalIva>
    <TotalBruto>${fmtMontante(totalBruto)}</TotalBruto>
  </Totais>`;
}

// ---------------------------------------------------------------------------
// Gerador principal — TVE / FTE
// ---------------------------------------------------------------------------

/**
 * Constrói o XML de um documento E-Fatura (TVE/FTE/FR/GT).
 *
 * @example
 * const xml = buildDocumentoXml({
 *   iud: "200123456FS202600000001A3F9C2E1B8D47F6A09E5",
 *   tipoDocumento: "FS",
 *   numeroDoc: "FS 2026/00000001",
 *   numeroSequencial: 1,
 *   emitente: { nif: "200123456", nome: "Restaurante X", morada: "Rua Y" },
 *   items: [{ codigo: "pizza", descricao: "Pizza Margherita", quantidade: 1, precoUnitario: 1500, total: 1500 }],
 *   totalBruto: 1500,
 *   dataHoraEmissao: new Date(),
 *   hashDocumento: "A3F9C2E1B8D47F6A09E5AB",
 * });
 */
export function buildDocumentoXml(params: BuildDocumentoXmlParams): string {
  const { tipoDocumento, items, totalBruto, destinatario } = params;

  const xmlDeclaration = `<?xml version="1.0" encoding="UTF-8"?>`;
  const rootTag = tipoDocumento === "FT" ? "FTE" : tipoDocumento === "NC" ? "NCE" : "TVE";

  return `${xmlDeclaration}
<${rootTag} xmlns="urn:cv:efatura:dfe:${rootTag.toLowerCase()}:v1">
${buildCabecalho(params)}
${buildDestinatario(destinatario)}
${buildLinhas(items)}
${buildTotais(items, totalBruto)}
</${rootTag}>`;
}

// ---------------------------------------------------------------------------
// Gerador Nota de Crédito (NCE)
// ---------------------------------------------------------------------------

/**
 * Constrói o XML de uma Nota de Crédito que cancela um documento anterior.
 * A NCE deve referenciar o IUD do documento original.
 */
export function buildNotaCreditoXml(params: BuildNotaCreditoXmlParams): string {
  const { iudOriginal, motivoAnulacao, items, totalBruto, destinatario } = params;

  // Nota de crédito usa valores negativos nas linhas
  const itemsNC = items.map((item) => ({
    ...item,
    total: -Math.abs(item.total),
    precoUnitario: -Math.abs(item.precoUnitario),
  }));

  return `<?xml version="1.0" encoding="UTF-8"?>
<NCE xmlns="urn:cv:efatura:dfe:nce:v1">
${buildCabecalho({ ...params, tipoDocumento: "NC" })}
  <ReferenciaDocumento>
    <IUDOriginal>${esc(iudOriginal)}</IUDOriginal>
    <MotivoAnulacao>${esc(motivoAnulacao || "Anulação de documento")}</MotivoAnulacao>
  </ReferenciaDocumento>
${buildDestinatario(destinatario)}
${buildLinhas(itemsNC)}
${buildTotais(itemsNC, -Math.abs(totalBruto))}
</NCE>`;
}

// ---------------------------------------------------------------------------
// Helper: converter items de pedido para ItemDocumento
// ---------------------------------------------------------------------------

/**
 * Converte os order_items do Supabase para o formato ItemDocumento do XML.
 */
export function orderItemsParaDocumento(
  orderItems: { id: string; name: string; price: number; quantity: number }[]
): ItemDocumento[] {
  return orderItems.map((item) => ({
    codigo: item.id.substring(0, 30),
    descricao: item.name || "Produto",
    quantidade: Number(item.quantity) || 1,
    precoUnitario: Number(item.price) || 0,
    total: (Number(item.price) || 0) * (Number(item.quantity) || 1),
    taxaIva: 0,
    // Código de isenção CV para restauração — confirmar com DNRE quando XSD disponível
    codigoIsencao: EFATURA_ENV !== "dev" ? "ISE" : undefined,
  }));
}
