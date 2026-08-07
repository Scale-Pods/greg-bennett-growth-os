"use client";

import { Phone, Clock, TrendingUp, Timer, GraduationCap, Home, Coins } from "lucide-react";
import { useEffect } from "react";
import { BennettLoader } from "@/components/bennett-loader";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { format } from "date-fns";
import { formatDuration } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { RefreshCw } from "lucide-react";

/* ── Apple Metric Tile ── */
function MetricTile({ title, value, accentColor, icon, onClick }: {
    title: string; value: string; accentColor: string; icon: React.ReactNode; onClick?: () => void;
}) {
    return (
        <div
            className="metric-tile"
            style={{ '--tile-accent': accentColor, cursor: onClick ? 'default' : undefined } as any}
            onClick={onClick}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                    <div className="tile-label">{title}</div>
                    <div className="tile-value tabular-nums" style={{ fontSize: 28 }}>{value}</div>
                </div>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${accentColor}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: accentColor, flexShrink: 0,
                }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

/* ── Custom Tooltip ── */
function AppleTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--glass-fill)', backdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid var(--glass-border)', borderRadius: 12,
            padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        }}>
            <p style={{ fontSize: 12, color: 'var(--label-secondary)', marginBottom: 4 }}>{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ fontSize: 14, fontWeight: 600, color: p.color || 'var(--green)', letterSpacing: '-0.02em' }}>
                    {p.value?.toLocaleString()} calls
                </p>
            ))}
        </div>
    );
}

/* ── Business Section ── */
function BusinessSection({ title, icon, iconBg, iconColor, loading, metrics }: {
    title: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    loading: boolean;
    metrics: { title: string; value: string; accentColor: string; icon: React.ReactNode; info?: string }[];
}) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                    width: 20, height: 20, borderRadius: 5,
                    background: iconBg || `${iconColor}26`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: iconColor,
                    flexShrink: 0,
                }}>
                    {icon}
                </div>
                <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--label-secondary)', whiteSpace: 'nowrap' }}>
                    {title}
                </h2>
                <div style={{ height: '0.5px', background: 'var(--separator)', opacity: 0.2, width: '100%', marginLeft: 8 }} />
            </div>

            <div className="metric-grid">
                {metrics.map((m, i) => (
                    <MetricTile
                        key={i}
                        title={m.title}
                        value={loading ? '—' : m.value}
                        accentColor={m.accentColor}
                        icon={m.icon}
                    />
                ))}
            </div>
        </div>
    );
}

const AGENT_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    recruiting: { label: "Recruiting", icon: <Home size={20} />, color: 'var(--blue)', bg: 'rgba(59,91,219,0.15)' },
    coaching: { label: "Coaching", icon: <GraduationCap size={20} />, color: 'var(--green)', bg: 'rgba(15,157,88,0.15)' },
    investor: { label: "Investor", icon: <Coins size={20} />, color: 'var(--orange)', bg: 'rgba(230,126,34,0.15)' },
    biglife: { label: "BigLife", icon: <Coins size={20} />, color: 'var(--green)', bg: 'rgba(15,157,88,0.15)' },
    bootcampsNew: { label: "Bootcamps New Leads", icon: <GraduationCap size={20} />, color: 'var(--orange)', bg: 'rgba(230,126,34,0.15)' },
    bootcampsFollowup: { label: "Bootcamps Follow-up", icon: <GraduationCap size={20} />, color: 'var(--orange)', bg: 'rgba(230,126,34,0.15)' },
};

export default function VoiceDashboardPage() {
    const { dateRange, setDateRange } = useData();

    const { voiceMetrics, loadingVoiceMetrics, refreshVoiceMetrics } = useData();
    const loading = loadingVoiceMetrics;

    useEffect(() => {
        refreshVoiceMetrics({
            from: dateRange?.from,
            to: dateRange?.to,
        });
    }, [dateRange, refreshVoiceMetrics]);

    const m = voiceMetrics;

    const dailyVolume = (m?.dailyVolume ?? []).map(d => ({
        name: format(new Date(d.date + 'T00:00:00'), 'MMM dd'),
        calls: d.calls,
    }));

    const hourlyDistribution = (m?.hourlyDistribution ?? [])
        .filter((h: any) => h.hour % 3 === 0)
        .map((h: any) => ({
            name: `${String(h.hour).padStart(2, '0')}:00`,
            calls: h.calls,
        }));

    const byAgent = m?.byAgent ?? [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, position: 'relative', minHeight: 500 }}>
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-layer2)',
                    backdropFilter: 'blur(4px)',
                }}>
                    <div className="liquid-card" style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <BennettLoader />
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--label-secondary)' }}>
                            Updating Analytics…
                        </span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Voice Dashboard</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Overview of voice calls</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DateRangePicker value={dateRange as any} onUpdate={r => setDateRange(r.range)} />
                    <button
                        onClick={() => { if (dateRange?.from) refreshVoiceMetrics({ from: dateRange.from, to: dateRange.to || dateRange.from }); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default' }}
                    >
                        <RefreshCw style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>

            {/* Per-Agent Call Banners */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
                {Object.entries(AGENT_LABELS).map(([key, cfg]) => {
                    const agentData = byAgent.find(a => a.key === key);
                    return (
                        <div key={key} className="liquid-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${cfg.color}` }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color }}>
                                {cfg.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: cfg.color, marginBottom: 2 }}>
                                    {cfg.label}
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 300, color: 'var(--label-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                                    {(agentData?.calls ?? 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Global Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <MetricTile
                    title="Total Calls"
                    value={`${(m?.totalCalls ?? 0).toLocaleString()} calls`}
                    accentColor="var(--label-secondary)"
                    icon={<Phone size={17} />}
                />
                <MetricTile
                    title="Total Duration"
                    value={formatDuration(m?.totalDuration ?? 0)}
                    accentColor="var(--label-secondary)"
                    icon={<Clock size={17} />}
                />
                <MetricTile
                    title="Average Duration"
                    value={`${Math.round(m?.avgDuration ?? 0)}s`}
                    accentColor="var(--label-secondary)"
                    icon={<Timer size={17} />}
                />
            </div>



            

            {/* Charts */}
            <div className="charts-grid">
                {/* Daily Volume */}
                <div className="liquid-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: 'rgba(48,209,88,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--green)',
                        }}>
                            <TrendingUp size={15} />
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                            Daily Call Volume
                        </h3>
                    </div>
                    <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyVolume.length > 0 ? dailyVolume : [{ name: 'No Data', calls: 0 }]}>
                                <CartesianGrid strokeDasharray="3 6" stroke="var(--separator)" strokeWidth={0.5} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} allowDecimals={false} />
                                <Tooltip content={<AppleTooltip />} />
                                <Bar dataKey="calls" fill="var(--green)" radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Hourly Distribution */}
                <div className="liquid-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: 'rgba(0,122,255,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--blue)',
                        }}>
                            <Clock size={15} />
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                            Hourly Distribution
                        </h3>
                    </div>
                    <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyDistribution.length > 0 ? hourlyDistribution : [{ name: '00:00', calls: 0 }]}>
                                <defs>
                                    <linearGradient id="gradCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%"   stopColor="var(--blue)" stopOpacity={0.30} />
                                        <stop offset="100%" stopColor="var(--blue)" stopOpacity={0}    />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 6" stroke="var(--separator)" strokeWidth={0.5} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} allowDecimals={false} />
                                <Tooltip content={<AppleTooltip />} />
                                <Area type="monotone" dataKey="calls" stroke="var(--blue)" strokeWidth={2} fill="url(#gradCalls)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
