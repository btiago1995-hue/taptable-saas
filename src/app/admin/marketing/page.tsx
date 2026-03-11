"use client";

import { useState } from "react";
import { Megaphone, MessageSquare, Mail, Sparkles, Send, Coins } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminMarketing() {
    const [activeTab, setActiveTab] = useState("campanhas");

    return (
        <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Marketing & Fidelidade</h1>
                    <p className="text-slate-500">Aumente a recorrência dos seus clientes com campanhas automáticas.</p>
                </div>
            </div>

            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("campanhas")}
                    className={`pb-3 px-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === "campanhas" ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                >
                    Campanhas Automáticas
                </button>
                <button
                    onClick={() => setActiveTab("cashback")}
                    className={`pb-3 px-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === "cashback" ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                >
                    Progama de Cashback
                </button>
            </div>

            {activeTab === "campanhas" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                        <div className="mb-6 flex gap-3 items-center">
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <Megaphone className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Nova Campanha</h3>
                                <p className="text-sm text-slate-500">Dispare mensagens para sua base</p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Público-Alvo</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-primary-500 transition-all">
                                    <option>Todos os Clientes (1,245 contatos)</option>
                                    <option>Clientes Inativos há 30 dias (312 contatos)</option>
                                    <option>Clientes VIPs (84 contatos)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Canal de Envio</label>
                                <div className="flex gap-3">
                                    <button className="flex-1 bg-primary-50 border border-primary-200 text-primary-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                                        <MessageSquare className="w-4 h-4" /> SMS
                                    </button>
                                    <button className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                                        <Mail className="w-4 h-4" /> E-mail
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                                    Mensagem
                                    <button className="text-primary-600 flex items-center gap-1 hover:underline">
                                        <Sparkles className="w-3 h-3" /> Gerar com IA
                                    </button>
                                </label>
                                <textarea
                                    rows={4}
                                    defaultValue="Olá {nome}! Sentimos sua falta no La Bella Pasta 🍝 Ganhe 15% de desconto na sua próxima visita mostrando essa mensagem. Válido até Domingo."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-primary-500 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <button className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20">
                            <Send className="w-5 h-5" /> Enviar Campanha Agora
                        </button>
                    </div>

                    {/* Campaign History Mock */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 border-dashed flex flex-col">
                        <h3 className="font-bold text-slate-800 mb-6">Campanhas Recentes</h3>

                        <div className="space-y-4">
                            {[
                                { name: "Promoção Dia dos Namorados", target: "Todos", date: "Há 2 meses", conv: "12%", type: "SMS" },
                                { name: "Resgate VIP Inativos", target: "Inativos 30d", date: "Semana passada", conv: "28%", type: "Email" },
                            ].map((camp, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-900">{camp.name}</h4>
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-semibold">{camp.type}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs text-slate-500">Público: {camp.target} • {camp.date}</p>
                                        <p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                            Conversão: {camp.conv}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto text-center pt-8">
                            <p className="text-sm text-slate-500">Gere {formatCurrency(85000)} em faturamento estimado para cada {formatCurrency(10000)} investido em mensagens SMS usando nossa automação.</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "cashback" && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl">
                    <div className="mb-6 flex gap-3 items-center">
                        <div className="bg-emerald-100 p-3 rounded-xl">
                            <Coins className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Cashback Wallet</h3>
                            <p className="text-sm text-slate-500">Dê motivos de sobra para seus clientes voltarem sempre.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <h4 className="font-bold text-slate-900">Ativar Programa de Cashback</h4>
                                <p className="text-sm text-slate-500">Acumular saldo a cada pagamento via TapTable.</p>
                            </div>
                            {/* Mock Toggle */}
                            <div className="w-12 h-6 bg-emerald-500 rounded-full cursor-pointer relative transition-colors shadow-inner">
                                <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Percentual de Retorno (%)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="1"
                                    max="15"
                                    defaultValue="5"
                                    className="flex-1 accent-emerald-500"
                                />
                                <span className="font-bold text-xl text-emerald-600 w-12 text-center">5%</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Um cashback de 5% aumenta a retenção em média 40% num período de 90 dias.</p>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-emerald-600/20">
                                Salvar Configurações de Fidelidade
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
