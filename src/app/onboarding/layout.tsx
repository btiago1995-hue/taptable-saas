import { Store } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "Comece com o Dineo",
  description: "Crie a sua conta de restaurante em segundos.",
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-md group-hover:bg-indigo-700 transition-colors">
            <Store className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl md:text-2xl tracking-tight text-slate-900">Dineo</span>
        </Link>
        <Link 
          href="/admin/login" 
          className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          Já tem conta?
        </Link>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
