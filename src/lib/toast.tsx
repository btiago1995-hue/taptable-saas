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

  if (toasts.length === 0) return null;

  return (
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
  );
}
