"use client";

import { useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { CreditCard, Smartphone, Loader2, Banknote } from "lucide-react";
import { mockStripe } from "@/lib/stripe";

export type PaymentMethod = "apple_pay" | "card" | "cash";

interface PaymentGatewayProps {
    totalAmount: number;
    onSuccess: (transactionId: string, method: PaymentMethod, status: "paid" | "pending") => void;
}

export function PaymentGateway({ totalAmount, onSuccess }: PaymentGatewayProps) {
    const [method, setMethod] = useState<PaymentMethod>("apple_pay");
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = async () => {
        if (!method) return;
        setIsProcessing(true);

        try {
            if (method === "cash") {
                // Instantly confirm for cash (Will pay at the counter)
                setTimeout(() => {
                    onSuccess(`tx_cash_${Date.now()}`, method, "pending");
                }, 800);
            } else {
                // Create Mock Intent
                const intent = await mockStripe.createPaymentIntent(totalAmount);
                // Confirm Mock Payment
                const result = await mockStripe.confirmPayment(intent.clientSecret);

                if (result.success) {
                    onSuccess(result.transactionId, method, "paid");
                }
            }
        } catch (error) {
            console.error("Payment failed", error);
        } finally {
            if (method !== "cash") {
                setIsProcessing(false);
            }
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 w-full md:max-w-md mt-4 mb-8">
            <div className="flex justify-between items-center mb-6">
                <span className="text-slate-600 font-medium">Total a Pagar</span>
                <span className="text-3xl font-extrabold text-slate-900 text-center">
                    {formatCurrency(totalAmount)}
                </span>
            </div>

            <div className="space-y-3 mb-6">
                <button
                    onClick={() => setMethod("cash")}
                    className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                        method === "cash"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Banknote className="w-5 h-5" />
                        <span className="font-semibold text-left">Dinheiro / Pagar no Balcão<span className="block text-xs font-normal text-slate-500 mt-0.5">Garçom vai fechar a conta na mesa</span></span>
                    </div>
                    {method === "cash" && (
                        <div className="w-4 h-4 rounded-full border-4 border-emerald-600 bg-white flex-shrink-0" />
                    )}
                </button>
                <button
                    onClick={() => setMethod("apple_pay")}
                    className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                        method === "apple_pay"
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5" />
                        <span className="font-semibold">Apple Pay</span>
                    </div>
                    {method === "apple_pay" && (
                        <div className="w-4 h-4 rounded-full border-4 border-white bg-slate-900" />
                    )}
                </button>

                <button
                    onClick={() => setMethod("card")}
                    className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                        method === "card"
                            ? "border-primary-600 bg-primary-50 text-primary-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5" />
                        <span className="font-semibold">Cartão de Crédito</span>
                    </div>
                    {method === "card" && (
                        <div className="w-4 h-4 rounded-full border-4 border-primary-600 bg-white" />
                    )}
                </button>
            </div>

            <button
                onClick={handlePayment}
                disabled={isProcessing || !method}
                className={cn(
                    "w-full font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg",
                    method === "cash"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                        : "bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white shadow-primary-600/30"
                )}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processando...
                    </>
                ) : (
                    method === "cash" ? "Confirmar Pedido (Dinheiro)" : `Pagar ${formatCurrency(totalAmount)}`
                )}
            </button>
        </div>
    );
}
