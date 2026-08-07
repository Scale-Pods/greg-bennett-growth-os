"use client";

import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Activity, Crown, Info, RefreshCw, Phone, PhoneCall } from "lucide-react";
import { useData } from "@/context/DataContext";
import { format } from "date-fns";
import { formatDuration } from "@/lib/utils";
import { BennettLoader } from "@/components/bennett-loader";
import { DateRangePicker } from "@/components/ui/date-range-picker";

const AGENTS = [
    { key: "recruiting", label: "Recruiting" },
    { key: "coaching", label: "Coaching" },
    { key: "investor", label: "Investor" },
    { key: "biglife", label: "BigLife" },
    { key: "bootcampsNew", label: "Bootcamps New Leads" },
    { key: "bootcampsFollowup", label: "Bootcamps Follow-up" },
] as const;

type AgentKey = typeof AGENTS[number]["key"];

export default function VoiceCalculatorPage() {
    const { dateRange, setDateRange } = useData();
    const [agent, setAgent] = useState<AgentKey>("recruiting");
    const [calculating, setCalculating] = useState(false);
    const [results, setResults] = useState<{
        agentCost: number;
        telephonyCost: number;
        totalCost: number;
        totalDuration: number;
        callCount: number;
        telephonyMatchedCount: number;
        calculatedAt: Date;
    } | null>(null);

    const handleCalculate = async () => {
        if (!dateRange?.from) return;
        setCalculating(true);
        try {
            const from = dateRange.from.toISOString();
            const to = (dateRange.to || dateRange.from).toISOString();
            const res = await fetch(`/api/calls?agent=${agent}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&includeTelephony=true`);
            const rawCalls = res.ok ? await res.json() : [];

            let agentCost = 0;
            let telephonyCost = 0;
            let totalDuration = 0;
            let telephonyMatchedCount = 0;

            (Array.isArray(rawCalls) ? rawCalls : []).forEach((call: any) => {
                agentCost += Number(call.cost || 0);
                totalDuration += (call.durationSeconds || 0);
                if (call.telephonyCost !== null && call.telephonyCost !== undefined) {
                    telephonyCost += Number(call.telephonyCost);
                    telephonyMatchedCount++;
                }
            });

            setResults({
                agentCost,
                telephonyCost,
                totalCost: agentCost + telephonyCost,
                totalDuration,
                callCount: rawCalls.length,
                telephonyMatchedCount,
                calculatedAt: new Date(),
            });
        } catch (err) {
            console.error("Calculation error:", err);
        } finally {
            setCalculating(false);
        }
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>

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
                        <DateRangePicker value={dateRange as any} onUpdate={r => setDateRange(r.range)} className="w-full" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--label-tertiary)' }}>Agent</label>
                        <Select value={agent} onValueChange={(v) => setAgent(v as AgentKey)}>
                            <SelectTrigger style={{ height: 36, fontSize: 13, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                                <SelectValue placeholder="Select Agent" />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 100, backgroundColor: 'var(--bg-layer1)' }}>
                                {AGENTS.map(a => (
                                    <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                                ))}
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
                            <strong>Note:</strong> Agent cost is Vapi's cost_usd per call. Telephony cost is your real Twilio call price, matched by phone number and call time (±5 min). Calls with no Twilio match are excluded from the telephony total.
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
                                <CostCard label="Agent Cost" value={`$${results.agentCost.toFixed(2)}`} icon={Activity} color="var(--blue)" />
                                <CostCard label="Telephony Cost" value={`$${results.telephonyCost.toFixed(2)}`} icon={PhoneCall} color="var(--purple)" />
                                <CostCard label="Total Cost" value={`$${results.totalCost.toFixed(2)}`} icon={Crown} color="var(--green)" />
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
                                    icon={PhoneCall} label="Telephony Matched" sub="Calls with Twilio cost found"
                                    value={`${results.telephonyMatchedCount} / ${results.callCount}`} color="var(--purple)"
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
