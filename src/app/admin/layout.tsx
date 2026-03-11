"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Settings, PieChart, Users, LogOut, Store, Megaphone, ChefHat, Receipt, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuth();

    // Route Protection
    useEffect(() => {
        if (!isAuthenticated && pathname !== "/admin/login") {
            router.push("/admin/login");
        } else if (isAuthenticated && user) {
            // Strict Role-Based Redirection locks 
            if (user.role === "kitchen" && pathname !== "/admin/kitchen") {
                router.push("/admin/kitchen");
            } else if (user.role === "waiter" && pathname !== "/admin/waiter") {
                router.push("/admin/waiter");
            }
        }
    }, [isAuthenticated, pathname, router, user]);

    if (!isAuthenticated && pathname !== "/admin/login") return null;

    // Handle full page for Login
    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    // Role-based Navigation
    const getAllLinks = () => {
        if (user?.role === "kitchen") {
            return [{ name: "Cozinha", href: "/admin/kitchen", icon: ChefHat }];
        }
        if (user?.role === "waiter") {
            return [{ name: "Painel Garçom", href: "/admin/waiter", icon: Users }];
        }

        // Manager gets everything
        return [
            { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
            { name: "Caixa / Mesas", href: "/admin/cashier", icon: Receipt },
            { name: "Cozinha", href: "/admin/kitchen", icon: ChefHat },
            { name: "Painel Garçom", href: "/admin/waiter", icon: Users },
            { name: "Equipe", href: "/admin/staff", icon: UserCog },
            { name: "Analytics", href: "/admin/analytics", icon: PieChart },
            { name: "Cardápio", href: "/admin/menu", icon: Store },
            { name: "Clientes", href: "/admin/customers", icon: Users },
            { name: "Marketing", href: "/admin/marketing", icon: Megaphone },
            { name: "Configurações", href: "/admin/settings", icon: Settings },
        ];
    };

    const navLinks = getAllLinks();

    const handleLogout = () => {
        logout();
        router.push("/admin/login");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">

            {/* Sidebar for Desktop / Header for Mobile */}
            <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm flex-shrink-0">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="bg-primary-600 text-white p-2 rounded-lg">
                        <Store className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">TapTable</h2>
                        <p className="text-xs font-medium text-slate-500 capitalize">{user?.role === "manager" ? "Gerência" : user?.role === "waiter" ? "Salão" : "Cozinha"}</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors whitespace-nowrap",
                                    isActive
                                        ? "bg-primary-50 text-primary-700"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-primary-600" : "text-slate-400")} />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100 hidden md:block">
                    <div className="mb-4 px-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 font-medium hover:bg-red-50 w-full transition-colors">
                        <LogOut className="w-5 h-5" />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8 max-w-6xl mx-auto">
                    {children}
                </div>
            </main>

        </div>
    );
}
