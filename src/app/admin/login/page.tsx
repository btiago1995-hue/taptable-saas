"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLogin() {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            if (isRegistering) {
                const restaurantName = formData.get("restaurantName") as string;
                const name = formData.get("name") as string;

                // 1. Sign up built-in auth
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (authError) throw authError;

                if (!authData.user) throw new Error("Erro ao criar usuário.");

                // 2. Create Restaurant Tenant
                const { data: restData, error: restErr } = await supabase.from('restaurants')
                    .insert([{ name: restaurantName }])
                    .select('id')
                    .single();
                if (restErr) throw restErr;

                // 3. Create Custom User Profile linking Auth to Tenant
                const { error: profileErr } = await supabase.from('users').insert([{
                    id: authData.user.id,
                    restaurant_id: restData.id,
                    name: name,
                    role: 'manager'
                }]);
                if (profileErr) throw profileErr;

            } else {
                // Login
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (authError) throw authError;
            }

            // Redirect to dashboard
            setTimeout(() => {
                router.push("/admin/dashboard");
            }, 800);

        } catch (err: any) {
            setErrorMsg(err.message || "Erro de autenticação");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Logo Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary-500/30">
                        <Store className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">TapTable Admin</h1>
                    <p className="text-slate-500 mt-2 text-center text-sm">
                        {isRegistering ? "Crie sua conta para começar a vender." : "O sistema operacional do seu restaurante."}
                    </p>
                </div>

                {/* Login/Register Form */}
                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                    <form ref={formRef} onSubmit={handleAuth} className="space-y-4">

                        {isRegistering && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome do Restaurante</label>
                                    <input
                                        type="text"
                                        name="restaurantName"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors"
                                        placeholder="Ex: Pizzaria Bella Napoli"
                                        required={isRegistering}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Seu Nome</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors"
                                        placeholder="Ex: João da Silva"
                                        required={isRegistering}
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail Corporativo</label>
                            <input
                                type="email"
                                name="email"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors"
                                placeholder="joao@restaurante.com"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-slate-700">Senha</label>
                            </div>
                            <input
                                type="password"
                                name="password"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors"
                                placeholder={isRegistering ? "Mínimo de 6 caracteres" : "Sua senha segura"}
                                required
                            />
                        </div>

                        {errorMsg && (
                            <div className="p-3 bg-red-50 text-red-600 font-semibold text-sm rounded-xl">
                                {errorMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 mt-2 rounded-xl flex items-center justify-center gap-2 transition-all group"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isRegistering ? "Criar meu Restaurante" : "Entrar no Painel"}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setErrorMsg("");
                                formRef.current?.reset();
                            }}
                            className="text-sm font-semibold text-slate-500 hover:text-primary-600 transition-colors"
                        >
                            {isRegistering ? "Já tenho uma conta. Fazer Login." : "Sou um restaurante novo. Criar Conta."}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
