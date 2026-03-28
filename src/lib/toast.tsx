"use client";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// Global event bus — works across all components without a Provider
const listeners: Array<(t: Toast) => void> = [];
let nextId = 1;

function emit(message: string, type: ToastType) {
  const t: Toast = { id: nextId++, message, type };
  listeners.forEach((fn) => fn(t));
}

export const toast = {
  success: (msg: string) => emit(msg, "success"),
  error: (msg: string) => emit(msg, "error"),
  info: (msg: string) => emit(msg, "info"),
};

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-500 text-white" },
  error: { bg: "bg-red-50", border: "border-red-200", icon: "bg-red-500 text-white" },
  info: { bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-500 text-white" },
};

// ── Confirm dialog ────────────────────────────────────────────────────────────

interface ConfirmRequest {
  message: string;
  onConfirm: () => void;
}

const confirmListeners: Array<(r: ConfirmRequest) => void> = [];

export function showConfirm(message: string, onConfirm: () => void) {
  confirmListeners.forEach((fn) => fn({ message, onConfirm }));
}

function ConfirmDialog() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    const handler = (r: ConfirmRequest) => setReq(r);
    confirmListeners.push(handler);
    return () => {
      const idx = confirmListeners.indexOf(handler);
      if (idx !== -1) confirmListeners.splice(idx, 1);
    };
  }, []);

  if (!req) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReq(null)} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 fade-in duration-150">
        <p className="text-slate-800 font-medium text-sm leading-relaxed mb-5">{req.message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setReq(null)}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { req.onConfirm(); setReq(null); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toaster ───────────────────────────────────────────────────────────────────

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <>
      <ConfirmDialog />
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => {
            const c = COLORS[t.type];
            return (
              <div
                key={t.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-200 ${c.bg} ${c.border}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${c.icon}`}>
                  {ICONS[t.type]}
                </span>
                <p className="text-sm font-medium text-slate-800 leading-snug">{t.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
