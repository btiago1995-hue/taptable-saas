"use client";
// Force Vercel Redeploy - Ver 1.0.1

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Save, QrCode, Percent, Link as LinkIcon, Store, AlertCircle, CheckCircle2, Printer, CreditCard, CalendarClock, BadgeDollarSign } from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/utils";

export default function AdminSettings() {
    return (
        <Suspense fallback={<div className="p-8 text-slate-500">A carregar definições...</div>}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const tabs = ["Geral", "Pagamentos & Gorjetas", "Links & QR Codes", "Avaliações & Google", "Assinatura SaaS"];
    const [activeTab, setActiveTab] = useState("Geral");
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && tabs.includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams, tabs]);

    // Form States
    const [restaurantName, setRestaurantName] = useState("");
    const [nifNumber, setNifNumber] = useState("");
    const [address, setAddress] = useState("");
    const [tipPercentage, setTipPercentage] = useState("10%");
    const [deliveryFee, setDeliveryFee] = useState("0");
    const [vinti4PosId, setVinti4PosId] = useState("");
    const [vinti4PosAutCode, setVinti4PosAutCode] = useState("");
    const [activeTables, setActiveTables] = useState("45");
    const [googleLink, setGoogleLink] = useState("https://g.page/r/dineo/review");
    const [qrCodes, setQrCodes] = useState<{ table: number, url: string, link: string }[]>([]);
    const [deliveryQr, setDeliveryQr] = useState<{url: string, link: string} | null>(null);

    useEffect(() => {
        // Load real restaurant data
        const loadRest = async () => {
            if (user?.restaurantId) {
                const { data } = await supabase
                    .from('restaurants')
                    .select('name, nif_number, address, active_tables, tip_percentage, google_review_link, delivery_fee, vinti4_pos_id, vinti4_pos_aut_code')
                    .eq('id', user.restaurantId)
                    .single();
                    
                if (data) {
                    setRestaurantName(data.name || "");
                    if (data.nif_number) setNifNumber(data.nif_number);
                    if (data.address) setAddress(data.address);
                    if (data.active_tables) setActiveTables(data.active_tables.toString());
                    if (data.tip_percentage) setTipPercentage(data.tip_percentage);
                    if (data.delivery_fee) setDeliveryFee(data.delivery_fee.toString());
                    if (data.vinti4_pos_id) setVinti4PosId(data.vinti4_pos_id);
                    if (data.vinti4_pos_aut_code) setVinti4PosAutCode(data.vinti4_pos_aut_code);
                    if (data.google_review_link) setGoogleLink(data.google_review_link);
                }
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

            // Generate single delivery QR
            try {
                const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                const deliveryUrl = `${origin}/p/${user.restaurantId}/delivery`;
                const deliveryQrImg = await QRCode.toDataURL(deliveryUrl, { margin: 1, width: 200 });
                setDeliveryQr({ url: deliveryQrImg, link: deliveryUrl });
            } catch (err) {
                console.error("Error generating Delivery QR", err);
            }
        };

        generateQRs();
    }, [activeTables, user?.restaurantId]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            if (user?.restaurantId) {
                const { error } = await supabase.from('restaurants').update({ 
                    name: restaurantName,
                    nif_number: nifNumber,
                    address: address,
                    active_tables: parseInt(activeTables) || 45,
                    tip_percentage: tipPercentage,
                    delivery_fee: parseFloat(deliveryFee) || 0,
                    vinti4_pos_id: vinti4PosId,
                    vinti4_pos_aut_code: vinti4PosAutCode,
                    google_review_link: googleLink
                }).eq('id', user.restaurantId);
                
                if (error) throw error;
                
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3 seconds
            }
        } catch (err: any) {
            console.error("Error saving restaurant settings", err);
            alert("Erro ao gravar definições: " + (err.message || 'Falha na BD.'));
        } finally {
            setIsSaving(false);
        }
    };

    // SaaS Billing Logic (Moved from billing page)
    const handlePaySaaS = async () => {
        setIsSaving(true);
        try {
            let amountDue = 4990;
            if (user?.subscriptionPlan === 'essencial') amountDue = 1990;
            else if (user?.subscriptionPlan === 'elite') amountDue = 9900;

            const res = await fetch('/api/vinti4/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: `SAAS_${user?.restaurantId}_${Date.now()}`,
                    amount: amountDue,
                    restaurantId: user?.restaurantId,
                    b2bSaaSPayment: true
                })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao gerar fatura B2B Vinti4Net.");

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
            alert(err.message + "\n\n(Lembrete: Para usar pagamentos B2B da mensalidade Dineo, configure as chaves mestras SISP no servidor.)");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="mb-8 flex items-center justify-between print:hidden">
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
                <div className="col-span-1 space-y-2 print:hidden">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">NIF do Estabelecimento</label>
                                        <input
                                            type="text"
                                            maxLength={9}
                                            value={nifNumber}
                                            onChange={(e) => setNifNumber(e.target.value)}
                                            placeholder="Ex: 000 000 000"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium font-mono tracking-widest outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Morada Sede Fiscal</label>
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Ex: Rua Direita, Prainha, Praia"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">Estas entidades e identificadores locais serão impressos obrigatoriamente no cabeçalho das Guias Oficiais e recibos para o cumprimento do código fiscal de Cabo Verde (E-Fatura).</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "Pagamentos & Gorjetas" && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <Percent className="w-5 h-5 text-primary-600" />
                                Opções de Gorjeta
                            </h3>

                            <div className="space-y-6">
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
                                    <p className="text-xs text-slate-500 mt-1">Esta será a opção pré-selecionada na tela de pagamento para mesas no salão.</p>
                                </div>

                                <div className="border-t border-slate-100 pt-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Taxa Fixa de Entrega (CVE)</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 font-medium">
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            value={deliveryFee}
                                            onChange={(e) => setDeliveryFee(e.target.value)}
                                            placeholder="Ex: 150"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Este valor será cobrado automaticamente e somado na conta de todos os clientes que pedirem via Delivery. Configure como "0" se a entrega for grátis.
                                    </p>
                                </div>

                                <div className="border-t border-slate-100 pt-6">
                                    <h4 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                                        Integração Vinti4 (Pagamento Online)
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">POS ID (Comerciante)</label>
                                            <input
                                                type="text"
                                                value={vinti4PosId}
                                                onChange={(e) => setVinti4PosId(e.target.value)}
                                                placeholder="Ex: 9000000"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Chave de Autorização</label>
                                            <input
                                                type="password"
                                                value={vinti4PosAutCode}
                                                onChange={(e) => setVinti4PosAutCode(e.target.value)}
                                                placeholder="Sua chave secreta SISP"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Insira as credenciais fornecidas pela SISP (Vinti4Net). Ao preencher, os seus clientes poderão pagar a conta diretamente pelo celular usando o Cartão Vinti4.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Links & QR Codes" && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in print:shadow-none print:border-none print:p-0">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2 print:hidden">
                                <QrCode className="w-5 h-5 text-primary-600" />
                                Links & QR Codes
                            </h3>

                            <div className="space-y-6">
                                {/* Delivery Link Section */}
                                <div className="p-4 md:p-6 bg-indigo-50 border border-indigo-100 rounded-xl print:hidden flex flex-col sm:flex-row gap-6 items-center">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm text-indigo-900 mb-2 flex items-center gap-2">
                                            <LinkIcon className="w-4 h-4" /> Link para Delivery & Redes Sociais
                                        </h4>
                                        <p className="text-xs text-indigo-700 mb-4 leading-relaxed">Compartilhe este link no seu perfil do Instagram ou via WhatsApp para receber pedidos externos (Delivery e Retirada) diretamente no painel do restaurante.</p>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                readOnly 
                                                value={deliveryQr?.link || ''} 
                                                className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none select-all font-mono"
                                            />
                                            <button 
                                                onClick={() => {
                                                    if (user?.restaurantId) {
                                                        navigator.clipboard.writeText(deliveryQr?.link || '');
                                                        alert("Link copiado para a área de transferência!");
                                                    }
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm whitespace-nowrap"
                                            >
                                                Copiar
                                            </button>
                                        </div>
                                    </div>
                                    {deliveryQr && (
                                        <div className="shrink-0 flex flex-col items-center bg-white p-3 rounded-xl shadow-sm border border-indigo-100">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={deliveryQr.url} alt="Delivery QR Code" className="w-24 h-24 mb-2" />
                                            <span className="text-xs font-bold text-indigo-600">Scan Delivery</span>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-slate-100 pt-6 print:hidden">
                                    <h4 className="font-bold text-sm text-slate-800 mb-4">Mapeamento de Mesas Físicas (Salão)</h4>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Total de Mesas Ativas</label>
                                    <input
                                        type="number"
                                        value={activeTables}
                                        onChange={(e) => setActiveTables(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all mb-4"
                                    />
                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 text-orange-800">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <p className="text-sm leading-relaxed">
                                            Ao alterar o número de mesas, guarde as configurações primeiro. Os novos códigos QR abaixo substituirão os antigos perfeitamente. Coloque cada QR código na mesa exata correspondente para que os pedidos caiam no lugar certo.
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 mt-6">
                                    <div className="flex justify-between items-center mb-4 print:hidden">
                                        <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                            Cartões de QR Code ({qrCodes.length} gerados)
                                        </h4>
                                        <button 
                                            onClick={() => window.print()}
                                            className="bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold px-4 py-2 rounded-lg transition-colors text-xs flex items-center gap-1"
                                        >
                                            <Printer className="w-4 h-4" /> Imprimir Cartões
                                        </button>
                                    </div>
                                    
                                    {/* Print Mode CSS handles this grid specifically */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-4 border border-slate-100 rounded-xl bg-slate-50/50 print:grid-cols-3 print:max-h-none print:bg-white print:border-none print:p-0 print:overflow-visible">
                                        {qrCodes.map((qr) => (
                                            <div
                                                key={qr.table}
                                                className="bg-white p-3 md:p-4 rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-100 transition-all hover:border-primary-300 hover:shadow-md print:border-2 print:border-slate-300 print:shadow-none print:m-2 print:break-inside-avoid"
                                            >
                                                <div className="bg-slate-900 text-white w-full text-center py-1 rounded-t-md text-[10px] font-black uppercase tracking-widest print:py-1">
                                                    Dineo
                                                </div>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={qr.url} alt={`QR Mesa ${qr.table}`} className="w-20 h-20 md:w-28 md:h-28 mt-2 object-contain" />
                                                <span className="text-sm font-black text-slate-800 mt-2 mb-1">Mesa {qr.table}</span>
                                                <span className="text-[9px] text-slate-400 font-semibold mb-2 print:hidden">Aponte a câmera</span>
                                                <a 
                                                    href={qr.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full text-center py-1.5 mt-auto bg-slate-50 hover:bg-slate-100 text-slate-500 rounded text-[10px] font-bold transition-colors border border-slate-200 print:hidden"
                                                >
                                                    Copiar Link
                                                </a>
                                            </div>
                                        ))}
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

                    {activeTab === "Assinatura SaaS" && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="bg-slate-900 p-6 text-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Plano Atual</p>
                                            <h3 className="text-2xl font-black capitalize">{user?.restaurantData?.subscriptionPlan || 'Growth'} (Mensal)</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Valor Licença</p>
                                            <div className="text-2xl font-black text-emerald-400">
                                                {formatCurrency(user?.restaurantData?.subscriptionPlan === 'essencial' ? 1990 : user?.restaurantData?.subscriptionPlan === 'elite' ? 9900 : 4990)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-6 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                                <CalendarClock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase">Próximo Vencimento</p>
                                                <p className="font-bold text-slate-800">15 de Abril de 2026</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handlePaySaaS}
                                            disabled={isSaving}
                                            className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <CreditCard className="w-4 h-4" /> Regularizar Vinti4
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <BadgeDollarSign className="w-4 h-4" /> Parceiro de Licenciamento
                                        </h4>
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 mb-1">Servyx</p>
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    Entidade responsável pelo licenciamento do software Dineo. Para faturas específicas com NIF empresa, contacte o suporte.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-4">Histórico Recente</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <div>
                                            <div className="font-bold text-slate-700">INV-2026-03</div>
                                            <div className="text-slate-500 text-xs">15 Mar 2026</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">Liquidado</div>
                                            <div className="text-emerald-600 text-xs flex items-center gap-1 justify-end mt-0.5 font-bold">
                                                <CheckCircle2 className="w-3 h-3" /> OK
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

            </div>

            {/* Print CSS Rules */}
            <style jsx global>{`
                @media print {
                    @page { margin: 10mm; }
                    body { background: white; margin: 0; padding: 0; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:border-none { border: none !important; }
                    .print\\:m-2 { margin: 0.5rem !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:break-inside-avoid { break-inside: avoid !important; }
                    /* Make main content full width */
                    main { overflow: visible !important; width: 100% !important; max-width: none !important; padding: 0 !important; }
                    aside, nav { display: none !important; }
                }
            `}</style>
        </div>
    );
}
