"use client";

import { BennettLoader } from "@/components/bennett-loader";
import {
    Send,
    TrendingUp,
    AlertTriangle,
    Users
} from "lucide-react";
import { useState, useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { subDays, format } from "date-fns";
import { useData } from "@/context/DataContext";


export default function EmailAnalyticsPage() {
    const { leads: allLeads, loadingLeads } = useData();
    const { dateRange, setDateRange } = useData();

    const leadStats = useMemo(() => {
        if (loadingLeads) return { totalSent: 0, totalReplies: 0, totalUnsubscribed: 0, totalLeads: 0 };
        const start = dateRange?.from;
        const end = dateRange?.to;

        const filtered = allLeads.filter(lead => {
            let hasEmail = false;
            for (let i = 1; i <= 10; i++) {
                if (lead[`Email_${i}`] || lead.stage_data?.[`Email_${i}`]) { hasEmail = true; break; }
            }
            if (!hasEmail && !lead.email_replied) return false;
            const dateRef = lead.last_contacted || lead.updated_at || lead.created_at;
            if (!dateRef) return false;
            const leadDate = new Date(dateRef);
            if (start && leadDate < start) return false;
            if (end) { const toDate = new Date(end); toDate.setHours(23, 59, 59, 999); if (leadDate > toDate) return false; }
            return true;
        });

        let sent = 0, replies = 0, unsubscribed = 0;
        filtered.forEach(lead => {
            for (let i = 1; i <= 10; i++) {
                const val = lead[`Email_${i}`] || lead.stage_data?.[`Email_${i}`];
                if (val && String(val).trim() !== "" && String(val).toLowerCase() !== "no") sent++;
            }
            const isReplied = lead.email_replied && String(lead.email_replied).toLowerCase() !== "no" && String(lead.email_replied).toLowerCase() !== "none";
            if (isReplied) replies++;
            const isUnsub = lead.unsubscribed && String(lead.unsubscribed).toLowerCase().includes("yes");
            if (isUnsub) unsubscribed++;
        });

        return { totalSent: sent, totalReplies: replies, totalUnsubscribed: unsubscribed, totalLeads: filtered.length };
    }, [allLeads, loadingLeads, dateRange]);

    const chartData = useMemo(() => {
        if (loadingLeads) return [];
        const start = dateRange?.from;
        const end = dateRange?.to;

        const counts: Record<string, { date: string, sent: number, replies: number }> = {};

        allLeads.forEach(lead => {
            const dateRef = lead.last_contacted || lead.updated_at || lead.created_at;
            if (!dateRef) return;
            const d = new Date(dateRef);
            if (start && d < start) return;
            if (end) {
                const toDate = new Date(end);
                toDate.setHours(23, 59, 59, 999);
                if (d > toDate) return;
            }
            const dateKey = d.toISOString().split('T')[0];

            let sent = 0;
            for (let i = 1; i <= 10; i++) {
                const val = lead[`Email_${i}`] || lead.stage_data?.[`Email_${i}`];
                if (val && String(val).trim() !== "" && String(val).toLowerCase() !== "no") sent++;
            }
            const isReplied = lead.email_replied && String(lead.email_replied).toLowerCase() !== "no" && String(lead.email_replied).toLowerCase() !== "none";

            if (!counts[dateKey]) {
                counts[dateKey] = { date: dateKey, sent: 0, replies: 0 };
            }
            counts[dateKey].sent += sent;
            if (isReplied) counts[dateKey].replies += 1;
        });

        return Object.values(counts)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(item => ({
                ...item,
                displayDate: format(new Date(item.date + 'T00:00:00'), 'MMM dd')
            }));
    }, [allLeads, loadingLeads, dateRange]);

    const { totalSent, totalReplies, totalUnsubscribed, totalLeads } = leadStats;
    const replyRate = totalLeads > 0 ? ((totalReplies / totalLeads) * 100).toFixed(2) : "0.00";

    return (
        <div className="space-y-6 pb-10 relative min-h-[500px]">
            {loadingLeads && <BennettLoader />}


            {/* Campaign Performance */}
            <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)', marginBottom: 10 }}>Campaign Performance</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Total Sent" value={totalSent.toLocaleString()} icon={Send} color="var(--blue)" />
                    <MetricCard label="Replies" value={totalReplies.toLocaleString()} subtext={`${replyRate}% Rate`} icon={TrendingUp} color="var(--blue)" />
                    <MetricCard label="Unsubscribed" value={totalUnsubscribed.toLocaleString()} icon={AlertTriangle} color="var(--orange)" />
                    <MetricCard label="Total Leads" value={totalLeads.toLocaleString()} icon={Users} color="var(--label-secondary)" />
                </div>
            </div>

            {/* Campaign Outreach Trend Chart */}
            <div className="liquid-card" style={{ padding: '20px 24px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)', marginBottom: 16 }}>Campaign Outreach Trend</p>
                {chartData.length > 0 ? (
                    <div style={{ height: 360, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B5BDB" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3B5BDB" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorReplies" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#30D158" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#30D158" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,127,127,0.1)" />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--label-tertiary)' }} />
                                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-layer1)', fontSize: 11, color: 'var(--label-primary)', boxShadow: 'var(--shadow-lg)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--label-secondary)' }} />
                                <Area type="monotone" dataKey="sent" name="Emails Sent" stroke="#3B5BDB" fillOpacity={1} fill="url(#colorSent)" strokeWidth={2} />
                                <Area type="monotone" dataKey="replies" name="Replies Received" stroke="#30D158" fillOpacity={1} fill="url(#colorReplies)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--fill-quaternary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--hairline)' }}>
                        <p style={{ fontSize: 12, color: 'var(--label-tertiary)' }}>No campaign data available in the selected range</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({ label, value, subtext, icon: Icon, color }: any) {
    return (
        <div className="liquid-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
                <div style={{ padding: 6, borderRadius: 'var(--radius-sm)', background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                    <Icon style={{ width: 13, height: 13 }} />
                </div>
            </div>
            <div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: 'var(--ls-metric)' }}>{value}</h3>
                {subtext && <p style={{ fontSize: 11, color: 'var(--label-secondary)', marginTop: 2 }}>{subtext}</p>}
            </div>
        </div>
    );
}
