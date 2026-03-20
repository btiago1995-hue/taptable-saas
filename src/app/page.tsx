import Link from "next/link";
import { Check, ArrowRight, Smartphone, ChefHat, Store, LineChart, ShieldCheck, QrCode, Zap, Users, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080b14] font-sans text-white overflow-hidden flex flex-col">
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full z-50 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight text-white">Dineo</span>
            <span className="text-[10px] font-bold tracking-widest text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full">by Servyx</span>
          </div>
          
          <div className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-2 py-2">
            <a href="#features" className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">Funcionalidades</a>
            <a href="#pricing" className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">Preços</a>
            <Link href="/admin/login" className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">Login</Link>
            <Link href="/onboarding" className="ml-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25">
              Começar Grátis →
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-24">
          
          {/* Background glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-violet-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl" />
            <div className="absolute top-1/3 -left-64 w-[500px] h-[500px] bg-violet-800/10 rounded-full blur-3xl" />
            <div className="absolute top-1/3 -right-64 w-[500px] h-[500px] bg-indigo-800/10 rounded-full blur-3xl" />
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
            {/* Neon lines */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
          </div>

          <div className="relative max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 font-semibold text-sm mb-10 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
              Provedor de Valor Agregado — Servyx
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.0] mb-8">
              <span className="block text-white">O Sistema</span>
              <span className="block bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Financeiro</span>
              <span className="block text-white">do Seu Restaurante.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12 font-medium">
              Cardápio QR, KDS em tempo real, delivery integrado e pagamentos SISP — tudo numa única plataforma cloud. A infraestrutura de tecnologia que o seu negócio merecia.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/onboarding" className="group relative w-full sm:w-auto">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-lg font-bold px-8 py-4 rounded-2xl flex items-center justify-center gap-2 w-full">
                  Começar Gratuitamente
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <a href="#features" className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 text-white text-lg font-bold px-8 py-4 rounded-2xl transition-all backdrop-blur-sm flex items-center justify-center gap-2">
                <Globe className="w-5 h-5 text-violet-400" />
                Ver Demo
              </a>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-center">
              {[
                { value: "500+", label: "Restaurantes Ativos" },
                { value: "99.9%", label: "Uptime Garantido" },
                { value: "< 2s", label: "Tempo de Resposta" },
                { value: "SISP", label: "Pagamentos Certificados" },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-2xl font-black text-white">{stat.value}</span>
                  <span className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-32 px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#080b14] via-[#0d1022] to-[#080b14] pointer-events-none" />
          
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-6">
                Funcionalidades
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                Infraestrutura de nível<br />
                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">enterprise</span> para todos.
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                A mesma tecnologia usada pelos maiores restaurantes do mundo, agora acessível para todos os negócios de Cabo Verde.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Smartphone, title: "Cardápio QR Inteligente", desc: "Clientes fazem pedidos direto do telemóvel. Zero impressões, fotos reais dos pratos e categorias organizadas.", color: "from-violet-500 to-indigo-500", glow: "violet" },
                { icon: ChefHat, title: "KDS Master (Cozinha)", desc: "Ecrã vivo na cozinha com alertas sonoros para novos pedidos. Sincronismo instantâneo entre caixa e fogão.", color: "from-orange-500 to-red-500", glow: "orange" },
                { icon: Store, title: "Gestão do Salão", desc: "O garçom gere o status das mesas, adiciona extras na conta e fecha pagamentos com poucos toques.", color: "from-emerald-500 to-teal-500", glow: "emerald" },
                { icon: QrCode, title: "Delivery & Motoboys", desc: "Link público para o Instagram + app dedicado ao entregador. Taxa automática e rastreamento de status.", color: "from-blue-500 to-cyan-500", glow: "blue" },
                { icon: LineChart, title: "Analytics em Tempo Real", desc: "CRM integrado: LTV dos clientes, pratos mais lucrativos e horas de pico. Dados reais, não estimativas.", color: "from-pink-500 to-rose-500", glow: "pink" },
                { icon: ShieldCheck, title: "Multi-Utilizador Seguro", desc: "Dono, Garçom e Cozinha em simultâneo, 100% sincronizados. Permissões granulares por função.", color: "from-amber-500 to-yellow-500", glow: "amber" },
              ].map((feature, i) => (
                <div key={i} className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl blur-sm" style={{backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`}} />
                  <div className="relative bg-white/[0.03] border border-white/[0.08] hover:border-white/20 rounded-3xl p-8 h-full transition-all duration-300 hover:bg-white/[0.06] backdrop-blur-sm">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-32 px-6 relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-bold uppercase tracking-widest mb-6">
                Planos e Preços
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Um plano para<br /><span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">cada restaurante.</span></h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">Trial gratuito de 14 dias em todos os planos. Sem cartão exigido.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-center">
              
              {/* Essencial */}
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 flex flex-col hover:border-white/20 transition-all">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">Essencial</p>
                <div className="mb-6">
                  <span className="text-5xl font-black text-white">1.990</span>
                  <span className="text-slate-500 ml-2 text-sm font-medium">CVE/mês</span>
                </div>
                <p className="text-slate-500 text-sm mb-8">Substitua o papel e o caos. Ideal para começar.</p>
                <Link href="/onboarding" className="w-full text-center bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-3.5 rounded-xl transition-all mb-8 text-sm">
                  Começar Trial Grátis
                </Link>
                <div className="space-y-3 flex-1">
                  {["Gestão de Mesas e Salão", "Ponto de Venda (POS)", "Dashboard Administrativo", "Cardápio QR Code", "Equipe até 3 Funcionários"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="text-slate-400 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth - Featured */}
              <div className="relative rounded-3xl p-px bg-gradient-to-b from-violet-500 via-indigo-500 to-violet-900 md:-translate-y-4">
                <div className="bg-[#10122a] rounded-3xl p-8 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-violet-300 text-sm font-bold uppercase tracking-widest">Growth</p>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-3 py-1 rounded-full">Popular</span>
                  </div>
                  <div className="mb-6">
                    <span className="text-5xl font-black text-white">4.990</span>
                    <span className="text-slate-500 ml-2 text-sm font-medium">CVE/mês</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-8">Ecossistema completo: salão, delivery e cozinha.</p>
                  <Link href="/onboarding" className="w-full text-center bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-black py-3.5 rounded-xl transition-all shadow-xl shadow-violet-500/25 mb-8 text-sm">
                    Testar 14 Dias Grátis
                  </Link>
                  <div className="space-y-3 flex-1">
                    {["Tudo do plano Essencial", "KDS de Cozinha Vivo", "App de Pedidos p/ Garçom", "Delivery Online & Guias", "Analytics e CRM em Tempo Real"].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="text-slate-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Elite */}
              <div className="bg-white/[0.03] border border-amber-500/30 rounded-3xl p-8 flex flex-col hover:border-amber-400/50 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500/20 to-transparent w-32 h-32 rounded-full blur-2xl pointer-events-none" />
                <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-4">Elite</p>
                <div className="mb-6">
                  <span className="text-5xl font-black text-amber-400">9.900</span>
                  <span className="text-slate-500 ml-2 text-sm font-medium">CVE/mês</span>
                </div>
                <p className="text-slate-500 text-sm mb-8">Para operações de alto volume com logística própria.</p>
                <Link href="/onboarding" className="w-full text-center bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 text-black font-black py-3.5 rounded-xl transition-all shadow-xl shadow-amber-500/20 mb-8 text-sm">
                  Começar Agora
                </Link>
                <div className="space-y-3 flex-1">
                  {["Tudo do plano Growth", "Sistema de Fidelidade & Retenção", "App GPS para Motoboys", "Notas de Crédito Oficiais (DNRE)", "Gestão Granular de Permissões"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-slate-400 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-28 px-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-900/40 via-indigo-900/40 to-violet-900/40" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.04%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[800px] h-[200px] bg-violet-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-8">
              <Users className="w-5 h-5 text-violet-400" />
              <span className="text-violet-300 font-semibold text-sm">Junte-se a centenas de restaurantes em Cabo Verde</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              Pronto para escalar<br />o seu restaurante?
            </h2>
            <p className="text-slate-400 text-lg mb-10 font-medium">
              Menos de 5 minutos para ver o painel com os próprios olhos. Sem cartão de crédito, sem compromisso.
            </p>
            <Link href="/onboarding" className="group relative inline-flex">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-lg font-black px-10 py-5 rounded-2xl flex items-center gap-3">
                Criar Conta Grátis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-black text-white tracking-tight">Dineo</span>
              <span className="text-slate-500 text-xs ml-2">by Servyx</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <p className="text-slate-600 text-sm text-center">© 2026 Servyx. Provedor de valor agregado. Todos os direitos reservados.</p>
            <div className="flex gap-5 text-xs font-semibold text-slate-600">
              <a href="/termos" className="hover:text-violet-400 transition-colors">Termos</a>
              <a href="/privacidade" className="hover:text-violet-400 transition-colors">Privacidade</a>
              <Link href="/admin/login" className="hover:text-violet-400 transition-colors">Login Gerente</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
