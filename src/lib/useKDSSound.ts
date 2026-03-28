"use client";
import { useCallback, useRef } from "react";

export function useKDSSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const playTone = (
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType = "sine",
    gain = 0.4
  ) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  };

  // Novo pedido — chime ascendente triplo (estilo Uber Eats)
  const playNewOrder = useCallback(() => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    playTone(ctx, 660, t + 0.00, 0.18, "sine", 0.45);
    playTone(ctx, 880, t + 0.18, 0.18, "sine", 0.45);
    playTone(ctx, 1100, t + 0.36, 0.32, "sine", 0.50);
    playTone(ctx, 880, t + 0.36, 0.32, "triangle", 0.12);
  }, []);

  // Pedido pronto — double ding (estilo Deliveroo)
  const playOrderReady = useCallback(() => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    playTone(ctx, 1047, t + 0.00, 0.20, "sine", 0.40);
    playTone(ctx, 1047, t + 0.28, 0.20, "sine", 0.30);
    playTone(ctx, 1319, t + 0.28, 0.25, "triangle", 0.15);
  }, []);

  // Alerta urgente — bips rápidos repetidos
  const playUrgent = useCallback(() => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      playTone(ctx, 880, t + i * 0.22, 0.12, "square", 0.25);
      playTone(ctx, 1100, t + i * 0.22 + 0.12, 0.08, "square", 0.15);
    }
  }, []);

  // Cancelado — nota descendente
  const playCancel = useCallback(() => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    playTone(ctx, 660, t + 0.00, 0.20, "sine", 0.35);
    playTone(ctx, 440, t + 0.22, 0.35, "sine", 0.30);
  }, []);

  return { playNewOrder, playOrderReady, playUrgent, playCancel };
}
