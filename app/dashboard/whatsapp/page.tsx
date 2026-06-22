"use client";

import {
    Users, MessageCircle, TrendingUp, BarChart3,
    Send, MessageSquare, Info, Mail, Phone, LayoutDashboard,
    GraduationCap, Home, Coins, Crown
} from "lucide-react";
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line,
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import {
    Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { BennettLoader } from "@/components/bennett-loader";
import { useData } from "@/context/DataContext";

/* ── Apple Metric Tile ── */
function MetricTile({ title, value, accentColor, icon, onClick, info }: {
    title: string; value: string; accentColor: string;
    icon: React.ReactNode; onClick?: () => void; info?: string;
}) {
    return (
        <div
            className="metric-tile"
            style={{ '--tile-accent': accentColor, cursor: onClick ? 'default' : undefined } as any}
            onClick={onClick}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 0 }}>
                        <span className="tile-label">{title}</span>
                        {info && (
                            <TooltipProvider>
                                <UITooltip>
                                    <TooltipTrigger asChild>
                                        <div style={{ cursor: 'default', display: 'flex' }} onClick={e => e.stopPropagation()}>
                                            <Info size={12} style={{ color: 'var(--label-tertiary)' }} />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[240px]">
                                        <p style={{ fontSize: 12, lineHeight: 1.5 }}>{info}</p>
                                    </TooltipContent>
                                </UITooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <div className="tile-value tabular-nums" style={{ fontSize: 30 }}>{value}</div>
                </div>
                <div style={{
                    width: 38, height: 38, borderRadius: 10,
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
                <p key={i} style={{ fontSize: 13, fontWeight: 600, color: p.color || 'var(--label-primary)', marginBottom: 2 }}>
                    <span style={{ opacity: 0.7, marginRight: 4, fontSize: 11 }}>{p.name}:</span>
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
                        info={m.info}
                    />
                ))}
            </div>
        </div>
    );
}

