/**
 * Teste local do gerador de IUD E-Fatura
 * Executar: node test_efatura_iud.mjs
 */

// Reprodução das funções em JS puro para testar sem compilar TypeScript

async function padStart(value, length) {
  return String(value).padStart(length, "0");
}

function formatDataHora(date) {
  return date.toISOString().substring(0, 19);
}

async function calcularHashDocumento({ nifEmitente, dataHoraEmissao, numeroSequencial, totalBruto, hashAnterior }) {
  const mensagem = [dataHoraEmissao, numeroSequencial, String(totalBruto), hashAnterior].join(";");
  const chaveHex = nifEmitente.padEnd(32, "0");
  const chaveBytes = new TextEncoder().encode(chaveHex);
  const mensagemBytes = new TextEncoder().encode(mensagem);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", chaveBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const assinatura = await crypto.subtle.sign("HMAC", cryptoKey, mensagemBytes);
  const hexCompleto = Array.from(new Uint8Array(assinatura))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return hexCompleto.substring(0, 22);
}

async function gerarIUD({ nifEmitente, tipoDocumento, ano, numeroSequencial, dataHoraEmissao, totalBruto, hashAnterior }) {
  const nifFormatado = nifEmitente.replace(/\D/g, "").padStart(9, "0");
  const anoFormatado = String(ano);
  const seqFormatado = String(numeroSequencial).padStart(8, "0");
  const dataHoraStr = formatDataHora(dataHoraEmissao);

  const hash = await calcularHashDocumento({
    nifEmitente: nifFormatado,
    dataHoraEmissao: dataHoraStr,
    numeroSequencial: seqFormatado,
    totalBruto,
    hashAnterior,
  });

  const iud = `${nifFormatado}${tipoDocumento}${anoFormatado}${seqFormatado}${hash}`;
  return { iud, hash, numeroDoc: `${tipoDocumento} ${anoFormatado}/${seqFormatado}`, sequencialFormatado: seqFormatado };
}

// ---------------------------------------------------------------------------
// TESTES
// ---------------------------------------------------------------------------

console.log("=== Teste IUD E-Fatura — Dineo SaaS ===\n");

// Teste 1: Fatura Simplificada (consumidor final)
const t1 = await gerarIUD({
  nifEmitente: "200123456",
  tipoDocumento: "FS",
  ano: 2026,
  numeroSequencial: 1,
  dataHoraEmissao: new Date("2026-03-21T14:30:00.000Z"),
  totalBruto: 2500,
  hashAnterior: "0",
});
console.log("📄 Teste 1 — Fatura Simplificada (1.º documento):");
console.log("   IUD:       ", t1.iud);
console.log("   Comprimento:", t1.iud.length, t1.iud.length === 45 ? "✅" : "❌ FALHOU — esperado 45");
console.log("   Número Doc:", t1.numeroDoc);
console.log("   Hash:      ", t1.hash, `(${t1.hash.length} chars)`);
console.log();

// Teste 2: Encadeamento — 2.º documento usa hash do 1.º
const t2 = await gerarIUD({
  nifEmitente: "200123456",
  tipoDocumento: "FS",
  ano: 2026,
  numeroSequencial: 2,
  dataHoraEmissao: new Date("2026-03-21T15:00:00.000Z"),
  totalBruto: 1800,
  hashAnterior: t1.hash, // cadeia
});
console.log("📄 Teste 2 — Encadeamento (2.º documento):");
console.log("   IUD:       ", t2.iud);
console.log("   Comprimento:", t2.iud.length, t2.iud.length === 45 ? "✅" : "❌ FALHOU — esperado 45");
console.log("   Hashes diferentes:", t1.hash !== t2.hash ? "✅" : "❌ ERRO — hashes iguais");
console.log();

// Teste 3: Fatura com NIF do cliente
const t3 = await gerarIUD({
  nifEmitente: "200123456",
  tipoDocumento: "FT",
  ano: 2026,
  numeroSequencial: 1,
  dataHoraEmissao: new Date("2026-03-21T16:00:00.000Z"),
  totalBruto: 12500,
  hashAnterior: "0",
});
console.log("📄 Teste 3 — Fatura com NIF (FT):");
console.log("   IUD:       ", t3.iud);
console.log("   Comprimento:", t3.iud.length, t3.iud.length === 45 ? "✅" : "❌ FALHOU — esperado 45");
console.log();

// Teste 4: Guia de Transporte (delivery)
const t4 = await gerarIUD({
  nifEmitente: "200123456",
  tipoDocumento: "GT",
  ano: 2026,
  numeroSequencial: 1,
  dataHoraEmissao: new Date("2026-03-21T19:00:00.000Z"),
  totalBruto: 3200,
  hashAnterior: "0",
});
console.log("📄 Teste 4 — Guia de Transporte (GT):");
console.log("   IUD:       ", t4.iud);
console.log("   Comprimento:", t4.iud.length, t4.iud.length === 45 ? "✅" : "❌ FALHOU — esperado 45");
console.log();

// Teste 5: Determinismo — o mesmo input deve gerar o mesmo IUD
const t5a = await gerarIUD({
  nifEmitente: "200123456",
  tipoDocumento: "FS",
  ano: 2026,
  numeroSequencial: 99,
  dataHoraEmissao: new Date("2026-03-21T14:30:00.000Z"),
  totalBruto: 500,
  hashAnterior: "AABBCCDDEEFF00112233",
});
const t5b = await gerarIUD({
  nifEmitente: "200123456",
  tipoDocumento: "FS",
  ano: 2026,
  numeroSequencial: 99,
  dataHoraEmissao: new Date("2026-03-21T14:30:00.000Z"),
  totalBruto: 500,
  hashAnterior: "AABBCCDDEEFF00112233",
});
console.log("📄 Teste 5 — Determinismo:");
console.log("   IUD A:", t5a.iud);
console.log("   IUD B:", t5b.iud);
console.log("   Iguais:", t5a.iud === t5b.iud ? "✅" : "❌ NÃO DETERMINÍSTICO");
console.log();

// Resumo
const todos = [t1, t2, t3, t4, t5a, t5b];
const validos = todos.every(t => t.iud.length === 45);
console.log("=== Resumo ===");
console.log(validos ? "✅ Todos os IUDs têm 45 caracteres" : "❌ Existem IUDs inválidos");
console.log(`   Segmentos de ${t1.iud}:`);
console.log(`   NIF(9):  ${t1.iud.substring(0,9)}`);
console.log(`   Tipo(2): ${t1.iud.substring(9,11)}`);
console.log(`   Ano(4):  ${t1.iud.substring(11,15)}`);
console.log(`   Seq(8):  ${t1.iud.substring(15,23)}`);
console.log(`   Hash(22):${t1.iud.substring(23)}`);
