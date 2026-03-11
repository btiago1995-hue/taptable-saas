"use client";

import { useState, useMemo } from "react";
import { useOrders, LiveOrder } from "@/lib/OrderContext";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, Banknote, CreditCard, Receipt, Store, AlertCircle, CheckCircle2 } from "lucide-react";

type TableData = {
    tableNumber: string;
    orders: LiveOrder[];
    totalAmount: number;
    hasPendingPayment: boolean;
    allDelivered: boolean;
};

export default function AdminCashierPage() {
    const { orders: activeOrders, updatePaymentStatus } = useOrders();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | null>(null);
    const [isClosing, setIsClosing] = useState(false);

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

    const filteredTables = tableGroups.filter(t =>
        t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCloseTable = async () => {
        if (!selectedTable || !paymentMethod) return;

        setIsClosing(true);
        try {
            // In a real app with a dedicated backend, this would be a single atomic transaction.
            // Here, we update each pending order for this table sequentially.
            const pendingOrders = selectedTable.orders.filter(o => o.paymentStatus === 'pending');

            for (const order of pendingOrders) {
                // We're tagging the method here in the UI only for now, 
                // but we trigger the existing updatePaymentStatus context helper.
                updatePaymentStatus(order.id, 'paid');
            }

            setSelectedTable(null);
            setPaymentMethod(null);
            alert(`Mesa ${selectedTable.tableNumber} fechada com sucesso via ${paymentMethod === 'cash' ? 'Dinheiro' : 'Multibanco/Cartão'}.`);
        } catch (error) {
            console.error("Error closing table:", error);
            alert("Erro ao fechar mesa.");
        } finally {
            setIsClosing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Caixa & Mesas</h1>
                <p className="text-slate-500">Visualize as mesas abertas, consolide os gastos e feche as contas.</p>
            </div>

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
                                        onClick={() => setSelectedTable(t)}
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

                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {selectedTable.orders.map(order => (
                                    <div key={order.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                        <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium">
                                            <span>Pedido #{order.id.slice(0, 4)}</span>
                                            <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <ul className="space-y-2">
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

                                <button
                                    onClick={handleCloseTable}
                                    disabled={!paymentMethod || isClosing}
                                    className={cn(
                                        "w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-sm",
                                        !paymentMethod
                                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                            : "bg-slate-900 hover:bg-slate-800 text-white transform hover:scale-[1.02] hover:shadow-md"
                                    )}
                                >
                                    {isClosing ? "Processando..." : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" /> Fechar Conta da Mesa
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
