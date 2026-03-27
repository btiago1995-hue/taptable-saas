"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2, Building2, Phone, Mail, User, MessageSquare, Hash } from "lucide-react";

export default function ContactoPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    business_name: "",
    num_locations: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, num_locations: parseInt(form.num_locations) || 1 }),
      });
      if (!res.ok) throw new Error("Erro ao enviar");
      setSent(true);
    } catch {
      setError("Erro ao enviar. Por favor tente novamente ou contacte-nos diretamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm z-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-black text-2xl tracking-tight text-slate-900">
              Dineo<span className="text-[#9333ea]">.</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1 hidden sm:inline">by Servyx Labs</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Left — Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#9333ea]/10 border border-[#9333ea]/20 mb-6">
                <span className="text-xs font-black uppercase tracking-widest text-[#9333ea]">Plano PRO</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-slate-900 mb-6">
                Vamos falar sobre<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#facc15]">
                  o seu negócio.
                </span>
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed mb-8">
                O Plano PRO foi concebido para grupos de restauração, operações multi-loja e empresas que necessitam de SAF-T, retenções IRS/IRC e utilizadores ilimitados.
              </p>

              <div className="space-y-4">
                {[
                  { icon: "📄", label: "SAF-T Export automático (DNRE CV)" },
                  { icon: "🏢", label: "Multi-loja numa única conta" },
                  { icon: "👥", label: "Utilizadores e permissões ilimitados" },
                  { icon: "📊", label: "Retenções IRS/IRC integradas" },
                  { icon: "🛡️", label: "Suporte prioritário por WhatsApp" },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-3 text-slate-600">
                    <span className="text-lg">{icon}</span>
                    <span className="font-medium">{label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm text-slate-500 font-medium">Preço PRO a partir de</p>
                <p className="text-3xl font-black text-slate-900">5.990 <span className="text-lg font-semibold text-slate-500">CVE/mês</span></p>
                <p className="text-xs text-slate-400 mt-1">ou 59.900 CVE/ano (2 meses grátis)</p>
              </div>
            </div>

            {/* Right — Form */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
              {sent ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Mensagem enviada!</h2>
                  <p className="text-slate-500 max-w-xs mx-auto">
                    A nossa equipa comercial irá entrar em contacto em menos de 24 horas.
                  </p>
                  <Link
                    href="/"
                    className="inline-block mt-4 bg-[#9333ea] text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Voltar ao início
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Fale com a nossa equipa</h2>

                  {[
                    { icon: User, label: "Nome completo *", key: "name", placeholder: "João Silva", required: true },
                    { icon: Mail, label: "Email *", key: "email", placeholder: "joao@empresa.cv", required: true, type: "email" },
                    { icon: Phone, label: "Telefone", key: "phone", placeholder: "+238 9XX XXXX" },
                    { icon: Building2, label: "Nome do negócio *", key: "business_name", placeholder: "Restaurante Sabor do Mar", required: true },
                    { icon: Hash, label: "Nº de estabelecimentos", key: "num_locations", placeholder: "Ex: 3", type: "number" },
                  ].map(({ icon: Icon, label, key, placeholder, required, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
                      <div className="relative">
                        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={type || "text"}
                          required={required}
                          placeholder={placeholder}
                          min={type === "number" ? 1 : undefined}
                          value={(form as any)[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9333ea]/30 focus:border-[#9333ea]"
                        />
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mensagem</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <textarea
                        rows={3}
                        placeholder="O que está a procurar? Descreva-nos o seu negócio..."
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9333ea]/30 focus:border-[#9333ea] resize-none"
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-gradient-to-r from-[#9333ea] to-[#7c22d4] text-white font-bold py-4 rounded-xl transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#9333ea]/20"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "A enviar..." : "Enviar mensagem"}
                  </button>

                  <p className="text-xs text-slate-400 text-center">
                    Respondemos em menos de 24 horas nos dias úteis.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
