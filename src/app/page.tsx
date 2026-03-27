"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const features = [
  {
    label: "Cardápio Digital",
    headline: "O seu menu sempre atualizado, diretamente no telemóvel do cliente.",
    body: "Sem impressões, sem filas para pedir. O cliente escaneia o QR, escolhe os pratos com fotos reais e envia para a cozinha em segundos. O menu atualiza em tempo real, sem apps para instalar.",
    aside: "Cardápio QR · Fotos HD · Atualização Instantânea",
    dark: false,
  },
  {
    label: "Cozinha em Controlo",
    headline: "A cozinha recebe cada pedido ao segundo. Sempre.",
    body: "O KDS (Kitchen Display System) exibe cada pedido com alertas sonoros assim que a mesa confirmar. A equipe sabe exatamente o que preparar — sem papéis, sem chamadas, sem falhas de comunicação.",
    aside: "KDS em Tempo Real · Alertas Sonoros · Zero Papel",
    dark: true,
  },
  {
    label: "Gestão de Stock",
    headline: "Saiba o que tem em armazém antes de ficar sem nada.",
    body: "Controle entradas e saídas de ingredientes em tempo real. Receba alertas quando o stock estiver a baixar e evite surpresas no meio do serviço. Integrado diretamente com o POS e os pedidos.",
    aside: "Stock em Tempo Real · Alertas de Ruptura · Integrado ao POS",
    dark: false,
  },
  {
    label: "Relatórios & Analytics",
    headline: "Decida com dados, não com intuição.",
    body: "Veja as vendas do dia, os pratos mais pedidos, o desempenho por mesa e muito mais. Exporte relatórios em CSV para a contabilidade ou partilhe com o seu gestor — tudo a partir do painel.",
    aside: "Vendas Diárias · Exportação CSV · Análise por Período",
    dark: true,
  },
  {
    label: "Delivery & Takeaway",
    headline: "Uma loja online para o seu restaurante, pronta em minutos.",
    body: "Coloque o link do delivery no Instagram ou WhatsApp e comece a receber pedidos agora. O app do entregador acompanha cada encomenda do forno até à porta do cliente.",
    aside: "Link Público · App do Motoboy · Taxa Automática",
    dark: false,
  },
  {
    label: "Pagamentos SISP",
    headline: "Cartão Vinti4 e Dinheiro tudo integrado no mesmo sistema.",
    body: "Feche contas de mesa com TPA integrado da SISP. O caixa gere gorjetas, NIF e emite recibos fiscais conformes com a DNRE — sem maquinetas externas nem duplo registo.",
    aside: "SISP Vinti4 · Fiscal DNRE · Gorjeta & NIF",
    dark: true,
  },
];

type BillingPeriod = "monthly" | "quarterly" | "annual";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: { monthly: 1490, quarterly: 3990, annual: 14900 },
    desc: "Comece a digitalizar o seu salão hoje.",
    items: ["Menu QR Code Dinâmico", "Gestão de Mesas", "Ponto de Venda (POS)", "Dashboard Admin", "Relatórios Básicos", "Equipe até 2 pessoas"],
    cta: "Começar Trial",
    href: "/onboarding?plan=starter",
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: { monthly: 2990, quarterly: 7990, annual: 29900 },
    desc: "O ecossistema completo de restauração.",
    items: ["Tudo do Starter", "KDS de Cozinha em Tempo Real", "App do Garçom", "Delivery \u0026 Guias de Transporte", "Gestão de Stock", "Relatórios Avançados \u0026 CSV", "Analytics \u0026 CRM Real", "Conta Corrente Clientes", "SISP Vinti4"],
    cta: "Testar 30 Dias Grátis",
    href: "/onboarding?plan=growth",
    highlighted: true,
  },
  {
    id: "pro",
    name: "PRO",
    price: { monthly: 5990, quarterly: 15990, annual: 59900 },
    desc: "Operações de alto volume e compliance fiscal.",
    items: ["Tudo do Growth", "SAF-T Export DNRE CV", "Retenções IRS/IRC", "Multi-loja", "Utilizadores Ilimitados", "Suporte Prioritário"],
    cta: "Falar com Comercial",
    href: "/contacto",
    highlighted: false,
  },
];

