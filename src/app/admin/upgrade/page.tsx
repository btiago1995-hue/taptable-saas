"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Rocket, ChefHat, PieChart, CreditCard, ArrowRight, ShieldCheck, Clock, MessageCircle, Zap, BarChart3, Truck } from "lucide-react";
import Link from "next/link";
import { PLAN_INFO, normalizePlan } from "@/lib/planGate";

// Mapa de features para info de upgrade
const FEATURE_MAP: Record<string, { title: string; description: string; reqPlan: 'growth' | 'pro'; icon: any }> = {
    kds: {
        title: "Kitchen Display System (KDS)",
        description: "Acabe com os papéis perdidos. Tela interactiva na cozinha sincronizada em tempo real com o salão e a entrega.",
        reqPlan: "growth",
        icon: ChefHat,
    },
    analytics: {
        title: "Analytics & Relatórios Avançados",
        description: "Descubra os pratos mais rentáveis, horários de pico e optimize o lucro com inteligência de dados real.",
        reqPlan: "growth",
        icon: BarChart3,
    },
    conta_corrente: {
        title: "Conta Corrente de Clientes",
        description: "Registe crédito, controle saldos e fidelize os seus clientes habituais com uma conta corrente integrada.",
        reqPlan: "growth",
        icon: CreditCard,
    },
    driver: {
        title: "App do Estafeta & Entregas",
        description: "Equipe a sua frota com a app estilo Uber Eats. Controle entregas e taxas ganhas ao longo do dia.",
        reqPlan: "growth",
        icon: Truck,
    },
    saft: {
        title: "SAF-T Export (DNRE)",
        description: "Exportação fiscal automatizada conforme normas da DNRE de Cabo Verde. Obrigatório para restaurantes com volume tributável.",
        reqPlan: "pro",
        icon: ShieldCheck,
    },
    retencoes: {
        title: "Retenções IRS/IRC",
        description: "Gestão automática de retenções na fonte para fornecedores e prestadores de serviço.",
        reqPlan: "pro",
        icon: ShieldCheck,
    },
};

