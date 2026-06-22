"use client";

import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Activity, Crown, Info, RefreshCw, Phone } from "lucide-react";
import { useData } from "@/context/DataContext";
import { format, subDays } from "date-fns";
import { formatDuration } from "@/lib/utils";
import { BennettLoader } from "@/components/bennett-loader";

export default function VoiceCalculatorPage() {
    const { refreshCalls, calls: rawCalls, loadingCalls, dateRange } = useData();
    const [accountFilter, setAccountFilter] = useState("vapi");
    const [calculating, setCalculating] = useState(false);
    const [results, setResults] = useState<{
        totalCost: number;
        agentTotal: number;
        telephonyTotal: number;
        totalDuration: number;
        callCount: number;
        calculatedAt: Date;
    } | null>(null);

    const handleCalculate = async () => {
        if (!dateRange?.from) return;
        setCalculating(true);
        try {
            await refreshCalls({
                from: dateRange.from,
                to: dateRange.to || dateRange.from,
                includeElevenLabs: false,
                provider: 'vapi',
                force: true
            });
        } catch (err) {
            console.error("Calculation error:", err);
            setCalculating(false);
        }
    };

    const processResults = async () => {
        const filteredCalls = rawCalls.filter((call: any) => {
            if (accountFilter === 'vapi') return call.source === 'vapi';
            if (accountFilter === 'vapi-normal') return call.source === 'vapi' && call.vapiAccount === 'normal';
            if (accountFilter === 'vapi-owners') return call.source === 'vapi' && call.vapiAccount === 'owners';
            if (accountFilter === 'open-house') return call.assistantId === '1ef6ea66-0a75-45f5-b025-1743e048dc90';
            return true;
        });

        if (filteredCalls.length === 0) {
            setResults({ totalCost: 0, agentTotal: 0, telephonyTotal: 0, totalDuration: 0, callCount: 0, calculatedAt: new Date() });
            setCalculating(false);
            return;
        }

        setCalculating(true);
        try {
            const res = await fetch('/api/calls/telephony-cost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    calls: filteredCalls.map((c: any) => ({
                        id: c.id, phoneNumber: c.phoneNumber, phone: c.phone,
                        durationSeconds: c.durationSeconds, isInbound: c.isInbound, startedAt: c.startedAt
                    }))
                })
            });
            const data = await res.json();
            const telephonyCosts = data.costs || {};

            let agentTotal = 0, telephonyTotal = 0, totalDuration = 0;
            filteredCalls.forEach((call: any) => {
                const tCost = telephonyCosts[call.id];
                const aCost = call.breakdown?.agent || 0;
                totalDuration += (call.durationSeconds || 0);
                if (tCost !== undefined && tCost !== -1) {
                    agentTotal += aCost;
                    telephonyTotal += tCost;
                } else {
                    const rawTotal = parseFloat(call.cost.replace('$', '')) || 0;
                    agentTotal += aCost;
                    telephonyTotal += Math.max(0, rawTotal - aCost);
                }
            });

            setResults({ totalCost: agentTotal + telephonyTotal, agentTotal, telephonyTotal, totalDuration, callCount: filteredCalls.length, calculatedAt: new Date() });
        } catch (err) {
            console.error("Processing error:", err);
        } finally {
            setCalculating(false);
        }
    };

    const prevLoadingRef = React.useRef(loadingCalls);
    React.useEffect(() => {
        if (prevLoadingRef.current === true && loadingCalls === false && calculating) {
            processResults();
        }
        prevLoadingRef.current = loadingCalls;
    }, [loadingCalls, calculating]);

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>
            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--purple) 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calculator style={{ width: 20, height: 20, color: 'var(--purple)' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: '-0.02em', margin: 0 }}>Cost Calculator</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 3 }}>
                        Select a date range and account to calculate detailed telephony and agent costs. This tool uses real-time rate matching and provider APIs for maximum accuracy.
                    </p>
                </div>
            </div>

            {/* Main two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
                {/* LEFT: Configuration panel */}
                <div className="liquid-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Calculator style={{ width: 15, height: 15, color: 'var(--label-tertiary)' }} />
                            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--label-primary)' }}>Configuration</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--label-tertiary)', margin: 0 }}>Specify the parameters for calculation.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--label-tertiary)' }}>Date Range</label>
                        <div style={{ padding: '8px 12px', fontSize: 13, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-secondary)', borderRadius: 'var(--radius-md)' }}>
                            Selected in top bar
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--label-tertiary)' }}>Account / Provider</label>
                        <Select value={accountFilter} onValueChange={setAccountFilter}>
                            <SelectTrigger style={{ height: 36, fontSize: 13, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                                <SelectValue placeholder="Select Account" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vapi">All Vapi Calls</SelectItem>
                                <SelectItem value="vapi-normal">CRM Leads</SelectItem>
                                <SelectItem value="vapi-owners">Generated Leads</SelectItem>
                                <SelectItem value="open-house">🏠 Open House Event</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <button
                        onClick={handleCalculate}
                        disabled={calculating || !dateRange?.from}
                        style={{
                            width: '100%', padding: '10px 0', borderRadius: 'var(--radius-md)',
                            background: calculating ? 'var(--fill-tertiary)' : 'var(--purple)',
                            color: calculating ? 'var(--label-tertiary)' : '#fff',
                            fontSize: 13, fontWeight: 700, border: 'none',
                            cursor: calculating ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            transition: 'all 150ms', opacity: (!dateRange?.from && !calculating) ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!calculating) e.currentTarget.style.opacity = '0.88'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >
                        {calculating
                            ? <><RefreshCw style={{ width: 13, height: 13 }} className="animate-spin" /> Calculating…</>
                            : <><Activity style={{ width: 13, height: 13 }} /> Calculate Total</>
                        }
                    </button>

                    {/* Note */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--orange) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--orange) 20%, transparent)' }}>
                        <Info style={{ width: 13, height: 13, color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 11, color: 'var(--orange)', margin: 0, lineHeight: 1.5 }}>
                            <strong>Note:</strong> Calculations may take a few seconds as we synchronize costs with telephony providers for the selected range.
                        </p>
                    </div>
                </div>

                {/* RIGHT: Results panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Empty state */}
                    {!results && !calculating && (
                        <div className="liquid-card" style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
                            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--fill-tertiary)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Calculator style={{ width: 22, height: 22, color: 'var(--label-quaternary)' }} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--label-secondary)', margin: 0 }}>Ready to Calculate</p>
                                <p style={{ fontSize: 12, color: 'var(--label-tertiary)', marginTop: 5, maxWidth: 260 }}>
                                    Click "Calculate Total" to process voice logs for your selected configuration.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Loading state */}
                    {calculating && (
                        <div className="liquid-card" style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, position: 'relative' }}>
                            <BennettLoader />
                        </div>
                    )}

                    {/* Results */}
                    {results && !calculating && (
                        <>
                            {/* Cost summary cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                <CostCard label="Total Cost" value={`$${results.totalCost.toFixed(2)}`} icon={Crown} color="var(--green)" />
                                <CostCard label="Agent Cost" value={`$${results.agentTotal.toFixed(2)}`} icon={Activity} color="var(--blue)" />
                                <CostCard label="Telephony" value={`$${results.telephonyTotal.toFixed(2)}`} icon={Phone} color="var(--purple)" />
                            </div>

                            {/* Detailed metrics */}
                            <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Card header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--hairline)', background: 'var(--fill-quaternary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Activity style={{ width: 13, height: 13, color: 'var(--label-tertiary)' }} />
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-primary)' }}>Detailed Metrics</span>
                                    </div>
                                    <span style={{ fontSize: 11, color: 'var(--label-tertiary)', padding: '2px 10px', borderRadius: 20, background: 'var(--fill-secondary)', border: '1px solid var(--hairline)' }}>
                                        Calculated at {format(results.calculatedAt, 'p')}
                                    </span>
                                </div>

                                {/* Metric rows */}
                                <MetricRow
                                    icon={Phone} label="Total Calls Processed" sub="Successfully Fetched"
                                    value={String(results.callCount)} color="var(--blue)"
                                />
                                <MetricRow
                                    icon={Activity} label="Total Talk Time" sub="Cumulative Duration"
                                    value={formatDuration(results.totalDuration)} color="var(--green)"
                                />
                                <MetricRow
                                    icon={Crown} label="Average Cost Per Call" sub="Estimated Average"
                                    value={`$${(results.callCount > 0 ? results.totalCost / results.callCount : 0).toFixed(3)}`}
                                    color="var(--purple)" last
                                />
                            </div>

                            {/* Footer note */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--label-tertiary)', background: 'var(--fill-quaternary)', border: '1px solid var(--hairline)', padding: '5px 14px', borderRadius: 99 }}>
                                    <Info style={{ width: 11, height: 11 }} />
                                    Prices include per-minute rounding and special backup rates for UAE destinations.
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function CostCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
    return (
        <div style={{
            borderRadius: 14, padding: '16px 18px', overflow: 'hidden', position: 'relative',
            background: `color-mix(in srgb, ${color} 9%, var(--bg-layer1))`,
            border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        }}>
            {/* Ghost icon */}
            <div style={{ position: 'absolute', right: -6, top: -6, color, opacity: 0.07, pointerEvents: 'none' }}>
                <Icon style={{ width: 80, height: 80 }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color, margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color, margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
        </div>
    );
}

function MetricRow({ icon: Icon, label, sub, value, color, last }: { icon: any; label: string; sub: string; value: string; color: string; last?: boolean }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px',
            borderBottom: last ? 'none' : '1px solid var(--hairline)',
            transition: 'background 100ms',
        }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-quaternary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${color} 12%, transparent)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: 14, height: 14 }} />
                </div>
                <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', margin: '2px 0 0' }}>{sub}</p>
                </div>
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--label-primary)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
        </div>
    );
}
