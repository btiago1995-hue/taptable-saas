"use client";

import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/AuthContext";
import { usePlanGate } from "@/lib/planGate";
import { FileDown, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function SaftPage() {
  const { user } = useAuth();
  const { allowed } = usePlanGate("saft");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      const response = await fetch(
        `/api/saft/export?year=${year}&month=${month}`,
        { method: "GET" }
      );

      if (!response.ok) {
        const err = await response.json();
        toast.error(`Erro: ${err.error}`);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SAF-T-${year}-${String(month).padStart(2, "0")}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary-600" />
          Exportação SAF-T
        </h1>
        <p className="text-slate-500 font-medium mt-1 ml-11">
          Ficheiro XML conforme norma SAF-T CV / DNRE para declaração fiscal
        </p>
      </div>

      {/* Export Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Month */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mês</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          {/* Year */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ano</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">O ficheiro SAF-T irá incluir:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Todas as ordens de {MONTHS[month - 1]} de {year}</li>
            <li>Dados fiscais do restaurante (NIF, nome, morada)</li>
            <li>Linhas de produto, quantidades e valores</li>
            <li>Formato XML conforme DNRE Cabo Verde</li>
          </ul>
        </div>

        {success && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Ficheiro descarregado com sucesso!
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          <FileDown className="w-5 h-5" />
          {loading ? "A gerar XML..." : `Descarregar SAF-T — ${MONTHS[month - 1]} ${year}`}
        </button>
      </div>
    </div>
  );
}
