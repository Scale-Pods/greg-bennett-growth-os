"use client";

import {
    Users, Mail, Phone, TrendingUp, PieChart as PieChartIcon,
    Wallet, Coins, GraduationCap
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useState, useEffect, useMemo, useCallback } from "react";
import { startOfDay, endOfDay, format } from "date-fns";
import { BennettLoader } from "@/components/bennett-loader";
import { useData } from "@/context/DataContext";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { RefreshCw } from "lucide-react";

/* ── Liquid Glass Metric Tile ── */
function MetricTile({
    title, value, subLabel, subLabelColor = 'var(--label-tertiary)', accentColor,
    icon, onClick,
}: {
    title: string;
    value: string;
    subLabel: string;
    subLabelColor?: string;
    accentColor: string;
    icon: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <div
            className={`metric-tile ${onClick ? 'liquid-card-interactive' : ''}`}
            onClick={onClick}
            style={{ '--tile-accent': accentColor } as React.CSSProperties}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="tile-label">{title}</span>
                <div className="tile-icon-wrapper" style={{ color: accentColor }}>
                    {icon}
                </div>
            </div>
            <div className="tile-value">{value}</div>
            <div className="tile-trend" style={{ color: subLabelColor }}>{subLabel}</div>
        </div>
    );
}

/* ── Custom Tooltip for Recharts ── */
function AppleTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--glass-fill)',
            backdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid var(--glass-border)',
            borderRadius: 12,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        }}>
            <p style={{ fontSize: 12, color: 'var(--label-secondary)', marginBottom: 4, letterSpacing: '-0.01em' }}>{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ fontSize: 14, fontWeight: 600, color: p.color || 'var(--label-primary)', letterSpacing: '-0.02em' }}>
                    {p.value?.toLocaleString()}
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
    metrics: { title: string; value: string; subLabel: string; subLabelColor?: string; accentColor: string; icon: React.ReactNode }[];
}) {
    return (
        <div>
            {/* Section Header */}
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
                <div style={{ height: '0.5px', background: 'var(--separator)', width: '100%', marginLeft: 8 }} />
            </div>

            {/* Grid Layout */}
            <div className="metric-grid">
                {metrics.map((m, i) => (
                    <MetricTile
                        key={i}
                        title={m.title}
                        value={loading ? '—' : m.value}
                        subLabel={m.subLabel}
                        subLabelColor={m.subLabelColor}
                        accentColor={m.accentColor}
                        icon={m.icon}
                    />
                ))}
            </div>
        </div>
    );
}

