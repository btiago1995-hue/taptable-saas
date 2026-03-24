"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, LayoutDashboard, LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/admin/login");
      } else if (user.role !== "superadmin") {
        // Not a superadmin, kick them out to their normal dashboard or generic path
        router.push("/admin/dashboard");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 relative z-20 shadow-sm">
        <div className="h-16 flex items-center px-8 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-black text-xl tracking-tight">
            Dineo
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
            <Link 
                href="/superadmin"
                className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                    pathname === "/superadmin" 
                        ? "bg-slate-100 text-slate-900" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                )}
            >
                <LayoutDashboard className="w-5 h-5" />
                Painel Geral
            </Link>
        </nav>

        <div className="p-6 border-t border-slate-100">
            <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Acesso Sistema</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed mt-1">Sessão iniciada no núcleo principal.</p>
            </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors px-4 py-2.5 rounded-xl w-full font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair da Sessão
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
         {children}
      </main>
    </div>
  );
}
