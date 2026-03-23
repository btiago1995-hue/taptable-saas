"use client";

import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Package, AlertTriangle, CheckCircle2, ToggleLeft, ToggleRight, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface StockItem {
  id: string;
  name: string;
  category: string;
  status: "available" | "sold_out";
  track_stock: boolean;
  stock_quantity: number;
}

export default function StockPage() {
  const { user } = useAuth();
  const [items, setItems]       = useState<StockItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<"all" | "tracked" | "low" | "sold_out">("all");

  const fetchItems = useCallback(async () => {
    if (!user?.restaurantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("menu_items")
      .select("id, name, category, status, track_stock, stock_quantity")
      .eq("restaurant_id", user.restaurantId)
      .order("category")
      .order("name");
    setItems((data as StockItem[]) || []);
    setLoading(false);
  }, [user?.restaurantId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateItem = async (id: string, patch: Partial<StockItem>) => {
    setSaving(id);
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
    await supabase.from("menu_items").update(patch).eq("id", id);
    setSaving(null);
  };

  const handleQtyChange = (id: string, raw: string) => {
    const qty = Math.max(0, parseInt(raw) || 0);
    const status = qty === 0 ? "sold_out" as const : "available" as const;
    setItems(prev => prev.map(it => it.id === id ? { ...it, stock_quantity: qty, status } : it));
  };

  const handleQtyBlur = async (item: StockItem) => {
    setSaving(item.id);
    await supabase.from("menu_items").update({
      stock_quantity: item.stock_quantity,
      status: item.stock_quantity === 0 ? "sold_out" : "available",
    }).eq("id", item.id);
    setSaving(null);
  };

  const filtered = items.filter(it => {
    const matchesSearch = it.name.toLowerCase().includes(search.toLowerCase()) ||
                          it.category.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "tracked")  return it.track_stock;
    if (filter === "low")      return it.track_stock && it.stock_quantity > 0 && it.stock_quantity <= 5;
    if (filter === "sold_out") return it.status === "sold_out";
    return true;
  });

  const stats = {
    tracked:  items.filter(i => i.track_stock).length,
    low:      items.filter(i => i.track_stock && i.stock_quantity > 0 && i.stock_quantity <= 5).length,
    sold_out: items.filter(i => i.status === "sold_out").length,
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-600" />
            Gestão de Stock
          </h1>
          <p className="text-slate-500 font-medium mt-1 ml-11">
            Controla quantidades e marca itens esgotados automaticamente
          </p>
        </div>
        <button onClick={fetchItems} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Com rastreio", value: stats.tracked,  color: "text-slate-900" },
          { label: "Stock baixo",  value: stats.low,      color: "text-amber-600" },
          { label: "Esgotados",   value: stats.sold_out, color: "text-red-600"   },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
            <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Pesquisar item ou categoria..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <div className="flex gap-2">
          {(["all","tracked","low","sold_out"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-colors border",
                filter === f
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {{ all: "Todos", tracked: "Com rastreio", low: "Stock baixo", sold_out: "Esgotados" }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Item","Categoria","Rastrear","Quantidade","Estado"].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">Nenhum item encontrado.</td></tr>
              )}
              {filtered.map(item => (
                <tr key={item.id} className={cn("hover:bg-slate-50 transition-colors", item.status === "sold_out" && "bg-red-50/30")}>
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{item.name}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs font-medium">{item.category}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => updateItem(item.id, {
                        track_stock: !item.track_stock,
                        ...(item.track_stock ? { status: "available" } : {}),
                      })}
                      className="text-slate-400 hover:text-primary-600 transition-colors"
                    >
                      {item.track_stock
                        ? <ToggleRight className="w-6 h-6 text-primary-600" />
                        : <ToggleLeft className="w-6 h-6" />
                      }
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    {item.track_stock ? (
                      <div className="relative w-24">
                        <input
                          type="number"
                          min={0}
                          value={item.stock_quantity}
                          onChange={e => handleQtyChange(item.id, e.target.value)}
                          onBlur={() => handleQtyBlur(item)}
                          className={cn(
                            "w-full border rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-300 text-center",
                            item.stock_quantity === 0
                              ? "border-red-300 bg-red-50 text-red-700"
                              : item.stock_quantity <= 5
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : "border-slate-200"
                          )}
                        />
                        {saving === item.id && (
                          <Loader2 className="w-3 h-3 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs font-medium">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {item.status === "sold_out" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" /> Esgotado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Disponível
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
