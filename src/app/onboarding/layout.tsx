import { Zap } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "Comece com o Dineo",
  description: "Crie a sua conta de restaurante em segundos.",
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col font-sans text-white">
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/10 bg-[#080b14]/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-all">
            <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl md:text-2xl tracking-tight text-white">Dineo</span>
        </Link>
        <Link 
          href="/admin/login" 
          className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
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
