"use client";

import { useState, useMemo, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useOrders, LiveOrder } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, Banknote, CreditCard, Receipt, Store, AlertCircle, CheckCircle2, History, Clock, RotateCcw, Loader2, QrCode, X } from "lucide-react";

type TableData = {
    tableNumber: string;
    orders: LiveOrder[];
    totalAmount: number;
    hasPendingPayment: boolean;
    allDelivered: boolean;
};

interface CreditNote {
    id: string;
    original_order_id: string;
    value: number;
    reason: string;
    created_at: string;
}

export default function AdminCashierPage() {
    const { user } = useAuth();
    const { orders: activeOrders, closeTableOrders } = useOrders();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "vinti4" | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [showCashConfirmation, setShowCashConfirmation] = useState(false);
    const [activeTab, setActiveTab] = useState<"active" | "history">("active");

    // Credit Note State
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [estornoOrder, setEstornoOrder] = useState<LiveOrder | null>(null);
    const [estornoReason, setEstornoReason] = useState("");
    const [isEstornando, setIsEstornando] = useState(false);

    // E-Fatura QR Code State
    const [qrCodeData, setQrCodeData] = useState<{ orderId: string; iud: string; numeroDoc: string; url: string } | null>(null);
    const [isFetchingQr, setIsFetchingQr] = useState<string | null>(null); // orderId being fetched

    // Fetch Credit Notes for the day
    useEffect(() => {
        if (!user?.restaurantId) return;
        
        const fetchCreditNotes = async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data } = await supabase
                .from('credit_notes')
                .select('*')
                .eq('restaurant_id', user.restaurantId)
                .gte('created_at', today.toISOString());
                
            if (data) setCreditNotes(data);
        };

        fetchCreditNotes();
    }, [user?.restaurantId]);

    // Group active orders by table
    const tableGroups = useMemo(() => {
        const groups: Record<string, TableData> = {};

        activeOrders.forEach(order => {
            // We only care about orders that are active in the system
            if (order.status === 'delivered' && order.paymentStatus === 'paid') return; // Fully done

            if (!groups[order.tableNumber]) {
                groups[order.tableNumber] = {
                    tableNumber: String(order.tableNumber),
                    orders: [],
                    totalAmount: 0,
                    hasPendingPayment: false,
                    allDelivered: true,
                };
            }

            groups[order.tableNumber].orders.push(order);
            groups[order.tableNumber].totalAmount += order.totalAmount;

            if (order.paymentStatus === 'pending') {
                groups[order.tableNumber].hasPendingPayment = true;
            }
            if (order.status !== 'delivered') {
                groups[order.tableNumber].allDelivered = false;
            }
        });

        return Object.values(groups).sort((a, b) => {
            // Sort by table number (try treating as numbers if possible)
            const numA = parseInt(a.tableNumber) || 0;
            const numB = parseInt(b.tableNumber) || 0;
            return numA - numB;
        });
    }, [activeOrders]);

    const historyOrders = useMemo(() => {
        return activeOrders
            .filter(order => order.status === 'delivered' && order.paymentStatus === 'paid')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [activeOrders]);

    const totalEarned = useMemo(() => {
        const gross = historyOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const refunds = creditNotes.reduce((sum, cn) => sum + Number(cn.value), 0);
        return gross - refunds;
    }, [historyOrders, creditNotes]);

    const filteredTables = tableGroups.filter(t =>
        t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingCashAmount = selectedTable
        ? selectedTable.orders.filter(o => o.paymentStatus === 'pending').reduce((acc, order) => acc + order.totalAmount, 0)
        : 0;

    const handleSelectTable = (t: TableData) => {
        setSelectedTable(t);
        setPaymentMethod(null);
        setShowCashConfirmation(false);
    };

    const attemptCloseTable = () => {
        if (!selectedTable || !paymentMethod) return;

        // Force explicit confirmation if they want to close it as Cash
        if (paymentMethod === "cash" && pendingCashAmount > 0) {
            setShowCashConfirmation(true);
            return;
        }

        executeCloseTable();
    };

    const executeCloseTable = async () => {
        if (!selectedTable || !paymentMethod) return;

        setIsClosing(true);
        try {
            const allOrderIds = selectedTable.orders.map(o => o.id);

            // Close all orders at once (DB + UI)
            await closeTableOrders(allOrderIds, paymentMethod);

            setSelectedTable(null);
            setPaymentMethod(null);
            setShowCashConfirmation(false);
        } catch (error) {
            console.error("Error closing table:", error);
            alert("Erro ao fechar mesa. Por favor, tente novamente.");
        } finally {
            setIsClosing(false);
        }
    };

    const handleCreateCreditNote = async () => {
        if (!estornoOrder || !estornoReason || !user?.restaurantId) return;
        setIsEstornando(true);
        try {
            const { data, error } = await supabase.from('credit_notes').insert([{
                restaurant_id: user.restaurantId,
                original_order_id: estornoOrder.id,
                value: estornoOrder.totalAmount,
                reason: estornoReason,
                issued_by: user.id
            }]).select().single();

            if (error) throw error;
            if (data) {
                setCreditNotes(prev => [data, ...prev]);
            }
            // Close modal
            setEstornoOrder(null);
            setEstornoReason("");
            alert("Nota de Crédito (Estorno) emitida com sucesso.");
        } catch (error: any) {
            console.error("Estorno failed", error);
            alert("Erro ao emitir estorno: " + error.message);
        } finally {
            setIsEstornando(false);
        }
    };

    const handleShowQrCode = async (orderId: string) => {
        setIsFetchingQr(orderId);
        try {
            const { data } = await supabase
                .from("orders")
                .select("iud, document_number")
                .eq("id", orderId)
                .single();

            if (data?.iud) {
                setQrCodeData({
                    orderId,
                    iud: data.iud,
                    numeroDoc: data.document_number || data.iud,
                    url: `https://pe.efatura.cv/dfe/view/${data.iud}`,
                });
            } else {
                alert("E-Fatura ainda não gerada para este pedido.");
            }
        } catch {
            alert("Erro ao buscar dados E-Fatura.");
        } finally {
            setIsFetchingQr(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Caixa & Mesas</h1>
                    <p className="text-slate-500">Visualize as mesas abertas, consolide os gastos e feche as contas.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab("active")}
                        className={cn("px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2", activeTab === "active" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        Mesas Abertas
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={cn("px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2", activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        <History className="w-4 h-4" />
                        Histórico do Dia
                    </button>
                </div>
            </div>

            {activeTab === "active" ? (
                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    {/* Tables Grid (Left View) */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative w-full max-w-sm">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar nº da mesa..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
                        {filteredTables.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Store className="w-12 h-12 mb-3 opacity-20" />
                                <p className="font-medium">Nenhuma mesa aberta no salão no momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredTables.map(t => (
                                    <button
                                        key={t.tableNumber}
                                        onClick={() => handleSelectTable(t)}
                                        className={cn(
                                            "flex flex-col p-4 rounded-2xl border text-left transition-all relative overflow-hidden group",
                                            selectedTable?.tableNumber === t.tableNumber
                                                ? "bg-slate-900 border-slate-900 shadow-md ring-4 ring-slate-900/10"
                                                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                                        )}
                                    >
                                        <div className="flex justify-between items-start w-full mb-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center font-black text-lg",
                                                selectedTable?.tableNumber === t.tableNumber
                                                    ? "bg-white/10 text-white"
                                                    : "bg-slate-100 text-slate-700"
                                            )}>
                                                {t.tableNumber}
                                            </div>
                                            {t.hasPendingPayment && (
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600 tooltip" title="Aguardando Pagamento">
                                                    <Banknote className="w-3.5 h-3.5" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-full">
                                            <p className={cn(
                                                "text-xs font-semibold uppercase tracking-wider mb-0.5",
                                                selectedTable?.tableNumber === t.tableNumber ? "text-slate-400" : "text-slate-500"
                                            )}>Consumo Total</p>
                                            <p className={cn(
                                                "text-xl font-black truncate",
                                                selectedTable?.tableNumber === t.tableNumber ? "text-white" : "text-slate-900"
                                            )}>
                                                {formatCurrency(t.totalAmount)}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Checkout Panel (Right View) */}
                <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
                    <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight w-full">Extrato de Conta</h2>
                            <p className="text-slate-400 text-xs font-medium">Selecione uma mesa</p>
                        </div>
                    </div>

                    {!selectedTable ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50">
                            <Receipt className="w-16 h-16 mb-4 opacity-20" />
                            <p className="font-medium text-sm">Clique em uma mesa ao lado para visualizar o extrato e realizar o fechamento do caixa.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
                                <span className="font-bold text-emerald-900">Mesa {selectedTable.tableNumber}</span>
                                {!selectedTable.allDelivered && (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                                        <AlertCircle className="w-3.5 h-3.5" /> Pedidos na Cozinha
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                {/* Group 1: Pendentes (Dinheiro) */}
                                {selectedTable.orders.filter(o => o.paymentStatus === 'pending').length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Conta Pendente (A Receber)
                                        </h3>
                                        <div className="space-y-4">
                                            {selectedTable.orders.filter(o => o.paymentStatus === 'pending').map(order => (
                                                <div key={order.id} className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                                                    <div className="flex justify-between text-xs text-amber-900/60 mb-2 font-bold">
                                                        <span>Pedido #{order.id.slice(0, 4)}</span>
                                                        <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    {(order.customerName || order.customerNif || order.customerPhone) && (
                                                        <div className="mb-3 p-2 bg-amber-100/50 rounded-lg text-xs font-medium text-amber-800 space-y-0.5">
                                                            {order.customerName && <div className="flex items-center gap-1.5"><strong className="text-amber-900">Nome:</strong> {order.customerName}</div>}
                                                            {order.customerNif && <div className="flex items-center gap-1.5"><strong className="text-amber-900">NIF (Fatura):</strong> {order.customerNif}</div>}
                                                            {order.customerPhone && <div className="flex items-center gap-1.5"><strong className="text-amber-900">Tel:</strong> {order.customerPhone}</div>}
                                                        </div>
                                                    )}
                                                    <ul className="space-y-1">
                                                        {order.items.map((item: any, idx: number) => (
                                                            <li key={idx} className="flex justify-between items-start text-sm">
                                                                <span className="font-medium text-amber-900 flex gap-2">
                                                                    <span className="text-amber-700 font-bold">{item.quantity}x</span>
                                                                    {item.name}
                                                                </span>
                                                                <span className="font-bold text-amber-800">{formatCurrency(item.price * item.quantity)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Group 2: Pagos */}
                                {selectedTable.orders.filter(o => o.paymentStatus === 'paid').length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4" /> Já Pagos Online
                                        </h3>
                                        <div className="space-y-4 opacity-75">
                                            {selectedTable.orders.filter(o => o.paymentStatus === 'paid').map(order => (
                                                <div key={order.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                                    <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium">
                                                        <span>Pedido #{order.id.slice(0, 4)}</span>
                                                        <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {order.items.map((item: any, idx: number) => (
                                                            <li key={idx} className="flex justify-between items-start text-sm">
                                                                <span className="font-medium text-slate-800 flex gap-2">
                                                                    <span className="text-slate-400 font-bold">{item.quantity}x</span>
                                                                    {item.name}
                                                                </span>
                                                                <span className="font-bold text-slate-700">{formatCurrency(item.price * item.quantity)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 border-t border-slate-200 p-5 mt-auto shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-slate-500 font-bold tracking-wide uppercase text-sm">Total a Pagar</span>
                                    <span className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(selectedTable.totalAmount)}</span>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Método de Pagamento</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setPaymentMethod("card")}
                                            className={cn(
                                                "p-3 rounded-xl border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all active:scale-95",
                                                paymentMethod === "card"
                                                    ? "border-primary-600 bg-primary-50 text-primary-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            <CreditCard className={cn("w-6 h-6", paymentMethod === "card" ? "text-primary-600" : "text-slate-400")} />
                                            Cartão / TPA
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod("cash")}
                                            className={cn(
                                                "p-3 rounded-xl border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all active:scale-95",
                                                paymentMethod === "cash"
                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            <Banknote className={cn("w-6 h-6", paymentMethod === "cash" ? "text-emerald-500" : "text-slate-400")} />
                                            Dinheiro
                                        </button>
                                    </div>
                                </div>

                                {/* Conditional Button Flow */}
                                {showCashConfirmation ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-2">
                                        <p className="text-center text-amber-700 font-bold text-sm mb-3">
                                            Você recebeu o valor de {formatCurrency(pendingCashAmount)} do cliente?
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowCashConfirmation(false)}
                                                className="flex-1 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={executeCloseTable}
                                                disabled={isClosing}
                                                className="flex-[2] py-3 rounded-xl font-black bg-amber-500 text-white hover:bg-amber-600 shadow-md flex justify-center items-center"
                                            >
                                                {isClosing ? "Fechando..." : "Confirmar Recebimento"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={attemptCloseTable}
                                        disabled={!paymentMethod || isClosing}
                                        className={cn(
                                            "w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-sm",
                                            !paymentMethod
                                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                : paymentMethod === 'cash' && pendingCashAmount > 0
                                                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                                                    : "bg-slate-900 hover:bg-slate-800 text-white"
                                        )}
                                    >
                                        {isClosing ? "Processando..." : (
                                            <>
                                                <CheckCircle2 className="w-5 h-5" /> Fechar Conta da Mesa
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            ) : (
                <div className="flex flex-col flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-slate-400" />
                                Histórico de Fechamentos
                            </h2>
                            <p className="text-sm text-slate-500">Pedidos finalizados e pagos (Dinheiro e Cartão).</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Total Recebido</p>
                            <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalEarned)}</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        {historyOrders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                                <Search className="w-12 h-12 mb-3 opacity-20" />
                                <p className="font-medium">Nenhum pedido finalizado no dia de hoje.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="p-4 font-bold text-slate-500 text-sm">Hora</th>
                                        <th className="p-4 font-bold text-slate-500 text-sm">Pedido</th>
                                        <th className="p-4 font-bold text-slate-500 text-sm">Origem</th>
                                        <th className="p-4 font-bold text-slate-500 text-sm">Itens</th>
                                        <th className="p-4 font-bold text-slate-500 text-sm text-right">Valor Pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyOrders.map(order => (
                                        <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-sm font-medium text-slate-600">
                                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-4 text-sm font-bold text-slate-900">
                                                #{order.orderNumber || order.id.slice(0, 4)}
                                            </td>
                                            <td className="p-4 text-sm font-medium text-slate-700">
                                                {order.orderType === 'in_store' ? `Mesa ${order.tableNumber}` : 'Delivery / Balcão'}
                                            </td>
                                            <td className="p-4 text-sm text-slate-500 max-w-[300px] truncate">
                                                {order.items.map((i:any) => `${i.quantity}x ${i.name}`).join(', ')}
                                            </td>
                                            <td className="p-4 text-sm font-black text-emerald-700 text-right">
                                                {creditNotes.some(cn => cn.original_order_id === order.id) ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="line-through opacity-50 text-slate-400 font-medium">{formatCurrency(order.totalAmount)}</span>
                                                        <span className="text-red-500 font-bold text-xs uppercase tracking-wider mt-0.5">ESTORNADO</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {formatCurrency(order.totalAmount)}
                                                        <button
                                                            onClick={() => handleShowQrCode(order.id)}
                                                            disabled={isFetchingQr === order.id}
                                                            className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded font-bold transition-all flex items-center gap-1"
                                                            title="Ver QR Code E-Fatura"
                                                        >
                                                            {isFetchingQr === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
                                                            E-Fatura
                                                        </button>
                                                        {user?.role === 'manager' && (
                                                            <button
                                                                onClick={() => setEstornoOrder(order)}
                                                                className="opacity-0 group-hover:opacity-100 text-xs bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-600 px-2 py-1 rounded font-bold transition-all flex items-center gap-1"
                                                                title="Emitir Nota de Crédito"
                                                            >
                                                                <RotateCcw className="w-3 h-3" /> Estornar
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* E-Fatura QR Code Modal */}
            {qrCodeData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                    <QrCode className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">E-Fatura</h3>
                                    <p className="text-xs font-medium text-slate-500">{qrCodeData.numeroDoc}</p>
                                </div>
                            </div>
                            <button onClick={() => setQrCodeData(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col items-center gap-4">
                            <div className="p-3 bg-white border-2 border-slate-200 rounded-xl">
                                <QRCodeSVG value={qrCodeData.url} size={200} />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-mono text-slate-500 break-all">{qrCodeData.iud}</p>
                                <p className="text-xs text-slate-400 mt-1">Verificar em pe.efatura.cv</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Estorno Modal */}
            {estornoOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <RotateCcw className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Estornar Fatura</h3>
                                <p className="text-xs font-medium text-slate-500">Emitir Nota de Crédito (Pedido #{estornoOrder.orderNumber || estornoOrder.id.slice(0,4)})</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 text-sm font-medium flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>Por exigências fiscais da DNRE, esta ação é irreversível. Uma Nota de Crédito será gerada no valor de <strong>{formatCurrency(estornoOrder.totalAmount)}</strong>.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Motivo do Estorno <span className="text-red-500">*</span></label>
                                <textarea 
                                    value={estornoReason}
                                    onChange={e => setEstornoReason(e.target.value)}
                                    placeholder="Ex: Erro de digitação na máquina de cartão, Cliente devolveu o prato, etc."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none h-24"
                                    required
                                />
                            </div>
                        </div>
                        <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button 
                                onClick={() => setEstornoOrder(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                disabled={isEstornando || estornoReason.trim().length < 5}
                                onClick={handleCreateCreditNote}
                                className="flex-1 px-4 py-2.5 rounded-xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isEstornando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Estorno"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
