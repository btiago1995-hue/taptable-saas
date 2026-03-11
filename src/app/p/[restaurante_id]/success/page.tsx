"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Star, TicketPercent, ExternalLink, Clock } from "lucide-react";

export default function SuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const txId = searchParams.get("tx");

    const [claimed, setClaimed] = useState(false);

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
                Tudo certo com a sua conta. O restaurante já foi notificado. {txId && <span className="block text-xs text-slate-400 mt-2">Ref: {txId}</span>}
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
                    <p className="text-2xl font-extrabold text-blue-700">~ 28<span className="text-sm font-bold">min</span></p>
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

            {/* Coupon / Loyalty */}
            <div className="w-full max-w-sm bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 shadow-lg shadow-primary-600/30 text-white">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-xl mb-1">Ganhe 15% OFF</h3>
                        <p className="text-primary-100 text-sm">Na sua próxima visita</p>
                    </div>
                    <TicketPercent className="w-8 h-8 text-primary-200" />
                </div>

                <button
                    onClick={() => setClaimed(true)}
                    disabled={claimed}
                    className="w-full bg-white text-primary-900 font-bold py-3 rounded-xl hover:bg-primary-50 disabled:bg-primary-900 disabled:text-primary-400 transition-colors"
                >
                    {claimed ? "Cupom Salvo na Carteira!" : "Resgatar Meu Cupom"}
                </button>
            </div>

            <button
                onClick={() => router.push("/")} /* Return to dummy home */
                className="mt-8 text-slate-500 font-medium hover:text-slate-800 transition-colors"
            >
                Voltar ao Início
            </button>

        </div>
    );
}
