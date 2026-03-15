import Image from "next/image";
import Link from "next/link";
import { Check, ArrowRight, Smartphone, ChefHat, Store, LineChart, ShieldCheck, QrCode } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-hidden flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Store className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">TableTap</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Preços</a>
            <Link href="/admin/login" className="text-indigo-600 hover:text-indigo-700 transition-colors">Login Gerente</Link>
            <Link href="/onboarding" className="bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-transform active:scale-95">
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 px-6 lg:pt-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-50 rounded-full blur-3xl opacity-50 -z-10" />
          
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm mb-8 animate-in fade-in slide-in-from-bottom-4">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
              A nova forma de gerir restaurantes
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-6 delay-75">
              Mais <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">pedidos</span>.<br /> Menos falhas.
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 delay-150">
              O ecossistema completo para o seu restaurante. Cardápio QR dinâmico, monitor de cozinha (KDS) em tempo real e painel de motoboys. Tudo na nuvem, sem maquinetas presas e sem hardware caro.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 delay-200">
              <Link href="/onboarding" className="w-full sm:w-auto bg-indigo-600 text-white text-lg font-bold px-8 py-4 rounded-full shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center justify-center gap-2 group">
                Começar Teste Grátis <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#features" className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-700 text-lg font-bold px-8 py-4 rounded-full hover:bg-slate-50 transition-colors flex items-center justify-center">
                Ver Funcionalidades
              </a>
            </div>
          </div>
        </section>

        {/* Features Split */}
        <section id="features" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Tudo o que você precisa em uma tela.</h2>
              <p className="text-lg text-slate-600 font-medium">Esqueça os sistemas antigos. Nossa tecnologia fala a língua da sua equipe.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Smartphone, title: "Cardápio QR Inteligente", desc: "Seus clientes fazem o pedido direto do celular com belas fotos e categorias organizadas. Zero impressões." },
                { icon: ChefHat, title: "KDS Master (Cozinha)", desc: "Uma tela viva na cozinha indicando exatamente o que fazer. Alertas sonoros para novos pedidos e sincronismo instantâneo." },
                { icon: Store, title: "Gestão do Salão", desc: "O garçom comanda o status de pagamento, adiciona extras na conta e libera mesas com poucos toques no tablet." },
                { icon: QrCode, title: "Delivery / Motoboys", desc: "Link público pra colocar no Instagram e App dedicado para entregar. Cobre taxa fixa e acompanhe a frota via GPS de status." },
                { icon: LineChart, title: "Analytics Real", desc: "Descubra o LTV dos seus clientes com o nosso pequeno CRM. Saiba os pratos que mais faturam e as horas de pico reais e visuais." },
                { icon: ShieldCheck, title: "Multi-Telas Infinitas", desc: "O Dono, o Garçom e a Cozinha logados simultaneamente, 100% sincronizados. Sistema de nuvem ultrarrápido (Vercel + Supabase)." },
              ].map((feature, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section (NordQR & Innovorder Inspired) */}
        <section id="pricing" className="py-32 bg-slate-950 text-white relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black mb-6">Um plano para cada restaurante</h2>
              <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">Experimente gratuitamente por 14 dias em todos os planos premium. Sem fidelidade, sem cartão de crédito exigido inicialmente.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
              
              {/* Essencial Plan */}
              <div className="bg-slate-900 rounded-3xl p-8 lg:p-10 border border-slate-800 flex flex-col h-full hover:border-slate-700 transition-colors">
                <h3 className="text-2xl font-bold mb-2">Essencial</h3>
                <div className="mb-6">
                  <span className="text-6xl font-black">1.990</span>
                  <span className="text-slate-400 font-medium ml-2">CVE/mês</span>
                </div>
                <p className="text-slate-400 mb-8 font-medium">Substitua o papel e o caos. Ideal para começar.</p>
                <Link href="/onboarding" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl text-center transition-colors mb-10">
                  Começar Trial
                </Link>
                <div className="space-y-4 flex-1">
                  {[
                    "Gestão de Mesas e Salão",
                    "Ponto de Venda (Caixa POS)",
                    "Dashboard Administrativo",
                    "Cardápio QR Code Dinâmico",
                    "Equipe até 3 Funcionários"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth Plan (Highlighted) */}
              <div className="bg-indigo-600 rounded-3xl p-8 lg:p-12 border-2 border-indigo-400 shadow-2xl shadow-indigo-600/20 flex flex-col transform md:-translate-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-900 text-indigo-100 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl">
                  Mais Popular
                </div>
                <h3 className="text-2xl font-bold mb-2 text-indigo-50">Growth</h3>
                <div className="mb-6">
                  <span className="text-5xl font-black text-white">4.990</span>
                  <span className="text-indigo-200 font-medium ml-2">CVE/mês</span>
                </div>
                <p className="text-indigo-100 mb-8 font-medium">Tenha o ecossistema completo fluindo entre salão, delivery e cozinha.</p>
                <Link href="/onboarding" className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-black py-4 rounded-xl text-center transition-transform active:scale-95 shadow-xl mb-10">
                  Testar 14 Dias Grátis
                </Link>
                <div className="space-y-4 flex-1">
                  {[
                    "Tudo do plano Essencial",
                    "Painel KDS de Cozinha Vivo",
                    "App de Pedidos p/ Garçom",
                    "Delivery Online e Guias de Transporte",
                    "Analytics e Lucros em Tempo Real"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-6 h-6 text-indigo-200 shrink-0" />
                      <span className="text-white font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Elite Plan */}
              <div className="bg-slate-900 rounded-3xl p-8 lg:p-10 border border-slate-800 flex flex-col h-full hover:border-slate-700 transition-colors">
                <h3 className="text-2xl font-bold mb-2">Elite</h3>
                <div className="mb-6">
                  <span className="text-5xl font-black">9.900</span>
                  <span className="text-slate-400 font-medium ml-2">CVE/mês</span>
                </div>
                <p className="text-slate-400 mb-8 font-medium">Para restaurantes de alto volume e operações logísticas próprias.</p>
                <Link href="/admin/login" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl text-center transition-colors mb-10">
                  Começar Agora
                </Link>
                <div className="space-y-4 flex-1">
                  {[
                    "Tudo do plano Growth",
                    "Sistema de Retenção e Fidelidade",
                    "App Pessoal do Motoboy c/ GPS",
                    "Notas de Crédito Oficiais (Fiscal)",
                    "Gestão Granular de Permissões"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <span className="text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 bg-white text-center">
           <h2 className="text-4xl font-black text-slate-900 mb-6">Pronto para digitalizar seu restaurante?</h2>
           <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto font-medium">Leve menos de 5 minutos para ver o painel com os próprios olhos. Não precisa colocar cartão.</p>
           <Link href="/admin/login" className="inline-flex bg-slate-900 text-white text-lg font-bold px-10 py-5 rounded-full shadow-2xl hover:bg-slate-800 hover:scale-105 transition-all">
              Criar Conta Rápida
           </Link>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">TableTap</span>
          </div>
          <p className="text-slate-500 font-medium">© 2026 TableTap SaaS. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
