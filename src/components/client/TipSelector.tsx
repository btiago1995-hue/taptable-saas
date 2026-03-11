"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TipSelectorProps {
    defaultPercentage?: number;
    onTipChange: (percentage: number) => void;
}

export function TipSelector({ defaultPercentage = 10, onTipChange }: TipSelectorProps) {
    const [selectedTip, setSelectedTip] = useState<number>(defaultPercentage);

    const tipOptions = [0, 5, 10, 15, 20];

    const handleSelect = (tip: number) => {
        setSelectedTip(tip);
        onTipChange(tip);
    };

    return (
        <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3">Gorjeta para a equipe</h3>
            <div className="flex gap-2 w-full">
                {tipOptions.map((tip) => (
                    <button
                        key={tip}
                        onClick={() => handleSelect(tip)}
                        className={cn(
                            "flex-1 py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-200",
                            selectedTip === tip
                                ? "bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-105"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                        )}
                    >
                        {tip === 0 ? "Sem" : `${tip}%`}
                    </button>
                ))}
            </div>
        </div>
    );
}
