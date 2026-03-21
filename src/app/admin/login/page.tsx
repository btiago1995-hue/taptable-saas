"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2, ArrowRight } from "lucide-react";
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
        <div className="min-h-screen bg-[#080b14] flex items-center justify-center p-6 font-sans relative overflow-hidden">
            
            {/* ── BACKGROUND EFFECTS ────────────────────────────────────────── */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
            </div>

            <div className="w-full max-w-[420px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <Link href="/" className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 mb-8 hover:bg-white/10 transition-colors">
                        <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                            <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-black text-lg tracking-tight text-white">Dineo</span>
                    </Link>
                    
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                        Bem-vindo de volta
                    </h1>
                    <p className="text-slate-400 font-medium text-sm">
                        O sistema financeiro do seu restaurante.
                    </p>
                </div>

                {/* ── FORM CARD ─────────────────────────────────────────────── */}
                <div className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                    
                    <form ref={formRef} onSubmit={handleAuth} className="space-y-5">
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">E-mail Corporativo</label>
                            <input
                                type="email"
                                name="email"
                                className="w-full bg-[#0a0d1a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium"
                                placeholder="joao@restaurante.cv"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Senha</label>
                            <input
                                type="password"
                                name="password"
                                className="w-full bg-[#0a0d1a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium"
                                placeholder="Sua senha segura"
                                required
                            />
                        </div>

                        {errorMsg && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm rounded-xl text-center">
                                {errorMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-black py-4 mt-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 group"
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
                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <Link
                            href="/onboarding"
                            className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                        >
                            Restaurante novo? <span className="text-violet-400 underline decoration-violet-400/30 underline-offset-4">Criar Conta Grátis.</span>
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
