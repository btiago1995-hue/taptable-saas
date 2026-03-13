"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, LayoutDashboard, Crown, LogOut, ShieldAlert } from "lucide-react";
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
        router.push("/auth/login");
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
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-300">
      {/* Sidebar */}
      <aside className="w-64 bg-black border-r border-slate-800 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Crown className="w-6 h-6 text-amber-500" />
            TapTable SaaS Master
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
            <Link 
                href="/superadmin"
                className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
                    pathname === "/superadmin" 
                        ? "bg-amber-500/10 text-amber-500" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                <LayoutDashboard className="w-5 h-5" />
                Painel Geral
            </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-amber-500/80 mb-1">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Acesso Raíz</span>
                </div>
                <p className="text-xs text-slate-500">Logado no núcleo principal do sistema.</p>
            </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors px-2 py-2 w-full font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sair do Master
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 border-l border-white/5">
         {children}
      </main>
    </div>
  );
}
