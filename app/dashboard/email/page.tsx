"use client";

import { Mail, Send, Inbox, UserMinus, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BennettLoader } from "@/components/bennett-loader";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format, subDays } from "date-fns";
import { AGENT_OPTIONS } from "@/lib/agents";
import { AgentBadge } from "@/components/agents/agent-badge";

/* ── Apple Metric Tile ── */
function MetricTile({ title, subtitle, value, accentColor, icon, onClick }: {
    title: string; subtitle?: string; value: string | number;
    accentColor: string; icon: React.ReactNode; onClick?: () => void;
}) {
    return (
        <div
            className="liquid-card"
            style={{
                padding: '12px 14px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'background 150ms'
            }}
            onClick={onClick}
            onMouseEnter={onClick ? e => (e.currentTarget.style.background = 'var(--fill-secondary)') : undefined}
            onMouseLeave={onClick ? e => (e.currentTarget.style.background = 'var(--bg-layer1)') : undefined}
        >
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${accentColor} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
                    {subtitle && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--label-quaternary)', whiteSpace: 'nowrap' }}>{subtitle}</span>}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: 'var(--ls-metric)', lineHeight: 1.1, marginTop: 2 }}>{value}</h3>
            </div>
        </div>
    );
}

interface AgentStats {
    emailsSent: number;
    replies: number;
    replyRate: number;
    unsubscribed: number;
}

interface OverviewResponse {
    totals: AgentStats;
    byAgent: Record<string, AgentStats>;
    trend: { date: string; emailsSent: number; replies: number }[];
}

export default function EmailDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<OverviewResponse | null>(null);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });

    const fetchOverview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/email/overview?from=${dateRange.from.toISOString()}&to=${(dateRange.to || dateRange.from).toISOString()}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error("Email overview error", e);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    const trendData = (data?.trend ?? []).map(d => ({
        date: format(new Date(d.date + 'T00:00:00'), 'MMM dd'),
        emails: d.emailsSent,
    }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, position: 'relative', minHeight: 500 }}>
            {loading && <BennettLoader />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Email Dashboard</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Overview of email campaigns across all agents</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DateRangePicker value={dateRange as any} onUpdate={(r: any) => setDateRange(r.range)} />
                    <button
                        onClick={fetchOverview}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default' }}
                    >
                        <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                </div>
            </div>

            {/* Top Metric Tiles */}
            <div className="metric-grid-sm">
                <MetricTile
                    title="Total Sent"
                    subtitle="selected range"
                    value={(data?.totals.emailsSent ?? 0).toLocaleString()}
                    accentColor="var(--indigo)"
                    icon={<Mail size={17} />}
                    onClick={() => router.push('/dashboard/email/sent')}
                />
                <MetricTile
                    title="Total Replies"
                    subtitle="selected range"
                    value={(data?.totals.replies ?? 0).toLocaleString()}
                    accentColor="var(--teal)"
                    icon={<Inbox size={17} />}
                    onClick={() => router.push('/dashboard/email/received')}
                />
                <MetricTile
                    title="Reply Rate"
                    subtitle="selected range"
                    value={`${(data?.totals.replyRate ?? 0).toFixed(1)}%`}
                    accentColor="var(--blue)"
                    icon={<Send size={17} />}
                />
                <MetricTile
                    title="Unsubscribed"
                    subtitle="all time"
                    value={(data?.totals.unsubscribed ?? 0).toLocaleString()}
                    accentColor="var(--red)"
                    icon={<UserMinus size={17} />}
                    onClick={() => router.push('/dashboard/email/unsubscribed')}
                />
            </div>

            {/* Email Volume Trend */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                        Email Volume Trend
                    </h2>
                </div>

                <div className="liquid-card" style={{ padding: 24, height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData.length ? trendData : [{ date: 'No Data', emails: 0 }]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,127,127,0.1)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} />
                            <RechartsTooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-layer1)', fontSize: 12, color: 'var(--label-primary)', boxShadow: 'var(--shadow-lg)' }} />
                            <Line type="monotone" dataKey="emails" stroke="var(--indigo)" strokeWidth={3} dot={{ r: 4, fill: 'var(--indigo)' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Per-Agent Breakdown */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                        Per-Agent Breakdown
                    </h2>
                </div>
                <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader style={{ borderBottom: '1px solid var(--hairline)' }}>
                                <TableRow className="bg-[var(--fill-quaternary)] border-none hover:bg-[var(--fill-quaternary)]">
                                    <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Agent</TableHead>
                                    <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Sent</TableHead>
                                    <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Replies</TableHead>
                                    <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Reply Rate</TableHead>
                                    <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Unsubscribed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {AGENT_OPTIONS.map(a => {
                                    const stats = data?.byAgent[a.key];
                                    return (
                                        <TableRow key={a.key} className="hover:bg-[var(--fill-quaternary)] border-b border-[var(--separator)] transition-colors">
                                            <TableCell><AgentBadge agent={a.key} /></TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{(stats?.emailsSent ?? 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{(stats?.replies ?? 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{(stats?.replyRate ?? 0).toFixed(1)}%</TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{(stats?.unsubscribed ?? 0).toLocaleString()}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
