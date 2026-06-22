"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, PhoneIncoming, PhoneOutgoing, Wallet, ExternalLink, CreditCard } from "lucide-react";
import { calculateDuration, formatDuration } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";

export function MaqsamBalanceDetail({ initialBalance }: { initialBalance?: any }) {
    const { calls, loadingCalls } = useData();

    const stats = useMemo(() => {
        if (!calls || calls.length === 0) return { inbound: 0, outbound: 0, total: 0, cost: 0 };

        const filtered = calls.filter((call: any) => {
            const isMaqsam = call.source === 'maqsam';
            const provisionedNum = String(call.phoneNumber || "");
            const isSpecificMaqsamNum = provisionedNum.replace(/\D/g, '') === '97148714150';

            // Detection based on customer number prefix (legacy/fallback)
            const phoneStr = String(call.phone || call.customer_number || "");
            const isUAE = phoneStr.startsWith('+971') || phoneStr.startsWith('971');

            return isMaqsam || isUAE || isSpecificMaqsamNum;
        });

        let inbound = 0;
        let outbound = 0;
        let totalCost = 0;

        filtered.forEach((call: any) => {
            const duration = calculateDuration(call);
            const isInbound = call.isInbound === true || (typeof call.type === 'string' && call.type.toLowerCase() === "inbound");

            if (isInbound) {
                inbound += duration;
            } else {
                outbound += duration;
            }
            // Use the specific telephony breakdown cost, fallback to costValue
            totalCost += (call.breakdown?.telephony || call.costValue || 0);
        });

        const total = inbound + outbound;

        return { inbound, outbound, total, cost: totalCost };
    }, [calls]);

    return (
        <div className="space-y-4">
            <div className="bg-[var(--fill-quaternary)] rounded-lg p-5 border border-[var(--glass-border)] flex flex-col gap-4">
                <div className="flex flex-col text-center bg-[var(--fill-secondary)] p-8 rounded-lg border border-[var(--glass-border)] shadow-sm">
                    <span className="text-sm font-bold text-[var(--label-tertiary)] uppercase tracking-[0.2em] mb-2">Maqsam Credits Used</span>
                    <span className="text-5xl font-black text-cyan-500">
                        ${stats.cost.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-cyan-500 mt-4 font-semibold bg-cyan-500/10 px-3 py-1 rounded-full self-center border border-cyan-500/20 italic">
                        Total Lifetime Consumption
                    </p>
                </div>
            </div>

            <Button
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold gap-2 shadow-none border border-cyan-500/30 transition-all active:scale-[0.98]"
                onClick={() => window.open('https://portal.maqsam.com', '_blank')}
            >
                <CreditCard className="h-4 w-4" />
                Add Funds to Maqsam
                <ExternalLink className="h-3 w-3 opacity-50" />
            </Button>

            {loadingCalls && (
                <p className="text-center text-xs text-slate-400 animate-pulse">Syncing lifetime logs...</p>
            )}
        </div>
    );
}