export default function WhatsappDashboardPage() {
    const router = useRouter();
    const { dateRange } = useData();
    const [waData, setWaData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (from: Date, to: Date) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/whatsapp-leads?from=${encodeURIComponent(startOfDay(from).toISOString())}&to=${encodeURIComponent(endOfDay(to).toISOString())}`);
            if (res.ok) setWaData(await res.json());
        } catch (e) {
            console.error('[WA dashboard]', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!dateRange?.from) return;
        fetchData(dateRange.from, dateRange.to || dateRange.from);
    }, [dateRange, fetchData]);

    const stats = useMemo(() => {
        if (!waData) return { totalLeads: 0, sentCount: 0, uniqueSentCount: 0, totalReplies: 0, ownerReachouts: 0, ownerReplies: 0, ownerSent: 0, dailyTrend: [] as any[] };
        const allLeads = [...(waData.nr_wf || []), ...(waData.followup || []), ...(waData.nurture || [])];
        const from = dateRange?.from ? startOfDay(new Date(dateRange.from)).getTime() : null;
        const to = endOfDay(new Date(dateRange?.to || dateRange?.from || new Date())).getTime();
        const inRange = (t: number) => !from || (t >= from && t <= to);

        const inRangeLeads = allLeads.filter(lead => {
            if (!lead["W.P_1"]) return false;
            const wp1t = lead.wp1_parsed_date ? new Date(lead.wp1_parsed_date).getTime() : null;
            const lct = lead.whatsapp_last_contacted ? new Date(lead.whatsapp_last_contacted).getTime() : null;
            return (wp1t && inRange(wp1t)) || (lct && inRange(lct)) || (!wp1t && !lct);
        });

        let sentCount = 0;
        let totalReplies = 0;
        const dailyMap: Record<string, { reachouts: number; replies: number }> = {};

        inRangeLeads.forEach(lead => {
            for (let i = 1; i <= 12; i++) { if (lead[`W.P_${i}`]) sentCount++; }
            if (lead["W.P_FollowUp"]) sentCount++;
            for (let i = 1; i <= 10; i++) { if (lead[`W.P_FollowUp_${i}`] || lead[`W.P_FollowUp ${i}`]) sentCount++; }
            const wp = lead.WP_Replied_track || lead["WP_Replied_track"];
            const hasReplied = !!(wp && String(wp).trim() && !['no', 'none'].includes(String(wp).trim().toLowerCase()));
            if (hasReplied) totalReplies++;
            if (lead.wp1_parsed_date) {
                const dayKey = new Date(lead.wp1_parsed_date).toISOString().slice(0, 10);
                if (!dailyMap[dayKey]) dailyMap[dayKey] = { reachouts: 0, replies: 0 };
                dailyMap[dayKey].reachouts++;
                if (hasReplied) dailyMap[dayKey].replies++;
            }
        });

        const dailyTrend = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({ date, ...vals }));
        const owners = waData.owners || [];
        const ownerReachouts = owners.filter((o: any) => o["Whatsapp_1"] || o.Whatsapp_1).length;
        let ownerSent = 0, ownerReplies = 0;
        owners.forEach((o: any) => {
            if (o["Whatsapp_1"]) ownerSent++;
            if (o["retry_1"]) ownerSent++;
            for (let i = 1; i <= 5; i++) { if (o[`Bot_Replied_${i}`]) ownerSent++; }
            const wts = o["WTS_Reply_Track"];
            if (wts && wts !== "" && String(wts).toLowerCase() !== "no") ownerReplies++;
        });

        return { totalLeads: allLeads.length, sentCount, uniqueSentCount: inRangeLeads.length, totalReplies, ownerReachouts, ownerReplies, ownerSent, dailyTrend };
    }, [waData, dateRange]);

    const trendData = useMemo(() => stats.dailyTrend.map(d => ({
        date: format(new Date(d.date + 'T00:00:00'), 'MMM dd'),
        sent: d.reachouts, replied: d.replies,
    })), [stats.dailyTrend]);

    const donutData = [
        { name: 'Unique Sent', value: stats.uniqueSentCount, color: 'var(--purple)' },
        { name: 'Total Messages', value: stats.sentCount,       color: 'var(--blue)'   },
        { name: 'Replies',        value: stats.totalReplies,    color: 'var(--green)'  },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, position: 'relative', minHeight: 500 }}>
            {loading && <BennettLoader />}

            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--label-primary)', marginBottom: 4 }}>
                        WhatsApp CRM
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--label-secondary)' }}>
                        Real-time engagement insights and campaign totals
                    </p>
                </div>
            </div>



            {/* Key Metrics */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(15,157,88,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--green)',
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
                        { title: "Unique Msg Sent", value: stats.uniqueSentCount.toLocaleString(), accentColor: "var(--purple)", icon: <Users size={17} /> },
                        { title: "Total Replies", value: stats.totalReplies.toLocaleString(), accentColor: "var(--green)", icon: <MessageCircle size={17} />, info: `${stats.uniqueSentCount > 0 ? ((stats.totalReplies / stats.uniqueSentCount) * 100).toFixed(1) : '0'}% Response Rate` },
                        { title: "Messages Sent", value: stats.sentCount.toLocaleString(), accentColor: "var(--blue)", icon: <Send size={17} /> },
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
                        { title: "Unique Msg Sent", value: stats.uniqueSentCount.toLocaleString(), accentColor: "var(--purple)", icon: <Users size={17} /> },
                        { title: "Total Replies", value: stats.totalReplies.toLocaleString(), accentColor: "var(--green)", icon: <MessageCircle size={17} />, info: `${stats.uniqueSentCount > 0 ? ((stats.totalReplies / stats.uniqueSentCount) * 100).toFixed(1) : '0'}% Response Rate` },
                        { title: "Messages Sent", value: stats.sentCount.toLocaleString(), accentColor: "var(--blue)", icon: <Send size={17} /> },
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
                        { title: "Unique Msg Sent", value: stats.ownerReachouts.toLocaleString(), accentColor: "var(--purple)", icon: <Users size={17} /> },
                        { title: "Total Replies", value: stats.ownerReplies.toLocaleString(), accentColor: "var(--green)", icon: <MessageCircle size={17} />, info: `${stats.ownerReachouts > 0 ? ((stats.ownerReplies / stats.ownerReachouts) * 100).toFixed(1) : '0'}% Response Rate` },
                        { title: "Messages Sent", value: stats.ownerSent.toLocaleString(), accentColor: "var(--blue)", icon: <Send size={17} /> },
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
                        { title: "Unique Msg Sent", value: stats.ownerReachouts.toLocaleString(), accentColor: "var(--purple)", icon: <Users size={17} /> },
                        { title: "Total Replies", value: stats.ownerReplies.toLocaleString(), accentColor: "var(--green)", icon: <MessageCircle size={17} />, info: `${stats.ownerReachouts > 0 ? ((stats.ownerReplies / stats.ownerReachouts) * 100).toFixed(1) : '0'}% Response Rate` },
                        { title: "Messages Sent", value: stats.ownerSent.toLocaleString(), accentColor: "var(--blue)", icon: <Send size={17} /> },
                    ]}
                />
            </div>

            {/* Charts */}
            <div className="charts-grid">
                {/* Conversion Funnel Donut */}
                <div className="liquid-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: 'rgba(0,122,255,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--blue)',
                        }}>
                            <TrendingUp size={15} />
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                            Conversion Funnel
                        </h3>
                    </div>
                    <div style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                                    {donutData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<AppleTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                        {donutData.map(item => (
                            <div key={item.name} style={{
                                borderRadius: 10, padding: '10px 8px', textAlign: 'center',
                                background: `${item.color}14`,
                            }}>
                                <div style={{ fontSize: 16, fontWeight: 600, color: item.color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                                    {item.value.toLocaleString()}
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2 }}>
                                    {item.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Trend */}
                <div className="liquid-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: 'rgba(48,209,88,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--green)',
                        }}>
                            <BarChart3 size={15} />
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                            Activity Trend
                        </h3>
                    </div>
                    <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 6" stroke="var(--separator)" strokeWidth={0.5} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} />
                                <Tooltip content={<AppleTooltip />} />
                                <Line type="monotone" dataKey="sent" name="Sent" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3, fill: 'var(--blue)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="replied" name="Replied" stroke="var(--green)" strokeWidth={2} dot={{ r: 3, fill: 'var(--green)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
                        {[{ color: 'var(--blue)', label: 'Sent' }, { color: 'var(--green)', label: 'Replied' }].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 20, height: 3, borderRadius: 2, background: item.color }} />
                                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-secondary)' }}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
