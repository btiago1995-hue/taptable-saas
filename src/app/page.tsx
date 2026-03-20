import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

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
    label: "Delivery & Takeaway",
    headline: "Uma loja online para o seu restaurante, pronta em minutos.",
    body: "Coloque o link do delivery no Instagram ou WhatsApp e comece a receber pedidos agora. O app do entregador acompanha cada encomenda do forno até à porta do cliente.",
    aside: "Link Público · App do Motoboy · Taxa Automática",
    dark: false,
  },
  {
    label: "Pagamentos SISP",
    headline: "Vinti4, cartão e dinheiro — tudo integrado no mesmo sistema.",
    body: "Feche contas de mesa com TPA integrado da SISP. O caixa gere gorjetas, NIF e emite recibos fiscais conformes com a DNRE — sem maquinetas externas nem duplo registo.",
    aside: "SISP Vinti4 · Fiscal DNRE · Gorjeta & NIF",
    dark: true,
  },
];

const plans = [
  {
    name: "Essencial",
    price: "1.990",
    desc: "Comece a digitalizar o seu salão hoje.",
    items: ["Menu QR Code Dinâmico", "Gestão de Mesas", "Ponto de Venda (POS)", "Dashboard Admin", "Equipe até 3 pessoas"],
    cta: "Começar Trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "4.990",
    desc: "O ecossistema completo de restauração.",
    items: ["Tudo do Essencial", "KDS de Cozinha em Tempo Real", "App do Garçom", "Delivery & Guias de Transporte", "Analytics & CRM Real"],
    cta: "Testar 14 Dias Grátis",
    highlighted: true,
  },
  {
    name: "Elite",
    price: "9.900",
    desc: "Operações de alto volume e logística própria.",
    items: ["Tudo do Growth", "App GPS de Motoboys", "Sistema de Fidelidade", "Notas de Crédito (DNRE)", "Permissões Granulares"],
    cta: "Falar com Comercial",
    highlighted: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">

      {/* ── NAVIGATION ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm z-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <span className="font-black text-xl tracking-tight">Dineo</span>
            <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase ml-1 hidden sm:inline">by Servyx</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
              <a href="#features" className="hover:text-slate-900 transition-colors">Funcionalidades</a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">Preços</a>
              <Link href="/admin/login" className="hover:text-slate-900 transition-colors">Login</Link>
            </div>
            <Link href="/onboarding" className="bg-slate-900 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-slate-700 transition-colors">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="pt-40 pb-24 px-6">
          <div className="max-w-5xl mx-auto">

            {/* Eyebrow */}
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
              Dineo SaaS — Servyx, Cabo Verde
            </p>

            {/* Headline — Sunday-style: massive, editorial, left-aligned */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.0] text-slate-900 mb-8 max-w-4xl">
              Mais pedidos.
              <br />
              <span className="text-slate-400">Menos falhas.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-500 max-w-xl leading-relaxed mb-10 font-medium">
              O ecossistema completo para restaurantes em Cabo Verde — cardápio QR, cozinha digital, delivery e pagamentos SISP numa única plataforma.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link href="/onboarding" className="inline-flex items-center gap-2.5 bg-slate-900 text-white font-bold px-8 py-4 rounded-full hover:bg-slate-700 transition-colors text-base group">
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
                { n: "14 dias", l: "Trial grátis" },
                { n: "99.9%", l: "uptime garantido" },
                { n: "SISP", l: "Vinti4 integrado" },
                { n: "DNRE", l: "Fiscal em norma" },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-black text-slate-900">{s.n}</p>
                  <p className="text-sm text-slate-400 font-medium mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES: alternating blocks (Sunday/Deliveroo style) ─────────── */}
        <section id="features">
          {features.map((f, i) => (
            <div
              key={i}
              className={`py-20 md:py-28 px-6 ${f.dark ? "bg-slate-950 text-white" : "bg-white text-slate-900"}`}
            >
              <div className={`max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center ${i % 2 === 1 ? "md:grid-flow-col" : ""}`}>
                {/* Text side */}
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <p className={`text-xs font-black uppercase tracking-[0.2em] mb-4 ${f.dark ? "text-slate-500" : "text-slate-400"}`}>
                    {String(i + 1).padStart(2, "0")} — {f.label}
                  </p>
                  <h2 className={`text-3xl md:text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight mb-6 ${f.dark ? "text-white" : "text-slate-900"}`}>
                    {f.headline}
                  </h2>
                  <p className={`text-base md:text-lg leading-relaxed ${f.dark ? "text-slate-400" : "text-slate-500"} max-w-md`}>
                    {f.body}
                  </p>
                </div>

                {/* Visual side — clean aside block (no image, editorial style) */}
                <div className={i % 2 === 1 ? "md:order-1" : ""}>
                  <div className={`rounded-3xl p-10 md:p-14 flex items-center justify-center min-h-[280px] ${
                    f.dark
                      ? "bg-white/5 border border-white/10"
                      : "bg-slate-50 border border-slate-100"
                  }`}>
                    <p className={`text-center text-base font-semibold leading-loose ${f.dark ? "text-slate-300" : "text-slate-600"}`}>
                      {f.aside.split("·").map((item, j) => (
                        <span key={j} className="block text-xl md:text-2xl font-black tracking-tight mb-2">
                          {item.trim()}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-24 md:py-32 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Preços</p>
              <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-slate-900 mb-4">
                Um plano para <br />cada restaurante.
              </h2>
              <p className="text-slate-500 text-lg font-medium">Trial gratuito de 14 dias em todos os planos. Sem cartão exigido.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, i) => (
                <div
                  key={i}
                  className={`rounded-3xl p-8 flex flex-col h-full transition-all ${
                    plan.highlighted
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 border border-slate-100"
                  }`}
                >
                  <p className={`text-xs font-black uppercase tracking-widest mb-4 ${plan.highlighted ? "text-slate-400" : "text-slate-400"}`}>
                    {plan.name}
                  </p>
                  <div className="mb-3">
                    <span className={`text-5xl font-black ${plan.highlighted ? "text-white" : "text-slate-900"}`}>{plan.price}</span>
                    <span className={`text-sm ml-2 font-medium ${plan.highlighted ? "text-slate-400" : "text-slate-500"}`}>CVE/mês</span>
                  </div>
                  <p className={`text-sm mb-8 font-medium ${plan.highlighted ? "text-slate-400" : "text-slate-500"}`}>{plan.desc}</p>
                  <Link
                    href="/onboarding"
                    className={`w-full text-center font-bold py-3.5 rounded-full text-sm transition-colors mb-8 ${
                      plan.highlighted
                        ? "bg-white text-slate-900 hover:bg-slate-100"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                  <div className="space-y-3 flex-1">
                    {plan.items.map((item, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlighted ? "text-slate-300" : "text-slate-400"}`} />
                        <span className={`text-sm font-medium ${plan.highlighted ? "text-slate-300" : "text-slate-600"}`}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
        <section className="py-24 md:py-32 px-6 bg-slate-950 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Junte-se a centenas de restaurantes em Cabo Verde</p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-8">
              Pronto para levar o seu<br />restaurante para o próximo nível?
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto font-medium">
              Menos de 5 minutos para ver o painel em ação. Sem cartão de crédito.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-3 bg-white text-slate-900 font-black text-lg px-10 py-5 rounded-full hover:bg-slate-100 transition-colors group"
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
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <span className="font-black text-white text-sm">Dineo</span>
            <span className="text-slate-600 text-xs">by Servyx</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <p className="text-slate-600 text-xs">© 2026 Servyx. Todos os direitos reservados.</p>
            <a href="/termos" className="text-slate-600 hover:text-white text-xs transition-colors">Termos</a>
            <a href="/privacidade" className="text-slate-600 hover:text-white text-xs transition-colors">Privacidade</a>
            <Link href="/admin/login" className="text-slate-600 hover:text-white text-xs transition-colors">Login Gerente</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
