"use client";

import { useEffect, useState } from "react";
import { syncOfflineOrders, getOfflineQueue } from "@/lib/offline-queue";
import { Wifi, WifiOff, CheckCircle2 } from "lucide-react";

type SyncState = "idle" | "syncing" | "success";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  // Check initial state and queue size on mount
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setQueueSize(getOfflineQueue().length);
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const pending = getOfflineQueue();
      if (pending.length > 0) {
        setSyncState("syncing");
        await syncOfflineOrders();
        setSyncState("success");
        setQueueSize(0);
        // Clear success banner after 4 seconds
        setTimeout(() => setSyncState("idle"), 4000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setQueueSize(getOfflineQueue().length);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Refresh queue size periodically when offline
    let interval: NodeJS.Timeout | null = null;
    if (!isOnline) {
      interval = setInterval(() => {
        setQueueSize(getOfflineQueue().length);
      }, 3000);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (interval) clearInterval(interval);
    };
  }, [isOnline]);

  // Nothing to show when online and no sync in progress
  if (isOnline && syncState === "idle") return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] py-2 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
        !isOnline
          ? "bg-red-600 text-white"
          : syncState === "syncing"
          ? "bg-amber-500 text-white"
          : "bg-emerald-600 text-white"
      }`}
    >
      {!isOnline && (
        <>
          <WifiOff className="w-4 h-4" />
          <span>
            Modo Offline — {queueSize > 0 ? `${queueSize} pedido(s) aguardam sincronização` : "Sem ligação à internet"}
          </span>
        </>
      )}
      {isOnline && syncState === "syncing" && (
        <>
          <Wifi className="w-4 h-4 animate-pulse" />
          <span>A sincronizar pedidos offline...</span>
        </>
      )}
      {isOnline && syncState === "success" && (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>Sincronização concluída! Todos os pedidos foram enviados.</span>
        </>
      )}
    </div>
  );
}