const BILLING_LABELS: Record<BillingPeriod, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
};

const BILLING_DISCOUNT: Record<BillingPeriod, string | null> = {
  monthly: null,
  quarterly: "Poupa \u223c11%",
  annual: "2 meses grátis",
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">

      {/* ── NAVIGATION ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm z-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-2xl tracking-tight text-slate-900">
              Dineo<span className="text-[#9333ea]">.</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1 hidden sm:inline">by Servyx Labs</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
              <a href="#features" className="hover:text-slate-900 transition-colors">Funcionalidades</a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">Preços</a>
              <Link href="/contacto" className="hover:text-slate-900 transition-colors">Contacto</Link>
              <Link href="/admin/login" className="hover:text-slate-900 transition-colors">Login</Link>
            </div>
            <Link href="/onboarding" className="bg-gradient-to-r from-[#9333ea] to-[#facc15] text-white text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-sm">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="pt-40 pb-24 px-6 relative overflow-hidden">
          {/* Subtle background glow for brand harmony */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#facc15]/5 rounded-full blur-[120px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-[#9333ea]/5 rounded-full blur-[150px] -z-10 pointer-events-none -translate-x-1/2 translate-y-1/3"></div>
          
          <div className="max-w-5xl mx-auto relative z-10">

            {/* Headline — Sunday-style: massive, editorial, left-aligned */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.0] text-slate-900 mb-8 max-w-4xl">
              Mais pedidos.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#facc15]">Menos falhas.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-500 max-w-xl leading-relaxed mb-10 font-medium">
              O ecossistema completo para restaurantes em Cabo Verde — cardápio QR, cozinha digital, delivery e pagamentos SISP numa única plataforma.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link href="/onboarding" className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#9333ea] to-[#facc15] text-white font-bold px-8 py-4 rounded-full hover:opacity-90 transition-opacity text-base group shadow-lg shadow-[#9333ea]/20">
                Começar Gratuitamente
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold py-4 text-base transition-colors">
                Ver como funciona ↓
              </a>
            </div>

            {/* Social proof numbers */}
            <div className="flex flex-wrap gap-10 mt-16 pt-12 border-t border-slate-100">
              {[
                { n: "30 dias", l: "Trial grátis" },
                { n: "99.9%", l: "uptime garantido" },
                { n: "SISP", l: "Vinti4 integrado" },
                { n: "DNRE", l: "Fiscal em norma" },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#facc15]">
                    {s.n}
                  </p>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES: text-only horizontal carousel ─────────────── */}
        <section id="features" className="py-20 md:py-28 bg-slate-50 overflow-hidden border-y border-slate-100 relative">
          <div className="max-w-6xl mx-auto px-6 mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
              Tudo o que <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#facc15]">precisa.</span>
            </h2>
            <p className="text-slate-500 font-medium mt-4 text-lg">
              Deslize para ver as funcionalidades projetadas para conversão.
            </p>
          </div>
          
          {/* Horizontal scroll container */}
          <div className="flex overflow-x-auto snap-x snap-mandatory pb-12 px-6 max-w-6xl mx-auto gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {features.map((f, i) => (
              <div 
                key={i} 
                className="snap-start shrink-0 w-[85vw] sm:w-[400px] bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 md:p-10 flex flex-col justify-between hover:border-[#9333ea]/30 hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-sm font-black text-[#9333ea]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9333ea]">
                      {f.label}
                    </p>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black leading-[1.15] tracking-tight mb-4 text-slate-900">
                    {f.headline}
                  </h3>
                  <p className="text-base leading-relaxed text-slate-500 group-hover:text-slate-600 transition-colors">
                    {f.body}
                  </p>
                </div>
                <div className="mt-10 pt-6 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-900 leading-snug">
                    {f.aside.replace(/·/g, '•')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-24 md:py-32 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Preços</p>
              <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-slate-900 mb-4">
                Um plano para <br />cada restaurante.
              </h2>
              <p className="text-slate-500 text-lg font-medium">Trial gratuito de 30 dias. Sem cartão exigido.</p>
            </div>

            {/* Billing period toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 w-fit mb-12">
              {(["monthly", "quarterly", "annual"] as BillingPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setBillingPeriod(period)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    billingPeriod === period
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {BILLING_LABELS[period]}
                  {BILLING_DISCOUNT[period] && (
                    <span className="ml-1.5 text-[10px] text-[#9333ea] font-black">{BILLING_DISCOUNT[period]}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((plan, i) => (
                <div
                  key={i}
                  className={`rounded-[2rem] p-8 flex flex-col h-full transition-all border ${
                    plan.highlighted
                      ? "bg-slate-950 border-slate-900 text-white shadow-2xl scale-100 md:scale-105 z-10 relative"
                      : "bg-slate-50 border-slate-100 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-xs font-black uppercase tracking-widest ${plan.highlighted ? "text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#facc15]" : "text-slate-400"}`}>
                      {plan.name}
                    </p>
                    {plan.highlighted && (
                      <span className="bg-gradient-to-r from-[#9333ea] to-[#facc15] text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mb-1">
                    <span className={`text-5xl font-black ${plan.highlighted ? "text-white" : "text-slate-900"}`}>
                      {plan.price[billingPeriod].toLocaleString("pt-CV")}
                    </span>
                    <span className={`text-sm ml-2 font-medium ${plan.highlighted ? "text-slate-400" : "text-slate-500"}`}>
                      CVE/{billingPeriod === "monthly" ? "mês" : billingPeriod === "quarterly" ? "trim." : "ano"}
                    </span>
                  </div>
                  <p className={`text-sm mb-8 font-medium mt-2 ${plan.highlighted ? "text-slate-300" : "text-slate-500"}`}>{plan.desc}</p>
                  <Link
                    href={plan.href}
                    className={`w-full text-center font-bold py-3.5 rounded-full text-sm transition-opacity mb-8 hover:opacity-90 ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-[#9333ea] to-[#facc15] text-white shadow-md"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                  <div className="space-y-3 flex-1 pb-2">
                    {plan.items.map((item, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 font-black ${plan.highlighted ? "text-[#facc15]" : "text-[#9333ea]"}`} />
                        <span className={`text-sm font-bold ${plan.highlighted ? "text-white" : "text-slate-700"}`}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
        <section className="py-24 md:py-32 px-6 bg-slate-950 text-white relative overflow-hidden border-t-4 border-[#9333ea]">
          {/* Subtle glow behind the final CTA */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#9333ea]/20 blur-[150px] rounded-full pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-8">
              Pronto para levar o seu<br />restaurante para o <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#facc15]">próximo nível?</span>
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto font-medium">
              Menos de 5 minutos para ver o painel em ação. Sem cartão de crédito.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#9333ea] to-[#facc15] text-white font-black text-lg px-10 py-5 rounded-full hover:opacity-90 transition-opacity group shadow-xl"
            >
              Criar Conta Grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-white text-sm">Dineo<span className="text-[#9333ea]">.</span></span>
            <span className="text-slate-600 text-xs">by Servyx Labs</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <p className="text-slate-600 text-xs">© 2026 Servyx Labs. Todos os direitos reservados.</p>
            <a href="/termos" className="text-slate-600 hover:text-white text-xs transition-colors">Termos</a>
            <a href="/privacidade" className="text-slate-600 hover:text-white text-xs transition-colors">Privacidade</a>
            <Link href="/admin/login" className="text-slate-600 hover:text-white text-xs transition-colors">Login Gerente</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
