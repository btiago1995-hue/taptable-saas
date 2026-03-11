"use client";

import { useState, useEffect } from "react";
import { Save, QrCode, Percent, Link as LinkIcon, Store, AlertCircle, CheckCircle2 } from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function AdminSettings() {
    const { user } = useAuth();
    const tabs = ["Geral", "Pagamentos & Gorjetas", "Links & QR Codes", "Avaliações & Google"];
    const [activeTab, setActiveTab] = useState("Geral");
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Form States
    const [restaurantName, setRestaurantName] = useState("");
    const [tipPercentage, setTipPercentage] = useState("10%");
    const [activeTables, setActiveTables] = useState("45");
    const [googleLink, setGoogleLink] = useState("https://g.page/r/taptable/review");
    const [qrCodes, setQrCodes] = useState<{ table: number, url: string, link: string }[]>([]);

    useEffect(() => {
        // Load real restaurant data
        const loadRest = async () => {
            if (user?.restaurantId) {
                const { data } = await supabase.from('restaurants').select('name').eq('id', user.restaurantId).single();
                if (data) setRestaurantName(data.name);
            }
        };
        loadRest();
    }, [user?.restaurantId]);

    useEffect(() => {
        const generateQRs = async () => {
            if (!user?.restaurantId) return;

            const numTables = parseInt(activeTables) || 0;
            const newQRs = [];
            // Limit to 100 to prevent browser hanging on accidental crazy inputs
            const limit = Math.min(numTables, 100);

            for (let i = 1; i <= limit; i++) {
                try {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    const link = `${origin}/p/${user.restaurantId}/mesa/${i}`;
                    const url = await QRCode.toDataURL(link, { margin: 1, width: 200 });
                    newQRs.push({ table: i, url, link });
                } catch (err) {
                    console.error("Error generating QR", err);
                }
            }
            setQrCodes(newQRs);
        };

        generateQRs();
    }, [activeTables, user?.restaurantId]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            if (user?.restaurantId) {
                await supabase.from('restaurants').update({ name: restaurantName }).eq('id', user.restaurantId);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3 seconds
            }
        } catch (err) {
            console.error("Error saving restaurant settings", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Configurações</h1>
                    <p className="text-slate-500">Gerencie as preferências e integrações do seu restaurante.</p>
                </div>
                <div className="flex items-center gap-3">
                    {saveSuccess && (
                        <span className="text-emerald-600 flex items-center gap-1 text-sm font-semibold animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4" />
                            Salvo com sucesso!
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Salvar Alterações
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Left Column - Navigation/Tabs */}
                <div className="col-span-1 space-y-2">
                    {tabs.map((tab, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveTab(tab)}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === tab
                                ? "bg-primary-50 text-primary-700 font-bold"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Right Column - Forms */}
                <div className="col-span-1 md:col-span-2 space-y-6">

                    {activeTab === "Geral" && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <Store className="w-5 h-5 text-primary-600" />
                                Informações Básicas
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Restaurante</label>
                                    <input
                                        type="text"
                                        value={restaurantName}
                                        onChange={(e) => setRestaurantName(e.target.value)}
                                        placeholder="Ex: La Bella Pasta"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Este nome aparecerá no topo do cardápio digital para seus clientes.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "Pagamentos & Gorjetas" && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <Percent className="w-5 h-5 text-primary-600" />
                                Opções de Gorjeta
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Gorjeta Padrão Sugerida</label>
                                    <select
                                        value={tipPercentage}
                                        onChange={(e) => setTipPercentage(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    >
                                        <option value="5%">5%</option>
                                        <option value="10%">10%</option>
                                        <option value="12%">12%</option>
                                        <option value="15%">15%</option>
                                        <option value="20%">20%</option>
                                    </select>
                                </div>
                                <p className="text-xs text-slate-500">Esta será a opção pré-selecionada na tela de pagamento do cliente.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "Links & QR Codes" && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-primary-600" />
                                Links & QR Codes
                            </h3>

                            <div className="space-y-6">
                                {/* Delivery Link Section */}
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <h4 className="font-bold text-sm text-indigo-900 mb-2 flex items-center gap-2">
                                        <LinkIcon className="w-4 h-4" /> Link do Cardápio / Delivery
                                    </h4>
                                    <p className="text-xs text-indigo-700 mb-3">Compartilhe este link no seu Instagram ou WhatsApp para receber pedidos de Delivery e Retirada.</p>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            readOnly 
                                            value={user?.restaurantId ? `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/p/${user.restaurantId}/delivery` : ''} 
                                            className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none select-all font-mono"
                                        />
                                        <button 
                                            onClick={() => {
                                                if (user?.restaurantId) {
                                                    navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/p/${user.restaurantId}/delivery`);
                                                    alert("Link copiado para a área de transferência!");
                                                }
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Total de Mesas Ativas</label>
                                    <input
                                        type="number"
                                        value={activeTables}
                                        onChange={(e) => setActiveTables(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    />
                                </div>
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 text-orange-800 mt-4">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p className="text-sm">Se alterar a quantidade de mesas, os QR Codes abaixo serão atualizados instantaneamente.</p>
                                </div>
                                <div className="pt-4 border-t border-slate-100 mt-6">
                                    <h4 className="font-bold text-sm text-slate-800 mb-3 flex justify-between items-center">
                                        Pré-visualização
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{qrCodes.length} gerados</span>
                                    </h4>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                                        {qrCodes.map((qr) => (
                                            <a
                                                key={qr.table}
                                                href={qr.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-white p-2 rounded-lg shadow-sm flex flex-col items-center justify-center border border-slate-100 transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-md cursor-pointer group"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={qr.url} alt={`QR Mesa ${qr.table}`} className="w-16 h-16 object-contain group-hover:opacity-90 transition-opacity" />
                                                <span className="text-xs font-bold text-slate-600 mt-2 group-hover:text-primary-600 transition-colors">Mesa {qr.table}</span>
                                            </a>
                                        ))}
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button className="bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm w-full outline-none">
                                            Baixar PDF com Lote Completo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Avaliações & Google" && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <LinkIcon className="w-5 h-5 text-primary-600" />
                                Google Reviews
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Link direto de avaliação</label>
                                    <input
                                        type="url"
                                        value={googleLink}
                                        onChange={(e) => setGoogleLink(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Este link é mostrado aos clientes após finalizarem o pagamento na mesa. Encontre o link no seu Google Meu Negócio.</p>
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
