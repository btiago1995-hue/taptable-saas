"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, Store, CreditCard, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        restaurantName: "",
        plan: "growth" // "essential" | "growth" | "elite"
    });

    const updateForm = (key: string, val: string) => {
        setFormData(prev => ({ ...prev, [key]: val }));
        setErrorMsg("");
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.name || !formData.email || !formData.password) {
                setErrorMsg("Preencha todos os campos obrigatórios.");
                return;
            }
            if (formData.password.length < 6) {
                setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
                return;
            }
        }
        if (step === 2) {
            if (!formData.restaurantName) {
                setErrorMsg("O nome do restaurante é obrigatório.");
                return;
            }
        }
        setErrorMsg("");
        setStep(prev => prev + 1);
    };

    const handleCreateAccount = async () => {
        setIsLoading(true);
        setErrorMsg("");

        try {
            // 1. Sign up built-in auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });
            if (authError) throw authError;
            if (!authData.user) throw new Error("Erro ao criar utilizador.");

            // 2. Create Restaurant Tenant
            const { data: restData, error: restErr } = await supabase.from('restaurants')
                .insert([{ 
                    name: formData.restaurantName,
                    subscription_plan: formData.plan
                }])
                .select('id')
                .single();
            if (restErr) throw restErr;

            // 3. Create Custom User Profile linking Auth to Tenant
            const { error: profileErr } = await supabase.from('users').insert([{
                id: authData.user.id,
                restaurant_id: restData.id,
                name: formData.name,
                role: 'manager',
                access_modules: ['dashboard', 'cashier', 'kitchen', 'waiter', 'menu', 'customers', 'driver']
            }]);
            if (profileErr) throw profileErr;

            // 4. Force sign-in to be double sure
            await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });

            // Redirect to admin dashboard
            setTimeout(() => {
                router.push("/admin/dashboard");
            }, 1000);

        } catch (err: any) {
            setErrorMsg(err.message || "Erro durante o registo. Tente novamente.");
            setIsLoading(false);
            // Revert step to the first one in case we need to retry
            if (err.message.includes("usado") || err.message.includes("email")) {
                setStep(1);
            }
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-[#080b14] text-white">
            {/* ── BACKGROUND EFFECTS ────────────────────────────────────────── */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-violet-600/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
            </div>

            <div className="w-full max-w-5xl flex flex-col md:flex-row gap-12 items-center md:items-start justify-center relative z-10">

                {/* Left Side: Progress & Value Prop */}
                <div className="w-full md:w-5/12 flex flex-col pt-8 hidden md:flex">
                    <h1 className="text-4xl lg:text-5xl font-black text-white mb-8 tracking-tight leading-[1.1]">
                        Comece a faturar<br/>
                        <span className="text-violet-400">em minutos.</span>
                    </h1>

                    <div className="space-y-8 relative">
                        {/* Progress Line */}
                        <div className="absolute left-[15px] top-[24px] bottom-[24px] w-px bg-white/10 z-0" />

                        {[
                            { step: 1, label: "A sua Conta", desc: "Acessos de Gestor Principal" },
                            { step: 2, label: "O Restaurante", desc: "O seu espaço no Dineo" },
                            { step: 3, label: "O seu Plano", desc: "Comece 14 dias sem risco" }
                        ].map((s) => (
                            <div key={s.step} className="flex gap-5 relative z-10 transition-all duration-500" style={{ opacity: step >= s.step ? 1 : 0.3 }}>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all duration-500",
                                    step > s.step 
                                        ? "bg-violet-500 text-white shadow-violet-500/50" 
                                        : step === s.step 
                                            ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white ring-4 ring-violet-500/20 scale-110" 
                                            : "bg-[#0a0d1a] text-slate-500 border border-white/10"
                                )}>
                                    {step > s.step ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                                </div>
                                <div className="pt-1">
                                    <p className={cn("font-bold text-lg", step >= s.step ? "text-white" : "text-slate-500")}>{s.label}</p>
                                    <p className="text-sm font-medium text-slate-400 mt-0.5">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Form Wizard */}
                <div className="w-full md:w-7/12 bg-white/[0.03] rounded-3xl backdrop-blur-xl shadow-2xl border border-white/10 p-8 min-h-[480px] flex flex-col relative overflow-hidden">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                    
                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm rounded-xl text-center animate-in fade-in slide-in-from-top-2">
                            {errorMsg}
                        </div>
                    )}

                    {/* STEP 1: Personal Info */}
                    {step === 1 && (
                        <div className="flex flex-col flex-1 animate-in slide-in-from-right-8 fade-in duration-500">
                            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Crie a sua Conta</h2>
                            <p className="text-slate-400 font-medium mb-8">Será o Gestor Principal do restaurante.</p>

                            <div className="space-y-5 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Primeiro e Último Nome</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => updateForm('name', e.target.value)}
                                        className="w-full bg-[#0a0d1a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium"
                                        placeholder="Ex: Rui Pereira"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">E-mail Profissional</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => updateForm('email', e.target.value)}
                                        className="w-full bg-[#0a0d1a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium"
                                        placeholder="rui@restaurante.cv"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Senha Segura</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => updateForm('password', e.target.value)}
                                        className="w-full bg-[#0a0d1a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={nextStep}
                                className="mt-8 w-full bg-white hover:bg-slate-200 text-[#080b14] font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 group"
                            >
                                Continuar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Restaurant Details */}
                    {step === 2 && (
                        <div className="flex flex-col flex-1 animate-in slide-in-from-right-8 fade-in duration-500">
                            <button onClick={() => setStep(1)} className="absolute -top-2 -left-2 p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-bold text-sm">
                                <ArrowLeft className="w-4 h-4" /> Voltar
                            </button>
                            
                            <h2 className="text-3xl font-black text-white mb-2 mt-4 tracking-tight">O seu Restaurante</h2>
                            <p className="text-slate-400 font-medium mb-8">Esta é a marca que os clientes vão ver.</p>

                            <div className="space-y-5 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nome Comercial</label>
                                    <input
                                        type="text"
                                        value={formData.restaurantName}
                                        onChange={(e) => updateForm('restaurantName', e.target.value)}
                                        className="w-full bg-[#0a0d1a] border border-white/10 rounded-xl px-4 py-4 text-base text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium"
                                        placeholder="Ex: Pizzaria Bella Napoli"
                                    />
                                </div>
                                <div className="bg-violet-500/10 border border-violet-500/20 p-4 rounded-xl flex gap-4 text-sm font-medium text-violet-200">
                                    <Store className="w-5 h-5 shrink-0 text-violet-400 mt-0.5" />
                                    <p className="leading-relaxed">O QR Code das suas mesas e o Link de Delivery público serão gerados automaticamente baseados neste nome durante a criação.</p>
                                </div>
                            </div>

                            <button
                                onClick={nextStep}
                                className="mt-8 w-full bg-white hover:bg-slate-200 text-[#080b14] font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 group"
                            >
                                Escolher Plano <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Plan Selection */}
                    {step === 3 && (
                        <div className="flex flex-col flex-1 animate-in slide-in-from-right-8 fade-in duration-500 max-h-[600px] overflow-y-auto no-scrollbar">
                            <button onClick={() => setStep(2)} className="absolute -top-2 -left-2 p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-bold text-sm" disabled={isLoading}>
                                <ArrowLeft className="w-4 h-4" /> Voltar
                            </button>
                            
                            <h2 className="text-3xl font-black text-white mb-2 mt-4 tracking-tight">Escolha o seu Plano</h2>
                            <p className="text-slate-400 font-medium mb-6">Todos os planos incluem 14 dias de teste gratuito.</p>

                            <div className="space-y-4 flex-1">
                                {/* Plan Card: Essencial */}
                                <label className={cn(
                                    "flex flex-col border rounded-2xl p-4 cursor-pointer transition-all relative overflow-hidden",
                                    formData.plan === "essential" ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-[#0a0d1a] hover:border-white/20",
                                    formData.plan !== "essential" && formData.plan ? "opacity-60 hover:opacity-100" : ""
                                )}>
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name="plan" 
                                                value="essential" 
                                                className="w-5 h-5 accent-violet-500 bg-transparent border-white/20"
                                                checked={formData.plan === "essential"}
                                                onChange={() => updateForm('plan', 'essential')}
                                                disabled={isLoading}
                                            />
                                            <span className="font-bold text-lg text-white">Essencial</span>
                                        </div>
                                        <span className="font-bold text-slate-300">1.990 CVE</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-400 ml-8 relative z-10">Cardápio QR e Ponto de Venda (Salão).</p>
                                </label>

                                {/* Plan Card: Growth */}
                                <label className={cn(
                                    "flex flex-col border rounded-2xl p-4 cursor-pointer transition-all relative overflow-hidden",
                                    formData.plan === "growth" ? "border-violet-400 bg-gradient-to-b from-violet-500/20 to-[#0a0d1a] ring-1 ring-violet-500/50 scale-[1.02] shadow-lg shadow-violet-500/10 z-10" : "border-white/10 bg-[#0a0d1a] hover:border-violet-500/30 text-white",
                                    formData.plan !== "growth" && formData.plan ? "opacity-60 hover:opacity-100" : ""
                                )}>
                                    <div className="absolute top-0 right-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-md">Popular</div>
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name="plan" 
                                                value="growth" 
                                                className="w-5 h-5 accent-violet-500 bg-transparent border-white/20"
                                                checked={formData.plan === "growth"}
                                                onChange={() => updateForm('plan', 'growth')}
                                                disabled={isLoading}
                                            />
                                            <span className="font-bold text-lg text-white">Growth</span>
                                        </div>
                                        <span className="font-bold text-violet-400">4.990 CVE</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-400 ml-8 relative z-10">KDS, Display de Cobertura e App de Entrega.</p>
                                </label>

                                {/* Plan Card: Elite */}
                                <label className={cn(
                                    "flex flex-col border rounded-2xl p-4 cursor-pointer transition-all relative overflow-hidden",
                                    formData.plan === "elite" ? "border-amber-500 bg-gradient-to-br from-amber-500/20 to-[#0a0d1a] ring-1 ring-amber-500/30 scale-[1.02] shadow-lg shadow-amber-500/10 z-10 text-white" : "border-amber-500/20 bg-[#0a0d1a] hover:border-amber-500/50",
                                    formData.plan !== "elite" && formData.plan ? "opacity-60 hover:opacity-100" : ""
                                )}>
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-600 text-[#080b14] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-md">Premium</div>
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name="plan" 
                                                value="elite" 
                                                className="w-5 h-5 accent-amber-500 bg-transparent border-white/20"
                                                checked={formData.plan === "elite"}
                                                onChange={() => updateForm('plan', 'elite')}
                                                disabled={isLoading}
                                            />
                                            <span className="font-bold text-lg text-white tracking-wide">Elite</span>
                                        </div>
                                        <span className="font-bold text-amber-500">9.900 CVE</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-400 ml-8 relative z-10">Operações logísticas próprias e DNRE.</p>
                                </label>
                            </div>

                            <button
                                onClick={handleCreateAccount}
                                disabled={isLoading}
                                className="mt-8 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-violet-500/25"
                            >
                                {isLoading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> A Configurar o seu Restaurante...</>
                                ) : (
                                    <>Ouvir a Mágica 🪄</>
                                )}
                            </button>
                            <p className="text-center text-xs font-semibold text-slate-500 mt-4 h-4">
                                Sem compromisso. Cancele quando quiser.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
