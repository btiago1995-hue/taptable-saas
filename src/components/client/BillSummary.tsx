import { MenuItem } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

interface BillSummaryProps {
    items: MenuItem[];
    subtotal: number;
}

export function BillSummary({ items, subtotal }: BillSummaryProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Seu Pedido</h2>

            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                        <div className="flex flex-col">
                            <span className="text-slate-700 font-medium">
                                {item.quantity}x {item.name}
                            </span>
                        </div>
                        <span className="text-slate-900 font-semibold text-right">
                            {formatCurrency(item.price * item.quantity)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="text-xl font-bold text-slate-900 text-right">
                    {formatCurrency(subtotal)}
                </span>
            </div>
        </div>
    );
}
