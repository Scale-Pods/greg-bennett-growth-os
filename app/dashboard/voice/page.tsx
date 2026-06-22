"use client";

import { Phone, Clock, TrendingUp, Timer, Crown, RefreshCw, Mail, MessageCircle, MessageSquare, LayoutDashboard, GraduationCap, Home, Coins } from "lucide-react";
import { BennettLoader } from "@/components/bennett-loader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays } from "date-fns";
import { formatDuration } from "@/lib/utils";
import { useData } from "@/context/DataContext";

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

export default function VoiceDashboardPage() {
    const router = useRouter();
    const providerFilter = "vapi";
    const { dateRange, setDateRange } = useData();

    const { voiceMetrics, loadingVoiceMetrics, refreshVoiceMetrics } = useData();
    const loading = loadingVoiceMetrics;

    useEffect(() => {
        refreshVoiceMetrics({
            from: dateRange?.from,
            to: dateRange?.to,
            includeElevenLabs: false,
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

    const normalCalls = providerFilter === 'vapi' ? (m?.normalCalls ?? 0) : 0;
    const ownerCalls  = providerFilter === 'vapi' ? (m?.ownerCalls  ?? 0) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, position: 'relative', minHeight: 500 }}>
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(var(--bg-app-rgb, 242,242,247),0.60)',
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
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--label-primary)', marginBottom: 4 }}>
                        Voice Agent
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--label-secondary)' }}>
                        Monitor AI voice agent performance across all accounts.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={() => refreshVoiceMetrics({ from: dateRange?.from, to: dateRange?.to, includeElevenLabs: false, force: true })}
                        disabled={loading}
                        style={{
                            height: 38, padding: '0 14px', borderRadius: 10,
                            background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)',
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 13, fontWeight: 500, color: 'var(--label-secondary)',
                            cursor: 'default', transition: 'background 130ms ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                    >
                        <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Channels Overview */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(59,91,219,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--blue)',
                    }}>
                        <LayoutDashboard size={14} />
                    </div>
                    <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                        Channels
                    </h2>
                </div>
                <div className="metric-grid">
                    <MetricTile
                        title="Email"
                        value="—"
                        accentColor="var(--purple)"
                        icon={<Mail size={17} />}
                        onClick={() => router.push('/dashboard/email')}
                    />
                    <MetricTile
                        title="WhatsApp"
                        value="—"
                        accentColor="var(--green)"
                        icon={<MessageCircle size={17} />}
                        onClick={() => router.push('/dashboard/whatsapp')}
                    />
                    <MetricTile
                        title="SMS"
                        value="—"
                        accentColor="#D6336C"
                        icon={<MessageSquare size={17} />}
                        onClick={() => router.push('/dashboard/sms')}
                    />
                    <MetricTile
                        title="Voice"
                        value={`${(m?.totalCalls ?? 0).toLocaleString()} calls`}
                        accentColor="var(--cyan)"
                        icon={<Phone size={17} />}
                    />
                </div>
            </div>

            {/* Key Metrics */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(8,145,178,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--cyan)',
                    }}>
                        <TrendingUp size={14} />
                    </div>
                    <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                        Key Metrics
                    </h2>
                </div>

                {/* ── Bennett Bootcamps ── */}
                <BusinessSection
                    title="Bennett Bootcamps"
                    icon={<GraduationCap size={11} />}
                    iconBg="rgba(230,126,34,0.15)"
                    iconColor="#f59e0b"
                    loading={loading}
                    metrics={[
                        { title: "Total Calls", value: `${normalCalls.toLocaleString()} calls`, accentColor: "var(--orange)", icon: <Phone size={17} /> },
                        { title: "Calls Connected", value: `${(m?.normalConnected ?? 0).toLocaleString()} calls`, accentColor: "var(--green)", icon: <Phone size={17} /> },
                        { title: "Pick-up Rate", value: `${(m?.normalPickupRate ?? 0).toFixed(1)}%`, accentColor: "var(--purple)", icon: <Phone size={17} /> },
                    ]}
                />

                {/* ── Bennett Realty Solutions ── */}
                <BusinessSection
                    title="Bennett Realty Solutions"
                    icon={<Home size={11} />}
                    iconBg="rgba(59,91,219,0.15)"
                    iconColor="#6366f1"
                    loading={loading}
                    metrics={[
                        { title: "Total Calls", value: `${normalCalls.toLocaleString()} calls`, accentColor: "var(--blue)", icon: <Phone size={17} /> },
                        { title: "Calls Connected", value: `${(m?.normalConnected ?? 0).toLocaleString()} calls`, accentColor: "var(--green)", icon: <Phone size={17} /> },
                        { title: "Pick-up Rate", value: `${(m?.normalPickupRate ?? 0).toFixed(1)}%`, accentColor: "var(--purple)", icon: <Phone size={17} /> },
                    ]}
                />

                {/* ── Bennett Wealth Builder ── */}
                <BusinessSection
                    title="Bennett Wealth Builder"
                    icon={<Coins size={11} />}
                    iconBg="rgba(15,157,88,0.15)"
                    iconColor="#22c55e"
                    loading={loading}
                    metrics={[
                        { title: "Total Calls", value: `${ownerCalls.toLocaleString()} calls`, accentColor: "var(--green)", icon: <Phone size={17} /> },
                        { title: "Calls Connected", value: `${(m?.ownerConnected ?? 0).toLocaleString()} calls`, accentColor: "var(--green)", icon: <Phone size={17} /> },
                        { title: "Pick-up Rate", value: `${(m?.ownerPickupRate ?? 0).toFixed(1)}%`, accentColor: "var(--purple)", icon: <Phone size={17} /> },
                    ]}
                />

                {/* ── Platinum & Elite Coaching ── */}
                <BusinessSection
                    title="Platinum & Elite Coaching"
                    icon={<Crown size={11} />}
                    iconBg="rgba(175,82,222,0.15)"
                    iconColor="#a78bfa"
                    loading={loading}
                    metrics={[
                        { title: "Total Calls", value: `${ownerCalls.toLocaleString()} calls`, accentColor: "var(--purple)", icon: <Phone size={17} /> },
                        { title: "Calls Connected", value: `${(m?.ownerConnected ?? 0).toLocaleString()} calls`, accentColor: "var(--green)", icon: <Phone size={17} /> },
                        { title: "Pick-up Rate", value: `${(m?.ownerPickupRate ?? 0).toFixed(1)}%`, accentColor: "var(--purple)", icon: <Phone size={17} /> },
                    ]}
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
