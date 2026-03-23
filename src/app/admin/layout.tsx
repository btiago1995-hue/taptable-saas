"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Settings, PieChart, Users, LogOut, Store, Megaphone, ChefHat, Receipt, UserCog, ShieldAlert, CreditCard, PanelsTopLeft, AlertTriangle, ChevronDown, BarChart3, Package, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState } from "react";
import { OfflineBanner } from "@/components/OfflineBanner";
import { hasFeature, normalizePlan } from "@/lib/planGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
    const { switchRestaurant } = useAuth();

    // Register Service Worker + request push permission
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
        if (!user?.restaurantId) return;

        const registerAndSubscribe = async () => {
            try {
                const reg = await navigator.serviceWorker.register("/sw.js");

                // Only subscribe if permission not already denied
                if (Notification.permission === "denied") return;

                const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                if (!vapidKey) return;

                // Convert VAPID public key to Uint8Array
                const urlBase64ToUint8Array = (base64String: string) => {
                    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
                    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
                    const rawData = window.atob(base64);
                    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
                };

                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    // Request permission first
                    const permission = await Notification.requestPermission();
                    if (permission !== "granted") return;
                    sub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(vapidKey),
                    });
                }

                // Save subscription to server
                const { data: { session } } = await (await import("@/lib/supabaseClient")).supabase.auth.getSession();
                await fetch("/api/push/subscribe", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                    },
                    body: JSON.stringify({ subscription: sub.toJSON() }),
                });
            } catch (err) {
                console.warn("[Push] Registration failed:", err);
            }
        };

        registerAndSubscribe();
    }, [user?.restaurantId]);

    // Load initial collapse state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("admin_sidebar_collapsed");
        if (saved === "true") setIsSidebarCollapsed(true);
    }, []);

    const toggleSidebar = () => {
        const newState = !isSidebarCollapsed;
        setIsSidebarCollapsed(newState);
        localStorage.setItem("admin_sidebar_collapsed", String(newState));
    };

    // Route Protection
    useEffect(() => {
        if (!isAuthenticated && pathname !== "/admin/login") {
            router.push("/admin/login");
        } else if (isAuthenticated && user) {
            const mods = user.accessModules || [];
            
            // Redirect from root /admin to appropriate home dashboard
            if (pathname === "/admin") {
                if (user.role === 'superadmin') router.push("/superadmin");
                else if (mods.includes("dashboard") || user.role === 'manager') router.push("/admin/dashboard");
                else if (mods.includes("driver") || user.role === 'driver') router.push("/driver");
                else if (mods.includes("waiter")) router.push("/admin/waiter");
                else if (mods.includes("kitchen")) router.push("/admin/kitchen");
                else router.push("/admin/settings");
            }
            
            // Hard block logic for unauthorized modules
            const restrictedAreas = ["/admin/dashboard", "/admin/menu", "/admin/staff", "/admin/analytics", "/admin/settings", "/admin/cashier"];
            if (user.role === 'superadmin' && pathname.startsWith("/admin") && pathname !== "/admin/login") {
                 router.push("/superadmin");
            } else if (restrictedAreas.includes(pathname) && !mods.includes("dashboard") && !mods.includes("menu") && user.role !== 'manager') {
                if (mods.includes("driver") || user.role === 'driver') router.push("/driver");
                else if (mods.includes("waiter")) router.push("/admin/waiter");
                else if (mods.includes("kitchen")) router.push("/admin/kitchen");
            }

            // Trial expiry check — se expirou, cortar acesso
            if (user.role !== 'superadmin' && pathname !== '/admin/upgrade') {
                const expiresAt = user.restaurantData?.subscriptionExpiresAt;
                if (expiresAt && new Date(expiresAt) < new Date()) {
                    router.push('/admin/upgrade?expired=true');
                    return;
                }
            }

            // Plan-based route protection using planGate
            const plan = normalizePlan(user.restaurantData?.subscriptionPlan);
            const gatedRoutes: Record<string, string> = {
                '/admin/kitchen': 'kds',
                '/admin/analytics': 'analytics',
                '/driver': 'driver',
                '/admin/conta-corrente': 'conta_corrente',
                '/admin/saft': 'saft',
                '/admin/retencoes': 'retencoes',
                '/admin/fidelidade': 'loyalty',
            };
            const requiredFeature = gatedRoutes[pathname];
            if (requiredFeature && !hasFeature(plan, requiredFeature as any)) {
                router.push('/admin/upgrade?feature=' + requiredFeature);
            }
        }
    }, [isAuthenticated, pathname, router, user]);

    if (!isAuthenticated && pathname !== "/admin/login") return null;

    // Handle full page for Login
    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    // Role-based Navigation using granular accessModules + planGate
    const getAllLinks = () => {
        const mods = user?.accessModules || [];
        const isManager = user?.role === 'manager';
        const plan = normalizePlan(user?.restaurantData?.subscriptionPlan);
        const links = [];

        if (isManager || mods.includes("dashboard")) links.push({ name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard });
        if (isManager || mods.includes("cashier")) links.push({ name: "Caixa / Mesas", href: "/admin/cashier", icon: Receipt });

        // KDS — growth+
        if (isManager || mods.includes("kitchen")) {
            links.push(hasFeature(plan, 'kds')
                ? { name: "Cozinha", href: "/admin/kitchen", icon: ChefHat }
                : { name: "Cozinha 🔒", href: "/admin/upgrade?feature=kds", icon: ChefHat });
        }

        if (isManager || mods.includes("waiter")) links.push({ name: "Painel Garçom", href: "/admin/waiter", icon: Users });
        if (isManager || mods.includes("menu")) links.push({ name: "Cardápio", href: "/admin/menu", icon: Store });
        if (isManager || mods.includes("dashboard")) links.push({ name: "Equipe", href: "/admin/staff", icon: UserCog });

        // Extended manager features
        // Faturação — sempre visível para manager
        if (isManager) {
            links.push({ name: "Faturação", href: "/admin/billing", icon: CreditCard });
        }

        if (isManager || mods.includes("dashboard")) {
            // Analytics — growth+
            links.push(hasFeature(plan, 'analytics')
                ? { name: "Analytics", href: "/admin/analytics", icon: PieChart }
                : { name: "Analytics 🔒", href: "/admin/upgrade?feature=analytics", icon: PieChart });

            // Conta Corrente — growth+
            links.push(hasFeature(plan, 'conta_corrente')
                ? { name: "Conta Corrente", href: "/admin/conta-corrente", icon: CreditCard }
                : { name: "Conta Corrente 🔒", href: "/admin/upgrade?feature=conta_corrente", icon: CreditCard });

            links.push(
                { name: "Clientes", href: "/admin/customers", icon: Users },
                { name: "Stock", href: "/admin/stock", icon: Package },
                { name: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
                { name: "Configurações", href: "/admin/settings", icon: Settings },
            );

            // Fidelidade — growth+
            if (hasFeature(plan, 'loyalty')) {
                links.push({ name: "Fidelidade", href: "/admin/fidelidade", icon: Star });
            }

            // SAF-T — pro only
            if (hasFeature(plan, 'saft')) {
                links.push({ name: "SAF-T Export", href: "/admin/saft", icon: Megaphone });
            }

            // Retenções — pro only
            if (hasFeature(plan, 'retencoes')) {
                links.push({ name: "Retenções IRS/IRC", href: "/admin/retencoes", icon: ShieldAlert });
            }
        }

        // Remove duplicates if any
        return links.filter((v,i,a) => a.findIndex(v2=>(v2.href===v.href))===i);
    };

    const navLinks = getAllLinks();

    const handleLogout = () => {
        logout();
        router.push("/admin/login");
    };

    // SaaS Suspension Block
    if (user && user.role !== 'superadmin' && user.isRestaurantActive === false) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 text-slate-200">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner shadow-red-500/20">
                    <ShieldAlert className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight mb-3">Assinatura Suspensa</h1>
                <p className="text-lg text-slate-400 max-w-md mx-auto mb-8 font-medium">O acesso administrativo e operacional do seu restaurante foi temporariamente bloqueado por pendências na assinatura do Dineo.</p>
                <div className="flex gap-4">
                    <button onClick={handleLogout} className="px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10">
                        Sair da Conta
                    </button>
                    <a href="mailto:suporte@dineo.vc" className="px-6 py-3 rounded-xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center">
                        Contatar Suporte
                    </a>
                </div>
            </div>
        );
    }

    const isPastDue = user?.subscriptionStatus === 'past_due';

    return (
        <div className="bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 pb-20 md:pb-0 min-h-[100dvh]">
            <OfflineBanner />
            {/* Banner past_due — aviso de pagamento em atraso (não bloqueia acesso) */}
            {isPastDue && user?.role !== 'superadmin' && pathname !== '/admin/billing' && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Pagamento em atraso — o acesso será suspenso em breve.</span>
                    <a href="/admin/billing" className="underline underline-offset-2 ml-1 hover:text-amber-100 transition-colors">Ver detalhes</a>
                </div>
            )}

            {/* Sidebar for Desktop */}
            <aside className={cn(
                "hidden md:flex bg-white border-r border-slate-200 flex-col shadow-sm flex-shrink-0 min-h-screen transition-all duration-300 ease-in-out",
                isSidebarCollapsed ? "w-20" : "w-64"
            )}>
                <div className={cn(
                    "p-6 border-b border-slate-100 flex items-center gap-3 transition-all",
                    isSidebarCollapsed ? "justify-center px-0 py-4" : "p-6"
                )}>
                    <div className="bg-primary-600 text-white p-2 rounded-lg shrink-0">
                        <Store className="w-6 h-6" />
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="animate-in fade-in slide-in-from-left-2 duration-300 truncate flex-1 min-w-0">
                            <h2 className="font-extrabold text-xl text-slate-900 tracking-tight truncate">{user?.restaurantName || "Restaurante"}</h2>
                            <p className="text-xs font-medium text-slate-500 capitalize">{user?.role === "manager" ? "Gerência" : user?.role === "waiter" ? "Salão" : "Cozinha"}</p>
                        </div>
                    )}
                    {/* Multi-store switcher — só aparece quando há >1 unidade */}
                    {!isSidebarCollapsed && (user?.availableRestaurants?.length ?? 0) > 1 && (
                        <div className="relative ml-1 shrink-0">
                            <button
                                onClick={() => setShowStoreSwitcher(v => !v)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                title="Trocar unidade"
                            >
                                <ChevronDown className={cn("w-4 h-4 transition-transform", showStoreSwitcher && "rotate-180")} />
                            </button>
                            {showStoreSwitcher && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[200px] py-1 animate-in fade-in zoom-in-95 duration-150">
                                    <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unidades</p>
                                    {user?.availableRestaurants?.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={async () => {
                                                setShowStoreSwitcher(false);
                                                await switchRestaurant(r.id);
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 text-sm font-medium transition-colors",
                                                r.id === user.restaurantId
                                                    ? "text-primary-700 bg-primary-50"
                                                    : "text-slate-700 hover:bg-slate-50"
                                            )}
                                        >
                                            {r.name}
                                            {r.id === user.restaurantId && (
                                                <span className="ml-2 text-[10px] text-primary-500 font-bold">●</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Collapse Toggle Button - Inside Sidebar when open */}
                {!isSidebarCollapsed && (
                    <div className="px-4 py-2 border-b border-slate-50 flex justify-end">
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="Fechar Menu"
                        >
                            <PanelsTopLeft className="w-5 h-5" />
                        </button>
                    </div>
                )}

                <nav className={cn(
                    "flex-1 p-4 flex flex-col gap-2 overflow-y-auto min-w-[256px] transition-opacity duration-300",
                    isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100"
                )}>
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

                <div className={cn(
                    "p-4 border-t border-slate-100 hidden md:block mt-auto transition-all min-w-[256px]",
                    isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100"
                )}>
                    <div className="mb-4 px-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button 
                        onClick={handleLogout} 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 font-medium hover:bg-red-50 w-full transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation Dock */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex overflow-x-auto no-scrollbar z-50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] pb-safe">
                {navLinks.map(link => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    // For mobile bottom nav, split name to show only first word to save space
                    const shortName = link.name.split(' / ')[0].split(' ')[0]; 
                    return (
                        <Link 
                            key={link.name} 
                            href={link.href} 
                            className={`flex-shrink-0 flex flex-col items-center justify-center w-[72px] sm:w-20 py-2 sm:py-3 transition-colors ${isActive ? 'text-primary-600' : 'text-slate-400'}`}
                        >
                            <div className={cn("p-1.5 rounded-xl mb-1 transition-all", isActive ? "bg-primary-50" : "bg-transparent")}>
                                <Icon className={cn("w-[22px] h-[22px]", isActive ? "text-primary-600" : "text-slate-500")} />
                            </div>
                            <span className={cn("text-[9px] sm:text-[10px] text-center w-full px-1 truncate", isActive ? "font-bold text-primary-700" : "font-medium text-slate-500")}>
                                {shortName}
                            </span>
                        </Link>
                    );
                })}
                <button 
                    onClick={handleLogout} 
                    className="flex-shrink-0 flex flex-col items-center justify-center w-[72px] sm:w-20 py-2 sm:py-3 text-red-400 hover:text-red-600 transition-colors"
                >
                    <div className="p-1.5 rounded-xl mb-1">
                        <LogOut className="w-[22px] h-[22px]" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-medium">Sair</span>
                </button>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative">
                {/* Reopen Sidebar Button - Visible only when collapsed */}
                {isSidebarCollapsed && (
                    <button 
                        onClick={toggleSidebar}
                        className="fixed top-4 left-4 z-[60] bg-white border border-slate-200 p-2.5 rounded-xl shadow-lg hover:bg-slate-50 text-slate-400 hover:text-primary-600 transition-all animate-in fade-in slide-in-from-left-4 duration-500"
                        title="Abrir Menu"
                    >
                        <PanelsTopLeft className="w-6 h-6" />
                    </button>
                )}
                
                <div className={cn(
                    "p-6 md:p-8 mx-auto w-full transition-all duration-300",
                    !isSidebarCollapsed && "max-w-7xl"
                )}>
                    {children}
                </div>
            </main>

        </div>
    );
}
