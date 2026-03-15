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
        plan: "growth" // "essential" | "growth"
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
        <div className="flex-1 flex bg-slate-50 items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            {/* Background decors */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-indigo-50/50 rounded-full blur-3xl opacity-50 -z-10" />

            <div className="w-full max-w-4xl flex flex-col md:flex-row gap-12 items-center md:items-start justify-center">

                {/* Left Side: Progress & Value Prop */}
                <div className="w-full md:w-1/3 flex flex-col pt-8 hidden md:flex">
                    <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Comece a vender em minutos.</h1>

                    <div className="space-y-6 relative">
                        {/* Progress Line */}
                        <div className="absolute left-[15px] top-[24px] bottom-[24px] w-0.5 bg-slate-200 z-0" />

                        {[
                            { step: 1, label: "A sua Conta", desc: "Os seus dados de acesso" },
                            { step: 2, label: "O seu Negócio", desc: "A face do seu restaurante" },
                            { step: 3, label: "O seu Plano", desc: "Comece o teste de 14 dias" }
                        ].map((s) => (
                            <div key={s.step} className="flex gap-4 relative z-10 transition-opacity duration-300" style={{ opacity: step >= s.step ? 1 : 0.4 }}>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors",
                                    step > s.step ? "bg-indigo-600 text-white" : step === s.step ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-white text-slate-400 border-2 border-slate-200"
                                )}>
                                    {step > s.step ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                                </div>
                                <div className="pt-1">
                                    <p className={cn("font-bold", step >= s.step ? "text-slate-900" : "text-slate-500")}>{s.label}</p>
                                    <p className="text-sm font-medium text-slate-400">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Form Wizard */}
                <div className="w-full md:w-1/2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-8 min-h-[480px] flex flex-col relative overflow-hidden">
                    
                    {errorMsg && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 font-semibold text-sm rounded-xl animate-in fade-in slide-in-from-top-2">
                            {errorMsg}
                        </div>
                    )}

                    {/* STEP 1: Personal Info */}
                    {step === 1 && (
                        <div className="flex flex-col flex-1 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Crie a sua Conta</h2>
                            <p className="text-slate-500 font-medium mb-8">Será o Gestor Principal do restaurante.</p>

                            <div className="space-y-5 flex-1">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Primeiro e Último Nome</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => updateForm('name', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors font-medium"
                                        placeholder="Ex: Rui Pereira"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">E-mail Profissional</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => updateForm('email', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors font-medium"
                                        placeholder="rui@restaurante.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Senha Segura</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => updateForm('password', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors font-medium"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={nextStep}
                                className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                Continuar <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Restaurant Details */}
                    {step === 2 && (
                        <div className="flex flex-col flex-1 animate-in slide-in-from-right-8 fade-in duration-300">
                            <button onClick={() => setStep(1)} className="absolute -top-2 -left-2 p-2 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 font-bold text-sm">
                                <ArrowLeft className="w-4 h-4" /> Voltar
                            </button>
                            
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 mt-4">Os dados do Restaurante</h2>
                            <p className="text-slate-500 font-medium mb-8">Esta é a marca que os clientes vão ver.</p>

                            <div className="space-y-5 flex-1">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome Comercial</label>
                                    <input
                                        type="text"
                                        value={formData.restaurantName}
                                        onChange={(e) => updateForm('restaurantName', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 transition-colors font-medium text-lg"
                                        placeholder="Ex: Pizzaria Bella Napoli"
                                    />
                                </div>
                                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex gap-3 text-sm font-medium text-indigo-800">
                                    <Store className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />
                                    <p>O seu QR Code e Link de Delivery serão gerados automaticamente baseados neste nome após a criação.</p>
                                </div>
                            </div>

                            <button
                                onClick={nextStep}
                                className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                Escolher Plano <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Plan Selection */}
                    {step === 3 && (
                        <div className="flex flex-col flex-1 animate-in slide-in-from-right-8 fade-in duration-300">
                            <button onClick={() => setStep(2)} className="absolute -top-2 -left-2 p-2 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 font-bold text-sm" disabled={isLoading}>
                                <ArrowLeft className="w-4 h-4" /> Voltar
                            </button>
                            
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 mt-4">Escolha a sua Base</h2>
                            <p className="text-slate-500 font-medium mb-6">Todos os planos incluem 14 dias de teste gratuito.</p>

                            <div className="space-y-4 flex-1">
                                {/* Plan Card: Essencial */}
                                <label className={cn(
                                    "flex flex-col border-2 rounded-2xl p-5 cursor-pointer transition-all hover:bg-slate-50",
                                    formData.plan === "essential" ? "border-slate-900 bg-slate-50 ring-4 ring-slate-100" : "border-slate-200 bg-white"
                                )}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name="plan" 
                                                value="essential" 
                                                className="w-5 h-5 accent-slate-900"
                                                checked={formData.plan === "essential"}
                                                onChange={() => updateForm('plan', 'essential')}
                                                disabled={isLoading}
                                            />
                                            <span className="font-bold text-lg text-slate-900">Essencial</span>
                                        </div>
                                        <span className="font-bold text-slate-600">1.990 CVE</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 ml-8">Cardápio QR e Ponto de Venda. Ideal para novos negócios.</p>
                                </label>

                                {/* Plan Card: Growth */}
                                <label className={cn(
                                    "flex flex-col border-2 rounded-2xl p-5 cursor-pointer transition-all relative overflow-hidden",
                                    formData.plan === "growth" ? "border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"
                                )}>
                                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl">Recomendado</div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name="plan" 
                                                value="growth" 
                                                className="w-5 h-5 accent-indigo-600"
                                                checked={formData.plan === "growth"}
                                                onChange={() => updateForm('plan', 'growth')}
                                                disabled={isLoading}
                                            />
                                            <span className="font-bold text-lg text-indigo-900">Growth</span>
                                        </div>
                                        <span className="font-bold text-indigo-600">4.990 CVE</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 ml-8">KDS, App de Motoristas e Analytics Realtime.</p>
                                </label>
                            </div>

                            <button
                                onClick={handleCreateAccount}
                                disabled={isLoading}
                                className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-indigo-600/30"
                            >
                                {isLoading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> A Criar Ambiente Próprio...</>
                                ) : (
                                    <>Ouvir a Mágica 🪄</>
                                )}
                            </button>
                            <p className="text-center text-xs font-semibold text-slate-400 mt-4">
                                Sem compromisso. Cancele quando quiser.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
