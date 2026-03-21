"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminLogin() {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            // Login
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (authError) throw authError;

            // Redirect to dashboard
            setTimeout(() => {
                router.push("/admin/dashboard");
            }, 800);

        } catch (err: any) {
            setErrorMsg("Email ou senha incorretos.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-slate-200">
            
            {/* ── NAVIGATION (Matching Landing Page) ────────────────────── */}
            <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm z-50 border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <span className="font-black text-2xl tracking-tight text-slate-900">Dineo</span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1 hidden sm:inline">by Servyx</span>
                    </Link>
                </div>
            </nav>

            <div className="flex-1 flex items-center justify-center p-6 mt-16">
                <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700">

                    {/* ── HEADER ─────────────────────────────────────────────────── */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
                            Bem-vindo de volta
                        </h1>
                        <p className="text-slate-500 font-medium text-base">
                            Entre para gerir o seu restaurante.
                        </p>
                    </div>

                    {/* ── FORM CARD ─────────────────────────────────────────────── */}
                    <div className="bg-white border border-slate-200 p-8 sm:p-10 rounded-[2rem] shadow-sm">
                        <form ref={formRef} onSubmit={handleAuth} className="space-y-6">
                            
                            <div>
                                <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">E-mail Corporativo</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all font-medium placeholder:text-slate-400"
                                    placeholder="joao@restaurante.cv"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Senha</label>
                                <input
                                    type="password"
                                    name="password"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all font-medium placeholder:text-slate-400"
                                    placeholder="Sua senha segura"
                                    required
                                />
                            </div>

                            {errorMsg && (
                                <div className="p-4 bg-red-50 text-red-600 font-bold text-sm rounded-2xl text-center border border-red-100">
                                    {errorMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black py-4 mt-6 rounded-2xl flex items-center justify-center gap-2 transition-colors group"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Entrar no Painel
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* ── FOOTER LINK ───────────────────────────────────────── */}
                        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                            <Link
                                href="/onboarding"
                                className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Restaurante novo? <span className="underline underline-offset-4">Criar Conta Grátis.</span>
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
