"use client";

import { Phone, Clock, DollarSign, RefreshCw, GraduationCap, Home, Coins, PhoneCall, CheckCircle2, Smile } from "lucide-react";
import { BennettLoader } from "@/components/bennett-loader";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";

import { useEffect } from "react";
import { format } from "date-fns";
import { useData } from "@/context/DataContext";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatDuration } from "@/lib/utils";

const AGENT_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    recruiting: { label: "Recruiting", icon: <Home style={{ width: 14, height: 14, color: '#fff' }} />, color: 'var(--blue)' },
    coaching: { label: "Coaching", icon: <GraduationCap style={{ width: 14, height: 14, color: '#fff' }} />, color: 'var(--green)' },
    investor: { label: "Investor", icon: <Coins style={{ width: 14, height: 14, color: '#fff' }} />, color: 'var(--orange)' },
    biglife: { label: "BigLife", icon: <Coins style={{ width: 14, height: 14, color: '#fff' }} />, color: 'var(--purple)' },
    bootcampsNew: { label: "Bootcamps New Leads", icon: <GraduationCap style={{ width: 14, height: 14, color: '#fff' }} />, color: 'var(--orange)' },
    bootcampsFollowup: { label: "Bootcamps Follow-up", icon: <GraduationCap style={{ width: 14, height: 14, color: '#fff' }} />, color: 'var(--red)' },
};

export default function VoiceAnalyticsPage() {
    const { voiceMetrics, loadingVoiceMetrics, refreshVoiceMetrics, dateRange, setDateRange } = useData();

    const loading = loadingVoiceMetrics;
    const m = voiceMetrics;
    const byAgent = m?.byAgent ?? [];
    const rateByAgent = m?.rateByAgent ?? [];

    useEffect(() => {
        if (!dateRange?.from) return;
        refreshVoiceMetrics({
            from: dateRange.from,
            to: dateRange.to || dateRange.from,
        });
    }, [dateRange, refreshVoiceMetrics]);

    const volumeData = (m?.dailyVolume ?? []).map(d => ({
        name: format(new Date(d.date + 'T00:00:00'), 'MMM dd'),
        value: d.calls,
    }));

    const durationData = (m?.durationBuckets ?? []).map(b => ({
        name: b.label,
        value: b.calls,
    }));

    return (
        <div className="space-y-6 pb-10 relative min-h-[500px]">
            {loading && <BennettLoader />}

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <DateRangePicker value={dateRange as any} onUpdate={r => setDateRange(r.range)} />
                <button
                    onClick={() => { if (dateRange?.from) refreshVoiceMetrics({ from: dateRange.from, to: dateRange.to || dateRange.from }); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default' }}
                >
                    <RefreshCw style={{ width: 14, height: 14 }} />
                </button>
            </div>



            {/* Per-Agent Call Analytics */}
            {Object.entries(AGENT_LABELS).map(([key, cfg]) => {
                const agentData = byAgent.find(a => a.key === key);
                const rateData = rateByAgent.find(a => a.key === key);
                const calls = agentData?.calls ?? 0;
                const avgDuration = calls > 0 ? (agentData!.duration / calls) : 0;
                return (
                    <div key={key}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{ padding: 6, borderRadius: 'var(--radius-md)', background: cfg.color }}>
                                {cfg.icon}
                            </div>
                            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--label-primary)' }}>{cfg.label} Analytics</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: 12 }}>
                            <StatCard title="Calls in Range" value={calls.toLocaleString()} change="Selected Dates" icon={<Phone style={{ width: 18, height: 18 }} />} color={cfg.color} />
                            <StatCard title="Avg Duration" value={formatDuration(avgDuration)} change="Per call" icon={<Clock style={{ width: 18, height: 18 }} />} color={cfg.color} />
                            <StatCard title="Total Cost" value={`$${(agentData?.cost ?? 0).toFixed(2)}`} change="Selected Dates" icon={<DollarSign style={{ width: 18, height: 18 }} />} color={cfg.color} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StatCard
                                title="Call Pick-up Rate"
                                value={`${(rateData?.pickupRate ?? 0).toFixed(1)}%`}
                                change="Picked & duration > 18 sec"
                                icon={<PhoneCall style={{ width: 18, height: 18 }} />}
                                color={cfg.color}
                            />
                            <StatCard
                                title="Call Completion Rate"
                                value={`${(rateData?.completionRate ?? 0).toFixed(1)}%`}
                                change="Completed Conversation"
                                icon={<CheckCircle2 style={{ width: 18, height: 18 }} />}
                                color={cfg.color}
                            />
                            <StatCard
                                title="Positive Response Rate"
                                value={`${(rateData?.positiveRate ?? 0).toFixed(1)}%`}
                                change={rateData && rateData.positiveEligible > 0 ? `${rateData.positive} of ${rateData.positiveEligible} scored` : "No sentiment data"}
                                icon={<Smile style={{ width: 18, height: 18 }} />}
                                color={cfg.color}
                            />
                        </div>
                    </div>
                );
            })}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="liquid-card" style={{ padding: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)', marginBottom: 12 }}>Call Volume Trends</p>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={volumeData.length ? volumeData : [{ name: 'No data', value: 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,127,127,0.1)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-layer1)', fontSize: 11, color: 'var(--label-primary)', boxShadow: 'var(--shadow-lg)' }} />
                                <Line type="monotone" dataKey="value" stroke="#3B5BDB" strokeWidth={2.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="liquid-card" style={{ padding: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)', marginBottom: 12 }}>Duration Distribution</p>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={durationData.length ? durationData : [{ name: 'No data', value: 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,127,127,0.1)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-layer1)', fontSize: 11, color: 'var(--label-primary)', boxShadow: 'var(--shadow-lg)' }} cursor={{ fill: 'rgba(127,127,127,0.06)' }} />
                                <Bar dataKey="value" fill="#AF52DE" radius={[4, 4, 0, 0]} barSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, change, icon, color, isNegative }: any) {
    return (
        <div className="liquid-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</p>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: 'var(--ls-metric)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</h3>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isNegative ? 'var(--red)' : 'var(--green)' }}>
                        {change} {isNegative ? '↓' : '↑'}
                    </span>
                </div>
                {icon && (
                    <div style={{ padding: 12, borderRadius: 'var(--radius-lg)', flexShrink: 0, background: `color-mix(in srgb, ${color} 12%, transparent)`, color: color }}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
