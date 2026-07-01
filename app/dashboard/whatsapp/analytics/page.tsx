"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Legend,
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TrendingUp, Users, MessageSquare, Send, RefreshCw, Building2, Info, Reply } from "lucide-react";
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { BennettLoader } from "@/components/bennett-loader";
import { useData } from "@/context/DataContext";

export default function WhatsappAnalyticsPage() {
    const { dateRange } = useData();

    const [loopData, setLoopData] = useState<{ nr_wf: any[]; followup: any[]; nurture: any[]; owners: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (from: Date, to: Date) => {
        setLoading(true);
        const fromISO = startOfDay(from).toISOString();
        const toISO = endOfDay(to).toISOString();
        fetch(`/api/whatsapp-leads?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setLoopData(d); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!dateRange?.from) return;
        fetchData(dateRange.from, dateRange.to || dateRange.from);
    }, [dateRange, fetchData]);

    const stats = useMemo(() => {
        if (!loopData) return { uniqueSentCount: 0, sentCount: 0, totalReplies: 0, ownerReachouts: 0, ownerReplies: 0, trendData: [] as any[] };

        const allLeads = [
            ...(loopData.nr_wf || []),
            ...(loopData.followup || []),
            ...(loopData.nurture || []),
        ];

        const from = dateRange?.from ? startOfDay(dateRange.from).getTime() : null;
        const to = endOfDay(dateRange?.to || dateRange?.from || new Date()).getTime();
        const inRange = (t: number) => !from || (t >= from && t <= to);

        let uniqueSentCount = 0;
        let sentCount = 0;
        let totalReplies = 0;
        const dailyMap: Record<string, { reachouts: number; replies: number }> = {};

        const inRangeLeads = allLeads.filter(lead => {
            if (!lead["W.P_1"]) return false;
            const wp1t = lead.wp1_parsed_date ? new Date(lead.wp1_parsed_date).getTime() : null;
            const lct = lead.whatsapp_last_contacted ? new Date(lead.whatsapp_last_contacted).getTime() : null;
            if (wp1t && inRange(wp1t)) return true;
            if (lct && inRange(lct)) return true;
            if (!wp1t && !lct) return true;
            return false;
        });

        uniqueSentCount = inRangeLeads.length;

        inRangeLeads.forEach(lead => {
            for (let i = 1; i <= 12; i++) {
                if (lead[`W.P_${i}`]) sentCount++;
            }
            if (lead["W.P_FollowUp"]) sentCount++;
            for (let i = 1; i <= 10; i++) {
                if (lead[`W.P_FollowUp_${i}`] || lead[`W.P_FollowUp ${i}`]) sentCount++;
            }

            const wp = lead.WP_Replied_track || lead["WP_Replied_track"];
            const hasReplied = !!(wp && String(wp).trim() && String(wp).trim().toLowerCase() !== "no" && String(wp).trim().toLowerCase() !== "none");
            if (hasReplied) totalReplies++;

            if (lead.wp1_parsed_date) {
                const dayKey = new Date(lead.wp1_parsed_date).toISOString().slice(0, 10);
                if (!dailyMap[dayKey]) dailyMap[dayKey] = { reachouts: 0, replies: 0 };
                dailyMap[dayKey].reachouts++;
                if (hasReplied) dailyMap[dayKey].replies++;
            }
        });

        const owners = loopData.owners ?? [];
        const ownerReachouts = owners.filter(o => o["Whatsapp_1"]).length;
        const ownerReplies = owners.filter(o => {
            const v = o["WTS_Reply_Track"];
            return v && String(v).trim() && String(v).trim().toLowerCase() !== "no";
        }).length;

        const trendData = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, { reachouts, replies }]) => ({
                date: format(new Date(date + 'T00:00:00'), 'MMM dd'),
                sent: reachouts,
                replied: replies,
            }));

        return { uniqueSentCount, sentCount, totalReplies, ownerReachouts, ownerReplies, trendData };
    }, [loopData, dateRange]);

    const replyRate = stats.uniqueSentCount > 0
        ? ((stats.totalReplies / stats.uniqueSentCount) * 100).toFixed(1)
        : "0.0";
    const ownerReplyRate = stats.ownerReachouts > 0
        ? ((stats.ownerReplies / stats.ownerReachouts) * 100).toFixed(1)
        : "0.0";

    const loopBreakdown = useMemo(() => {
        if (!loopData) return [];
        const from = dateRange?.from ? startOfDay(dateRange.from).getTime() : null;
        const to = endOfDay(dateRange?.to || dateRange?.from || new Date()).getTime();
        const inRange = (t: number) => !from || (t >= from && t <= to);

        const summarise = (arr: any[], color: string, name: string) => {
            const reachouts = arr.filter(l =>
                l["W.P_1"] && (l.wp1_parsed_date ? inRange(new Date(l.wp1_parsed_date).getTime()) : true)
            ).length;
            const replied = arr.filter(l => {
                const v = l["WP_Replied_track"];
                return v && String(v).trim() !== "" && String(v).trim().toLowerCase() !== "no";
            }).length;
            return { name, reachouts, replied, color };
        };

        return [
            summarise(loopData.nr_wf ?? [], "var(--blue)", "Intro (nr_wf)"),
            summarise(loopData.followup ?? [], "var(--purple)", "Follow Up"),
            summarise(loopData.nurture ?? [], "var(--orange)", "Nurture"),
        ];
    }, [loopData, dateRange]);

    const totalUniqueLeads = stats.uniqueSentCount;

    return (
        <div className="space-y-4 pb-4 relative min-h-[500px]">
            {loading && <BennettLoader />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>WhatsApp Analytics</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Track campaign performance and lead engagement</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={() => { if (dateRange?.from) fetchData(dateRange.from, dateRange.to || dateRange.from); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                    >
                        <RefreshCw style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>

            {/* Lead Campaigns Metrics */}
            <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Lead Campaigns (nr_wf · followup · nurture)</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard title="Messages Sent" value={loading ? "..." : stats.sentCount.toLocaleString()} icon={Send} color="var(--blue)" />
                    <StatCard title="Unique Msg Sent" value={loading ? "..." : totalUniqueLeads.toLocaleString()} icon={Users} color="var(--label-secondary)" info="Count of unique leads where W.P_1 was sent within the selected date range." />
                    <StatCard title="Total Replies" value={loading ? "..." : stats.totalReplies.toLocaleString()} icon={MessageSquare} color="var(--green)" info="Derived from WP_Replied_track. Feature installed recently — select Last 3 Months for historical data." />
                    <StatCard title="Response Rate" value={loading ? "..." : `${replyRate}%`} icon={TrendingUp} color="var(--purple)" />
                </div>
            </div>

            {/* Owner Analytics */}
            <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Building2 style={{ width: 13, height: 13, color: 'var(--orange)' }} /> Generated Leads Outreach
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard title="Generated Leads Outreach" value={loading ? "..." : stats.ownerReachouts.toLocaleString()} icon={Building2} color="var(--orange)" />
                    <StatCard title="Generated Replies" value={loading ? "..." : stats.ownerReplies.toLocaleString()} icon={Reply} color="var(--green)" />
                    <StatCard title="Generated Reply Rate" value={loading ? "..." : `${ownerReplyRate}%`} icon={TrendingUp} color="var(--purple)" />
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Engagement Trend */}
                <div className="liquid-card lg:col-span-2" style={{ padding: '16px' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)', marginBottom: 2 }}>Engagement Trend</p>
                    <p style={{ fontSize: 11, color: 'var(--label-tertiary)', marginBottom: 12 }}>Outbound reachouts vs incoming replies per day</p>
                    <div style={{ height: 240, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.trendData}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B5BDB" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#3B5BDB" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#30D158" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#30D158" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,127,127,0.1)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-layer1)', fontSize: 11, color: 'var(--label-primary)', boxShadow: 'var(--shadow-lg)' }} />
                                <Area type="monotone" dataKey="sent" name="Reachouts" stroke="#3B5BDB" strokeWidth={2} fill="url(#colorSent)" />
                                <Area type="monotone" dataKey="replied" name="Replies" stroke="#30D158" strokeWidth={2} fill="url(#colorReplied)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Loop Breakdown */}
                <div className="liquid-card" style={{ padding: '16px' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)', marginBottom: 2 }}>Loop Breakdown</p>
                    <p style={{ fontSize: 11, color: 'var(--label-tertiary)', marginBottom: 12 }}>Reachouts and replies by campaign loop</p>
                    {loading ? (
                        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label-tertiary)', fontSize: 12 }}>
                            <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} /> Loading...
                        </div>
                    ) : loopBreakdown.every(l => l.reachouts === 0) ? (
                        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label-tertiary)', fontSize: 12 }}>
                            No data for this period
                        </div>
                    ) : (
                        <div style={{ height: 240, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={loopBreakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(127,127,127,0.1)" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} width={72} />
                                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-layer1)', fontSize: 11, color: 'var(--label-primary)', boxShadow: 'var(--shadow-lg)' }} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: 'var(--label-secondary)' }} />
                                    <Bar dataKey="reachouts" name="Reachouts" fill="#3B5BDB" radius={[0, 4, 4, 0]} barSize={14} />
                                    <Bar dataKey="replied" name="Replied" fill="#30D158" radius={[0, 4, 4, 0]} barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Loop Detail Table */}
            {!loading && loopBreakdown.some(l => l.reachouts > 0) && (
                <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)' }}>Loop Performance</p>
                        <p style={{ fontSize: 11, color: 'var(--label-tertiary)', marginTop: 2 }}>Per-loop reachout and reply breakdown</p>
                    </div>
                    <table className="w-full">
                        <thead style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <tr style={{ background: 'var(--fill-quaternary)' }}>
                                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'left' }}>Loop</th>
                                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Reachouts</th>
                                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Replies</th>
                                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Reply Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loopBreakdown.map(row => (
                                <tr key={row.name} style={{ borderBottom: '1px solid var(--hairline)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-quaternary)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>
                                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 8, background: row.color }} />
                                        {row.name}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>{row.reachouts.toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{row.replied.toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--label-secondary)' }}>
                                        {row.reachouts > 0 ? `${((row.replied / row.reachouts) * 100).toFixed(1)}%` : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, info }: any) {
    return (
        <div className="liquid-card" style={{ padding: '12px 14px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10 }}>
            {info && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <TooltipProvider>
                        <UITooltip>
                            <TooltipTrigger asChild>
                                <div style={{ padding: 4, cursor: 'help' }}>
                                    <Info style={{ width: 14, height: 14, color: 'var(--red)' }} />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px] apple-dialog" style={{ padding: 12, fontSize: 11, color: 'var(--label-primary)' }}>
                                <p style={{ fontWeight: 700, marginBottom: 4 }}>Note</p>
                                <p style={{ color: 'var(--label-secondary)', lineHeight: 1.5 }}>{info}</p>
                            </TooltipContent>
                        </UITooltip>
                    </TooltipProvider>
                </div>
            )}
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 14, height: 14, color: color }} />
            </div>
            <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</p>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: 'var(--ls-metric)', lineHeight: 1.1 }}>{value}</h3>
            </div>
        </div>
    );
}
