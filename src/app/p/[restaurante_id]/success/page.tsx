"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Star, ExternalLink, Clock, Gift, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function SuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const txId = searchParams.get("tx");
    const previousTable = searchParams.get("table");
    const previousMethod = searchParams.get("method");

    const [whatsapp, setWhatsapp] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [claimed, setClaimed] = useState(false);

    const handleRegisterLoyalty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!whatsapp || whatsapp.length < 9) {
            alert("Por favor, insira um número de WhatsApp válido.");
            return;
        }

        setIsRegistering(true);
        try {
            await supabase.rpc('increment_loyalty_stars', {
                p_restaurant_id: params.restaurante_id,
                p_phone_number: whatsapp,
                p_name: "Cliente Direto", // Fallback name
                p_stars_to_add: 1
            });
            setClaimed(true);
        } catch (error) {
            console.error("Erro ao registrar fidelidade:", error);
            alert("Houve um problema. Tente verificar suas estrelas na página inicial.");
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="min-h-screen bg-primary-50 font-sans flex flex-col items-center justify-center p-6 text-slate-900">

            {/* Success Icon */}
            <div className="bg-white p-4 rounded-full shadow-lg shadow-green-500/20 mb-6 animate-bounce" style={{ animationIterationCount: 1 }}>
                <CheckCircle2 className="w-16 h-16 text-secondary-500" />
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-2 text-center">
                Pagamento Concluído!
            </h1>
            <p className="text-slate-600 mb-6 text-center max-w-xs">
                Tudo certo com a sua conta. O restaurante já foi notificado. 
                {txId && (
                    <span className="block mt-4 bg-white/50 py-2 px-4 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-800 font-bold">
                        Acompanhe pelo Pedido: <span className="text-indigo-600 text-lg">#{txId}</span>
                    </span>
                )}
            </p>

            {/* Service Time Estimate */}
            <div className="w-full max-w-sm bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 shadow-sm flex items-center justify-between transform transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-200/50 p-3 rounded-xl text-blue-700">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Tempo de preparo</h3>
                        <p className="text-xs text-slate-500">Média atual do restaurante</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-extrabold text-blue-700 leading-tight">Preparando<br/><span className="text-sm font-medium text-blue-600/80">Aguarde o chamado</span></p>
                </div>
            </div>

            {/* Google Review Prompt */}
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-4 transform transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-yellow-100 p-2 rounded-lg">
                        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Avalie sua experiência</h3>
                        <p className="text-sm text-slate-500">Ajude-nos a melhorar!</p>
                    </div>
                </div>

                <a
                    href="https://google.com" // Mock link
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                    Deixar Avaliação no Google
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>

            {/* Loyalty Lead Gen */}
            <div className="w-full max-w-sm bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-6 shadow-xl shadow-amber-500/20 text-white transform transition-all hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-extrabold text-xl mb-1 tracking-tight">Desbloqueie Prêmios</h3>
                        <p className="text-amber-100 text-sm font-medium">Cadastre-se e ganhe sua 1ª Estrela!</p>
                    </div>
                    <Gift className="w-8 h-8 text-amber-100" />
                </div>

                {!claimed ? (
                    <form onSubmit={handleRegisterLoyalty} className="space-y-3">
                        <input 
                            type="tel" 
                            required
                            placeholder="Seu WhatsApp: (00) 00000-0000" 
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            className="w-full bg-white/20 border border-white/30 placeholder-white/70 text-white rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
                        />
                        <button
                            type="submit"
                            disabled={isRegistering}
                            className="w-full bg-white text-amber-600 font-extrabold py-3 rounded-xl hover:bg-amber-50 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                        >
                            {isRegistering ? <Loader2 className="w-5 h-5 animate-spin"/> : "Entrar pro Clube Agora"}
                        </button>
                    </form>
                ) : (
                    <div className="bg-amber-500 text-white p-4 rounded-xl border border-amber-400 font-medium text-center shadow-inner">
                        🎉 <strong>Estrela Mágica Adicionada!</strong> <br/><span className="text-sm">Você já faz parte do clube. Verifique seu saldo no Cardápio.</span>
                    </div>
                )}
            </div>

            <button
                onClick={() => {
                    const returnUrl = previousTable 
                        ? `/p/${params.restaurante_id}/mesa/${previousTable}`
                        : previousMethod 
                            ? `/p/${params.restaurante_id}/delivery?method=${previousMethod}`
                            : `/p/${params.restaurante_id}`;
                    
                    router.push(returnUrl);
                }}
                className="mt-8 text-slate-500 font-medium hover:text-slate-800 transition-colors flex items-center gap-2"
            >
                Voltar ao Início
            </button>

        </div>
    );
}