export default function UpgradePage() {
    const searchParams = useSearchParams();
    const feature = searchParams.get("feature");
    const expired = searchParams.get("expired") === "true";
    const { user } = useAuth();
    const currentPlan = normalizePlan(user?.restaurantData?.subscriptionPlan);

    const featureInfo = FEATURE_MAP[feature || ""] || {
        title: "Funcionalidade Premium",
        description: "Esta ferramenta foi desenhada para restaurantes de alto volume. Evolua o seu plano para desbloquear este módulo.",
        reqPlan: "growth" as const,
        icon: Zap,
    };

    const FeatIcon = featureInfo.icon;
    const targetPlan = featureInfo.reqPlan;
    const targetPlanInfo = PLAN_INFO[targetPlan];
    const needsPRO = targetPlan === "pro";

    // Calcular dias restantes do trial
    const trialExpiry = user?.restaurantData?.subscriptionExpiresAt
        ? new Date(user.restaurantData.subscriptionExpiresAt)
        : null;
    const daysLeft = trialExpiry
        ? Math.max(0, Math.ceil((trialExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;
    const isTrialExpired = expired || (daysLeft !== null && daysLeft === 0);

    const whatsappMsg = encodeURIComponent(
        `Olá Dineo! Sou ${user?.name || "gestor"} do restaurante "${user?.restaurantName || ""}". Tenho interesse no plano PRO. Podem ajudar-me?`
    );

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 md:p-10 animate-in slide-in-from-bottom-6 duration-500">

            {/* Banner: Trial Expirado */}
            {isTrialExpired && (
                <div className="w-full max-w-2xl mb-8 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-2 bg-red-100 rounded-xl shrink-0">
                        <Clock className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="font-black text-red-800 text-base mb-1">O seu período de teste terminou</p>
                        <p className="text-red-600 text-sm font-medium">
                            O seu trial de 30 dias expirou. Escolha um plano para continuar a usar o Dineo sem interrupções.
                            Os seus dados e configurações estão guardados.
                        </p>
                    </div>
                </div>
            )}

            {/* Ícone da Feature */}
            {!isTrialExpired && (
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 relative shadow-lg shadow-indigo-100">
                    <div className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[9px] uppercase font-black px-2 py-0.5 rounded-full">
                        Bloqueado
                    </div>
                    <FeatIcon className="w-10 h-10 text-indigo-500" />
                </div>
            )}

            {/* Título */}
            <div className="text-center max-w-lg mb-8">
                {!isTrialExpired ? (
                    <>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                            {featureInfo.title}
                        </h1>
                        <p className="text-slate-500 text-base leading-relaxed">
                            {featureInfo.description}
                        </p>
                    </>
                ) : (
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Escolha o seu Plano
                    </h1>
                )}
            </div>

            {/* Cards de Upgrade */}
            <div className={`w-full max-w-2xl grid gap-4 ${isTrialExpired ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>

                {/* Starter → Growth (Self-service) */}
                {(targetPlan === "growth" || isTrialExpired) && currentPlan === "starter" && (
                    <div className="bg-white border-2 border-indigo-600 rounded-2xl p-6 shadow-xl shadow-indigo-100 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-lg text-slate-900">Growth</span>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Recomendado</span>
                        </div>
                        <p className="text-2xl font-black text-indigo-700 mb-1">
                            {targetPlanInfo.price.monthly.toLocaleString('pt-CV')} CVE
                            <span className="text-sm font-medium text-slate-400">/mês</span>
                        </p>
                        <p className="text-sm text-slate-500 mb-5">KDS, Analytics, App Entrega, Conta Corrente.</p>
                        <Link
                            href="/admin/settings?tab=Assinatura+SaaS"
                            className="mt-auto w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-600/20"
                        >
                            Fazer Upgrade <ArrowRight className="w-4 h-4" />
                        </Link>
                        <p className="text-xs text-slate-400 text-center mt-3 font-medium">Pagamento via Vinti4 / TPA</p>
                    </div>
                )}

                {/* Growth (destacado se já tem Growth e quer PRO) */}
                {isTrialExpired && currentPlan === "growth" && (
                    <div className="bg-white border-2 border-indigo-600 rounded-2xl p-6 shadow-xl shadow-indigo-100 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-lg text-slate-900">Growth</span>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Plano Actual</span>
                        </div>
                        <p className="text-2xl font-black text-indigo-700 mb-1">
                            2.990 CVE<span className="text-sm font-medium text-slate-400">/mês</span>
                        </p>
                        <p className="text-sm text-slate-500 mb-5">KDS, Analytics, App Entrega, Conta Corrente.</p>
                        <Link
                            href="/admin/settings?tab=Assinatura+SaaS"
                            className="mt-auto w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                            Regularizar <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {/* PRO — Falar com Equipa */}
                {(needsPRO || isTrialExpired) && (
                    <div className="bg-slate-900 rounded-2xl p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-lg text-white">PRO</span>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 text-white px-2 py-0.5 rounded-full">Premium</span>
                        </div>
                        <p className="text-2xl font-black text-slate-300 mb-1">
                            5.990 CVE<span className="text-sm font-medium text-slate-500">/mês</span>
                        </p>
                        <p className="text-sm text-slate-400 mb-5">SAF-T DNRE, Retenções IRS/IRC, Multi-loja.</p>
                        <a
                            href={`https://wa.me/238XXXXXXXX?text=${whatsappMsg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-auto w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                        >
                            <MessageCircle className="w-4 h-4" /> Falar com a Equipa
                        </a>
                        <p className="text-xs text-slate-500 text-center mt-3 font-medium">Resposta em menos de 24h</p>
                    </div>
                )}

                {/* Starter — se trial expirado e plano é starter */}
                {isTrialExpired && currentPlan === "starter" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col">
                        <span className="font-black text-lg text-slate-700 mb-1">Starter</span>
                        <p className="text-2xl font-black text-slate-700 mb-1">
                            1.490 CVE<span className="text-sm font-medium text-slate-400">/mês</span>
                        </p>
                        <p className="text-sm text-slate-500 mb-5">Cardápio QR, POS, Gestão de Mesas.</p>
                        <Link
                            href="/admin/settings?tab=Assinatura+SaaS"
                            className="mt-auto w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                            Manter Starter
                        </Link>
                    </div>
                )}
            </div>

            {/* Botão Voltar (só quando não é trial expirado) */}
            {!isTrialExpired && (
                <Link
                    href="/admin/dashboard"
                    className="mt-8 text-sm text-slate-400 hover:text-slate-700 font-bold transition-colors"
                >
                    ← Voltar ao painel
                </Link>
            )}

            <p className="text-xs text-slate-400 mt-6 max-w-md text-center font-medium">
                Os seus dados e configurações estão sempre guardados, independentemente do plano.
            </p>
        </div>
    );
}
