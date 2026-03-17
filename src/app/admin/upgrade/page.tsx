"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Rocket, ChefHat, PieChart, Users, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function UpgradePage() {
    const searchParams = useSearchParams();
    const feature = searchParams.get('feature');
    const { user } = useAuth();
    const plan = user?.restaurantData?.subscriptionPlan || 'essencial';

    const featureMap: Record<string, { title: string, description: string, reqPlan: string, icon: any }> = {
        'kitchen': {
            title: 'Kitchen Display System (KDS)',
            description: 'Acabe com os papéis perdidos. Tenha a tela interativa na cozinha sincronizada em tempo real com o salão e a entrega.',
            reqPlan: 'Growth',
            icon: ChefHat
        },
        'analytics': {
            title: 'Analytics & Relatórios Avançados',
            description: 'Descubra os seus pratos mais rentáveis, horários de pico e otimize o seu lucro com inteligência de dados.',
            reqPlan: 'Growth',
            icon: PieChart
        },
        'driver': {
            title: 'Painel do Motoboy & Entregas',
            description: 'Equipe a sua frota na rua com a app estilo Uber Eats. Controle as entregas e as taxas ganhas ao longo do dia.',
            reqPlan: 'Elite',
            icon: Rocket
        }
    };

    const currentFeature = featureMap[feature as keyof typeof featureMap] || {
        title: 'Funcionalidade Premium',
        description: 'Esta ferramenta foi desenhada para restaurantes de alto volume. Evolua o seu plano para destrancar este módulo.',
        reqPlan: 'Growth',
        icon: ShieldCheck
    };

    const FeatIcon = currentFeature.icon;

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            
            <div className="w-24 h-24 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10 mb-2 relative">
                <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] uppercase font-black px-2 py-1 rounded-full shadow-sm">
                    BLOQUEADO
                </div>
                <FeatIcon className="w-12 h-12 text-indigo-500" />
            </div>

            <div className="text-center max-w-lg">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-4">
                    Destranque {currentFeature.title}
                </h1>
                <p className="text-slate-500 text-lg leading-relaxed mb-8">
                    {currentFeature.description}
                </p>
            </div>

            <div className="bg-white border border-indigo-100 rounded-3xl p-8 max-w-xl w-full text-center shadow-xl shadow-slate-200/50">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold text-xs bg-indigo-50 text-indigo-600 mb-6 uppercase tracking-wider">
                    <Rocket className="w-3.5 h-3.5" /> O Próximo Nível
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-2">Evoluir do Plano <span className="capitalize">{plan}</span></h3>
                <p className="text-slate-500 mb-6">Para aceder a esta funcionalidade de imediato, o administrador do restaurante deverá solicitar Upgrade para o <strong>Plano {currentFeature.reqPlan}</strong>.</p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                    <Link href="/admin/settings?tab=Assinatura+SaaS" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 w-full sm:w-auto hover:-translate-y-1">
                        Ver Faturação e Planos <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link href="/admin/dashboard" className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all w-full sm:w-auto">
                        Voltar Atrás
                    </Link>
                </div>
            </div>
            
            <p className="text-xs text-slate-400 max-w-md text-center">
                Se efetuou a alteração do plano nos últimos 5 minutos, aguarde a sincronização ou recarregue a página.
            </p>

        </div>
    );
}
