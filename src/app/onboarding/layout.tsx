import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "Comece com o Dineo",
  description: "Crie a sua conta de restaurante em segundos.",
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-slate-200">
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-black text-xl md:text-2xl tracking-tight text-slate-900">Dineo</span>
        </Link>
        <Link 
          href="/admin/login" 
          className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          Já tem conta? Login
        </Link>
      </header>
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
