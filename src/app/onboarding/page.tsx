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
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative bg-white selection:bg-slate-200">
            <div className="w-full max-w-5xl flex flex-col md:flex-row gap-12 lg:gap-20 items-center md:items-start justify-center relative z-10">

                {/* Left Side: Progress & Value Prop */}
                <div className="w-full md:w-5/12 flex flex-col pt-8 hidden md:flex">
                    <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-10 tracking-tight leading-[1.1]">
                        Comece a faturar<br/>
                        <span className="text-slate-400">em minutos.</span>
                    </h1>

                    <div className="space-y-10 relative">
                        {/* Progress Line */}
                        <div className="absolute left-[15px] top-[24px] bottom-[24px] w-px bg-slate-100 z-0" />

                        {[
                            { step: 1, label: "A sua Conta", desc: "Acessos de Gestor Principal" },
                            { step: 2, label: "O Restaurante", desc: "O seu espaço no Dineo" },
                            { step: 3, label: "O seu Plano", desc: "Comece 14 dias sem risco" }
                        ].map((s) => (
                            <div key={s.step} className="flex gap-6 relative z-10 transition-all duration-500" style={{ opacity: step >= s.step ? 1 : 0.4 }}>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-500",
                                    step > s.step 
                                        ? "bg-slate-900 text-white" 
                                        : step === s.step 
                                            ? "bg-slate-900 text-white ring-4 ring-slate-100 scale-110" 
                                            : "bg-white text-slate-400 border border-slate-200"
                                )}>
                                    {step > s.step ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                                </div>
                                <div className="pt-1">
                                    <p className={cn("font-black text-lg", step >= s.step ? "text-slate-900" : "text-slate-400")}>{s.label}</p>
                                    <p className="text-sm font-medium text-slate-500 mt-1">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Form Wizard */}
                <div className="w-full md:w-7/12 bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 sm:p-10 min-h-[480px] flex flex-col relative overflow-hidden">
                    
                    {errorMsg && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 font-bold text-sm rounded-2xl text-center animate-in fade-in slide-in-from-top-2">
                            {errorMsg}
                        </div>
                    )}

                    {/* STEP 1: Personal Info */}
                    {step === 1 && (
                        <div className="flex flex-col flex-1 animate-in slide-in-from-right-8 fade-in duration-500">
                            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Crie a sua Conta</h2>
                            <p className="text-slate-500 font-medium mb-10">Será o Gestor Principal do restaurante.</p>

                            <div className="space-y-6 flex-1">
                                <div>
                                    <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Primeiro e Último Nome</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => updateForm('name', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all font-medium placeholder:text-slate-400"
                                        placeholder="Ex: Rui Pereira"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">E-mail Profissional</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => updateForm('email', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all font-medium placeholder:text-slate-400"
                                        placeholder="rui@restaurante.cv"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Senha Segura</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => updateForm('password', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all font-medium placeholder:text-slate-400"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={nextStep}
                                className="mt-10 w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 group"
                            >
                                Continuar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Restaurant Details */}
                    {step === 2 && (
                        <div className="flex flex-col flex-1 animate-in slide-in-from-right-8 fade-in duration-500">
                            <button onClick={() => setStep(1)} className="absolute -top-2 -left-2 p-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 font-bold text-sm">
                                <ArrowLeft className="w-4 h-4" /> Voltar
                            </button>
                            
                            <h2 className="text-3xl font-black text-slate-900 mb-2 mt-4 tracking-tight">O seu Restaurante</h2>
                            <p className="text-slate-500 font-medium mb-10">Esta é a marca que os clientes vão ver.</p>

                            <div className="space-y-6 flex-1">
                                <div>
                                    <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Nome Comercial</label>
                                    <input
                                        type="text"
                                        value={formData.restaurantName}
                                        onChange={(e) => updateForm('restaurantName', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all font-medium placeholder:text-slate-400"
                                        placeholder="Ex: Pizzaria Bella Napoli"
                                    />
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex gap-4 text-sm font-medium text-slate-600">
                                    <Store className="w-5 h-5 shrink-0 text-slate-400 mt-0.5" />
                                    <p className="leading-relaxed">O QR Code das suas mesas e o Link de Delivery público serão gerados automaticamente baseados neste nome durante a criação.</p>
                                </div>
                            </div>

                            <button
                                onClick={nextStep}
                                className="mt-10 w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 group"
                            >
                                Escolher Plano <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Plan Selection */}
                    {step === 3 && (
                        <div className="flex flex-col flex-1 animate-in slide-in-from-right-8 fade-in duration-500 max-h-[600px] overflow-y-auto no-scrollbar">
                            <button onClick={() => setStep(2)} className="absolute -top-2 -left-2 p-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 font-bold text-sm" disabled={isLoading}>
                                <ArrowLeft className="w-4 h-4" /> Voltar
                            </button>
                            
                            <h2 className="text-3xl font-black text-slate-900 mb-2 mt-4 tracking-tight">Escolha o seu Plano</h2>
                            <p className="text-slate-500 font-medium mb-8">Todos os planos incluem 14 dias de teste gratuito.</p>

                            <div className="space-y-4 flex-1">
                                {/* Plan Card: Essencial */}
                                <label className={cn(
                                    "flex flex-col border-2 rounded-2xl p-5 cursor-pointer transition-all relative overflow-hidden",
                                    formData.plan === "essential" ? "border-slate-900 bg-slate-50" : "border-slate-100 bg-white hover:border-slate-300",
                                    formData.plan !== "essential" && formData.plan ? "opacity-60 hover:opacity-100" : ""
                                )}>
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name="plan" 
                                                value="essential" 
                                                className="w-5 h-5 accent-slate-900 bg-transparent border-slate-300"
                                                checked={formData.plan === "essential"}
                                                onChange={() => updateForm('plan', 'essential')}
                                                disabled={isLoading}
                                            />
                                            <span className="font-black text-lg text-slate-900">Essencial</span>
                                        </div>
                                        <span className="font-black text-slate-500">1.990 CVE</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 ml-8 relative z-10 mt-1">Cardápio QR e Ponto de Venda (Salão).</p>
                                </label>

                                {/* Plan Card: Growth */}
                                <label className={cn(
                                    "flex flex-col border-2 rounded-2xl p-5 cursor-pointer transition-all relative overflow-hidden",
                                    formData.plan === "growth" ? "border-slate-900 bg-slate-900 text-white shadow-xl scale-[1.02] z-10" : "border-slate-100 bg-white hover:border-slate-300",
                                    formData.plan !== "growth" && formData.plan ? "opacity-60 hover:opacity-100" : ""
                                )}>
                                    <div className={`absolute top-0 right-0 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl ${formData.plan === "growth" ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"}`}>Popular</div>
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name="plan" 
                                                value="growth" 
                                                className="w-5 h-5 accent-white bg-transparent border-slate-300"
                                                checked={formData.plan === "growth"}
                                                onChange={() => updateForm('plan', 'growth')}
                                                disabled={isLoading}
                                            />
                                            <span className={`font-black text-lg ${formData.plan === "growth" ? "text-white" : "text-slate-900"}`}>Growth</span>
                                        </div>
                                        <span className={`font-black ${formData.plan === "growth" ? "text-slate-300" : "text-slate-500"}`}>4.990 CVE</span>
                                    </div>
                                    <p className={`text-sm font-medium ml-8 relative z-10 mt-1 ${formData.plan === "growth" ? "text-slate-300" : "text-slate-500"}`}>KDS, Display de Cobertura e App de Entrega.</p>
                                </label>

                                {/* Plan Card: Elite */}
                                <label className={cn(
                                    "flex flex-col border-2 rounded-2xl p-5 cursor-pointer transition-all relative overflow-hidden",
                                    formData.plan === "elite" ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900 scale-[1.02] shadow-xl z-10" : "border-slate-100 bg-white hover:border-slate-300",
                                    formData.plan !== "elite" && formData.plan ? "opacity-60 hover:opacity-100" : ""
                                )}>
                                    <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">Premium</div>
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name="plan" 
                                                value="elite" 
                                                className="w-5 h-5 accent-slate-900 bg-transparent border-slate-300"
                                                checked={formData.plan === "elite"}
                                                onChange={() => updateForm('plan', 'elite')}
                                                disabled={isLoading}
                                            />
                                            <span className="font-black text-lg text-slate-900 tracking-wide">Elite</span>
                                        </div>
                                        <span className="font-black text-slate-500">9.900 CVE</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 ml-8 relative z-10 mt-1">Operações logísticas próprias e DNRE.</p>
                                </label>
                            </div>

                            <button
                                onClick={handleCreateAccount}
                                disabled={isLoading}
                                className="mt-10 w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                            >
                                {isLoading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> A Configurar o seu Restaurante...</>
                                ) : (
                                    <>Criar Conta 🚀</>
                                )}
                            </button>
                            <p className="text-center text-xs font-bold text-slate-400 mt-6 h-4">
                                Sem compromisso. Cancele quando quiser.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
