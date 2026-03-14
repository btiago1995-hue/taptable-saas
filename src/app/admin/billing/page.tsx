"use client";

import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, AlertCircle, CalendarClock, ShieldAlert, BadgeDollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

export default function SaaSBillingPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    let planName = "Growth (Mensal)";
    let amountDue = 4990;
    if (user?.subscriptionPlan === 'essencial') {
        planName = "Essencial (Mensal)";
        amountDue = 1990;
    } else if (user?.subscriptionPlan === 'elite') {
        planName = "Elite (Mensal)";
        amountDue = 9900;
    }

    const subscriptionData = {
        planName,
        status: "active",
        nextBillingDate: "15 de Abril de 2026",
        amountDue,
        currency: "CVE",
        history: [
            { id: "INV-001", date: "15 Fev 2026", amount: amountDue, status: "paid" },
            { id: "INV-002", date: "15 Mar 2026", amount: amountDue, status: "paid" }
        ]
    };

    const handlePaySaaS = async () => {
        setIsLoading(true);
        try {
            // Flow: Pay TIMEINVEST (SaaS Master Account) directly.
            // In a real scenario, this endpoint `/api/vinti4/checkout` would accept a parameter 
            // indicating this is a B2B SaaS payment. If true, it uses the global ENV credentials 
            // `TIMEINVEST_VINTI4_POS_ID` instead of the restaurant's credentials.
            
            const res = await fetch('/api/vinti4/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: `SAAS_${user?.restaurantId}_${Date.now()}`,
                    amount: subscriptionData.amountDue,
                    restaurantId: user?.restaurantId, // The identity making the payment
                    b2bSaaSPayment: true // Flag to tell the backend to use the TimeInvest Master Keys
                })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                 // The backend will throw because we haven't added SISP Master Keys yet.
                 throw new Error(data.error || "Ocorreu um erro ao gerar fatura B2B Vinti4Net.");
            }

            // Execute Redirect
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.actionUrl;
            Object.keys(data.formData).forEach(key => {
                const hiddenField = document.createElement('input');
                hiddenField.type = 'hidden';
                hiddenField.name = key;
                hiddenField.value = data.formData[key];
                form.appendChild(hiddenField);
            });

            document.body.appendChild(form);
            form.submit();

        } catch (err: any) {
            alert(err.message + "\\n\\n(Lembrete: Para usar pagamentos B2B da mensalidade TapTable, configure as chaves mestras SISP no servidor.)");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Assinatura & Faturamento</h1>
                <p className="text-slate-500">Gira a sua licença do software TapTable e histórico de pagamentos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Current Plan Card */}
                <div className="col-span-1 md:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
                            
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wider uppercase mb-3 backdrop-blur-sm border border-white/10">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ativo
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight">{subscriptionData.planName}</h2>
                                    <p className="text-indigo-200 mt-1">Licença Completa de uso do Ecossistema</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black">{formatCurrency(subscriptionData.amountDue)}</div>
                                    <div className="text-indigo-200 text-sm">/ {subscriptionData.currency} por mês</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <CalendarClock className="w-5 h-5 text-indigo-500" />
                                Próxima Faturação
                            </h3>
                            
                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
                                <div>
                                    <div className="text-sm font-bold text-slate-700">Data de Vencimento</div>
                                    <div className="text-slate-500">{subscriptionData.nextBillingDate}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-700">Valor Estimado</div>
                                    <div className="text-slate-500">{formatCurrency(subscriptionData.amountDue)}</div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4 border-t border-slate-100">
                                <p className="text-sm text-slate-500">O seu software será bloqueado caso a mensalidade atrase mais de 5 dias após o vencimento.</p>
                                <button 
                                    onClick={handlePaySaaS}
                                    disabled={isLoading}
                                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <CreditCard className="w-4 h-4" />
                                    )}
                                    Pagar com Vinti4 (SISP)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Histórico */}
                <div className="col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                        <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-4">Histórico de Faturas</h3>
                        <div className="space-y-4">
                            {subscriptionData.history.map((inv, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <div>
                                        <div className="font-bold text-slate-700">{inv.id}</div>
                                        <div className="text-slate-500 text-xs">{inv.date}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-900">{formatCurrency(inv.amount)}</div>
                                        <div className="text-emerald-600 text-xs flex items-center gap-1 justify-end mt-0.5">
                                            <CheckCircle2 className="w-3 h-3" /> Pago
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-2xl shadow-sm text-white">
                        <h3 className="font-bold flex items-center gap-2 mb-2">
                            <BadgeDollarSign className="w-5 h-5 text-emerald-400" />
                            TimeInvest
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                            Emissor oficial da Licença TapTable. Se precisar de recibos com NIF para a contabilidade da empresa, contacte-nos no suporte WhatsApp.
                        </p>
                        <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg text-sm transition-colors cursor-not-allowed">
                            Transferir Recibos PDF
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