export default function MasterDashboard() {
    const {
        masterMetrics,
        loadingMasterMetrics,
        dateRange,
        setDateRange,
        refreshMasterMetrics,
    } = useData();

    /* Inbound Leads stats */
    const [inboundMetrics, setInboundMetrics] = useState<{ totalCount: number; wealthCount: number; realtyCount: number; bootcampsCount: number } | null>(null);

    /* AI Agent metrics (Recruiting / Coaching / Investor / BigLife / Bootcamps New / Bootcamps Follow-up) */
    type AgentMetric = { key: string; totalLeads: number; emailsSent: number; voiceCalls: number; emailReplies: number; callReplies: number };
    const [agentMetrics, setAgentMetrics] = useState<Record<string, AgentMetric> | null>(null);
    const [loadingAgentMetrics, setLoadingAgentMetrics] = useState(true);

    /* Voice metrics (for Channel Mix donut) */
    const [totalVoiceCalls, setTotalVoiceCalls] = useState(0);

    const fetchAgentMetrics = useCallback(async (from: Date, to: Date) => {
        setLoadingAgentMetrics(true);
        try {
            const query = new URLSearchParams({
                from: startOfDay(from).toISOString(),
                to: endOfDay(to).toISOString(),
            });
            const res = await fetch(`/api/metrics/agents?${query.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setAgentMetrics(data);
            }
        } catch (e) {
            console.error('Error fetching agent metrics', e);
        } finally {
            setLoadingAgentMetrics(false);
        }
    }, []);

    const fetchVoiceTotals = useCallback(async (from: Date, to: Date) => {
        try {
            const query = new URLSearchParams({
                from: startOfDay(from).toISOString(),
                to: endOfDay(to).toISOString(),
            });
            const res = await fetch(`/api/metrics/voice?${query.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setTotalVoiceCalls(data.totalCalls || 0);
            }
        } catch (e) {
            console.error('Error fetching voice totals', e);
        }
    }, []);

    const fetchInboundMetrics = useCallback(async () => {
        try {
            const res = await fetch('/api/metrics/inbound-leads');
            if (res.ok) {
                const data = await res.json();
                setInboundMetrics(data);
            }
        } catch (e) {
            console.error('Error fetching inbound metrics', e);
        }
    }, []);

    useEffect(() => {
        if (!dateRange?.from) return;
        fetchAgentMetrics(dateRange.from, dateRange.to || dateRange.from);
        fetchVoiceTotals(dateRange.from, dateRange.to || dateRange.from);
    }, [dateRange, fetchAgentMetrics, fetchVoiceTotals]);

    useEffect(() => {
        fetchInboundMetrics();
    }, [fetchInboundMetrics]);

    const loading = loadingMasterMetrics;
    const acquisitionChartData = useMemo(() => {
        if (!masterMetrics?.leadsDaily?.length) return [];
        return masterMetrics.leadsDaily.map(d => ({
            name: format(new Date(d.date + 'T00:00:00'), 'MMM dd'),
            leads: d.leads,
        }));
    }, [masterMetrics]);

    const totalEmailsSent = useMemo(() => {
        if (!agentMetrics) return 0;
        return Object.values(agentMetrics).reduce((sum, a) => sum + (a.emailsSent || 0), 0);
    }, [agentMetrics]);

    const serviceDistribution = [
        { name: 'Email', value: totalEmailsSent, color: 'var(--blue)' },
        { name: 'Voice', value: totalVoiceCalls, color: 'var(--cyan)' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'relative' }}>
            {loading && <BennettLoader />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Master Dashboard</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Overview of all your campaigns</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DateRangePicker value={dateRange as any} onUpdate={r => setDateRange(r.range)} />
                    <button
                        onClick={() => { if (dateRange?.from) { refreshMasterMetrics({ from: dateRange.from, to: dateRange.to || dateRange.from }); fetchInboundMetrics(); fetchAgentMetrics(dateRange.from, dateRange.to || dateRange.from); fetchVoiceTotals(dateRange.from, dateRange.to || dateRange.from); } }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default' }}
                    >
                        <RefreshCw style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>

            {/* Inbound Leads Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(230, 126, 34, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e67e22', flexShrink: 0 }}>
                        <Users size={12} />
                    </div>
                    <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--label-secondary)', whiteSpace: 'nowrap' }}>Inbound Leads (All Time)</h2>
                    <div style={{ height: '0.5px', background: 'var(--separator)', width: '100%', marginLeft: 8 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <MetricTile
                        title="Total Inbound Leads"
                        value={inboundMetrics ? inboundMetrics.totalCount.toLocaleString() : '—'}
                        subLabel="All businesses"
                        accentColor="#e67e22"
                        icon={<Users size={16} />}
                    />
                    <MetricTile
                        title="Bennett Wealth Builders Foundation"
                        value={inboundMetrics ? inboundMetrics.wealthCount.toLocaleString() : '—'}
                        subLabel="Inbound"
                        accentColor="var(--green)"
                        icon={<img src="/wealth.png" className="w-4 h-4 object-contain opacity-80" alt="Wealth" />}
                    />
                    <MetricTile
                        title="Bennett Realty Solutions"
                        value={inboundMetrics ? inboundMetrics.realtyCount.toLocaleString() : '—'}
                        subLabel="Inbound"
                        accentColor="var(--blue)"
                        icon={<img src="/realty.png" className="w-4 h-4 object-contain opacity-80" alt="Realty" />}
                    />
                    <MetricTile
                        title="Bennett Bootcamps"
                        value={inboundMetrics ? inboundMetrics.bootcampsCount.toLocaleString() : '—'}
                        subLabel="Inbound"
                        accentColor="var(--orange)"
                        icon={<img src="/bootcamps.png" className="w-4 h-4 object-contain opacity-80" alt="Bootcamps" />}
                    />
                </div>
            </div>

            {/* ── AI Agent Sections ── */}
            {[
                { key: "recruiting", title: "Recruiting AI Agent", icon: <Users size={12} />, iconBg: "rgba(99,102,241,0.15)", iconColor: "#6366f1" },
                { key: "coaching", title: "Coaching AI Agent", icon: <GraduationCap size={12} />, iconBg: "rgba(34,197,94,0.15)", iconColor: "#22c55e" },
                { key: "investor", title: "Investor AI Agent", icon: <Coins size={12} />, iconBg: "rgba(245,158,11,0.15)", iconColor: "#f59e0b" },
                { key: "biglife", title: "BigLife AI Agent", icon: <Wallet size={12} />, iconBg: "rgba(15,157,88,0.15)", iconColor: "#22c55e" },
                { key: "bootcampsNew", title: "Bootcamps New Leads AI Agent", icon: <img src="/bootcamps.png" className="w-3 h-3 object-contain" alt="" />, iconBg: "rgba(230,126,34,0.15)", iconColor: "#f59e0b" },
                { key: "bootcampsFollowup", title: "Bootcamps Follow-up Leads AI Agent", icon: <img src="/bootcamps.png" className="w-3 h-3 object-contain" alt="" />, iconBg: "rgba(230,126,34,0.15)", iconColor: "#e67e22" },
            ].map(agent => {
                const am = agentMetrics?.[agent.key];
                const emailReplyRate = am && am.emailsSent > 0 ? ((am.emailReplies / am.emailsSent) * 100).toFixed(1) : '0';
                const callReplyRate = am && am.voiceCalls > 0 ? ((am.callReplies / am.voiceCalls) * 100).toFixed(1) : '0';
                return (
                    <BusinessSection
                        key={agent.key}
                        title={agent.title}
                        icon={agent.icon}
                        iconBg={agent.iconBg}
                        iconColor={agent.iconColor}
                        loading={loadingAgentMetrics}
                        metrics={[
                            { title: "Total Leads", value: (am?.totalLeads ?? 0).toLocaleString(), subLabel: "All time", accentColor: "#6366f1", icon: <Users size={16} /> },
                            { title: "Emails Sent", value: (am?.emailsSent ?? 0).toLocaleString(), subLabel: "In range", accentColor: "#22c55e", icon: <Mail size={16} /> },
                            { title: "Voice Calls", value: (am?.voiceCalls ?? 0).toLocaleString(), subLabel: "In range", accentColor: "#f59e0b", icon: <Phone size={16} /> },
                            { title: "Email Replies", value: (am?.emailReplies ?? 0).toLocaleString(), subLabel: `${emailReplyRate}% reply rate`, subLabelColor: Number(emailReplyRate) > 0 ? '#a78bfa' : 'var(--label-tertiary)', accentColor: "#a78bfa", icon: <Mail size={16} /> },
                            { title: "Call Replies", value: (am?.callReplies ?? 0).toLocaleString(), subLabel: `${callReplyRate}% reply rate`, subLabelColor: Number(callReplyRate) > 0 ? '#06b6d4' : 'var(--label-tertiary)', accentColor: "#06b6d4", icon: <Phone size={16} /> },
                        ]}
                    />
                );
            })}

            {/* ── Charts ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                <div className="charts-grid-2-1">
                    {/* Lead Acquisition Chart */}
                    <div className="liquid-card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 9,
                                background: 'rgba(0,122,255,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--blue)',
                            }}>
                                <TrendingUp size={15} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                                    Lead Acquisition
                                </h3>
                                <p style={{ fontSize: 12, color: 'var(--label-tertiary)' }}>Daily new leads</p>
                            </div>
                        </div>
                        <div style={{ height: 280 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={acquisitionChartData}>
                                    <defs>
                                        <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%"   stopColor="var(--blue)" stopOpacity={0.30} />
                                            <stop offset="75%"  stopColor="var(--blue)" stopOpacity={0.05} />
                                            <stop offset="100%" stopColor="var(--blue)" stopOpacity={0}    />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 6" stroke="var(--separator)" strokeWidth={0.5} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false} tickLine={false}
                                        tick={{ fontSize: 11, fill: 'var(--label-tertiary)', fontWeight: 500 }}
                                        dy={8}
                                    />
                                    <YAxis
                                        axisLine={false} tickLine={false}
                                        tick={{ fontSize: 11, fill: 'var(--label-tertiary)', fontWeight: 500 }}
                                    />
                                    <Tooltip content={<AppleTooltip />} />
                                    <Area
                                        type="monotone" dataKey="leads"
                                        stroke="var(--blue)" strokeWidth={2}
                                        fill="url(#gradLeads)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Channel Mix Donut */}
                    <div className="liquid-card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 9,
                                background: 'rgba(175,82,222,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--purple)',
                            }}>
                                <PieChartIcon size={15} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                                    Channel Mix
                                </h3>
                                <p style={{ fontSize: 12, color: 'var(--label-tertiary)' }}>Email vs. Voice outreach</p>
                            </div>
                        </div>
                        <div style={{ height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={serviceDistribution}
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={80}
                                        paddingAngle={4} dataKey="value"
                                    >
                                        {serviceDistribution.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<AppleTooltip />} />
                                    <Legend
                                        iconType="circle" iconSize={8}
                                        wrapperStyle={{ fontSize: 12, color: 'var(--label-secondary)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
