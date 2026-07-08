"use client";

import { Mail, Send, Inbox, LayoutDashboard, BarChart2, UserMinus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
import { useData } from "@/context/DataContext";
import { BennettLoader } from "@/components/bennett-loader";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import { format } from "date-fns";

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

/* ── Breakdown Card with mini donut ── */
function BreakdownCard({ title, count, total, accentColor }: {
    title: string; count: number; total: number; accentColor: string;
}) {
    const pct = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
    const data = [{ value: pct }, { value: 100 - pct }];

    return (
        <div className="liquid-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, position: 'relative', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data} cx="50%" cy="50%"
                            innerRadius={16} outerRadius={22}
                            startAngle={90} endAngle={-270}
                            dataKey="value" stroke="none"
                        >
                            <Cell fill={accentColor} />
                            <Cell fill={`color-mix(in srgb, ${accentColor} 14%, transparent)`} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--label-primary)' }}>
                        {Math.round(pct)}%
                    </span>
                </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: 'var(--ls-metric)', fontVariantNumeric: 'tabular-nums' }}>
                        {count.toLocaleString()}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--label-tertiary)' }}>sent</span>
                </div>
            </div>
        </div>
    );
}

export default function EmailDashboardPage() {
    const router = useRouter();
    const [selectedLoopMetric, setSelectedLoopMetric] = useState("intro");
    const { leads: allLeads, loadingLeads, dateRange, setDateRange, refreshLeads } = useData();
    const [trendData, setTrendData] = useState<any[]>([]);

    const [data, setData] = useState({
        totalEmails: 0, firstEmail: 0, totalReplies: 0, totalUnsubscribed: 0,
        introCounts: [0, 0, 0],
        followUpCounts: [0, 0, 0],
        nurtureCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        loopTotals: { intro: 0, followup: 0, nurture: 0 },
    });

    const parseMsg = (raw: any): { date: Date | null; content: string } => {
        if (!raw || !String(raw).trim()) return { date: null, content: "" };
        const content = String(raw).trim();
        const isoMatch = content.match(/\n\n(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+)$/);
        if (isoMatch) return { date: new Date(isoMatch[1]), content: content.replace(/\n\n\S+$/, '').trim() };
        const lines = content.split('\n');
        const lastLine = lines[lines.length - 1].trim();
        const lastLineDate = new Date(lastLine.replace(' ', 'T'));
        if (lines.length > 1 && !isNaN(lastLineDate.getTime()) && lastLine.includes('-') && lastLine.includes(':')) {
            return { date: lastLineDate, content: lines.slice(0, -1).join('\n').trim() };
        }
        return { date: null, content };
    };

    useEffect(() => {
        if (loadingLeads) return;
        try {
            const fromD = dateRange?.from ? new Date(dateRange.from) : null;
            const toD = dateRange?.to ? new Date(dateRange.to) : fromD;
            if (fromD) fromD.setHours(0, 0, 0, 0);
            if (toD) toD.setHours(23, 59, 59, 999);
            const inRange = (d: Date | null) => { if (!fromD || !toD) return true; if (!d) return false; return d >= fromD && d <= toD; };

            let totalEmails = 0, replyCount = 0, unsubCount = 0;
            const intro = [0, 0, 0];
            const followUp = [0, 0, 0];
            const nurture = [0, 0, 0, 0, 0, 0, 0, 0, 0];

            allLeads.forEach((lead: any) => {
                const stageData = lead.stage_data || {};
                const stages = lead.stages_passed || [];
                const loop = (lead.source_loop || "").toLowerCase();

                const emailReply = lead.email_replied;
                if (emailReply && !["no", "none", ""].includes(String(emailReply).toLowerCase().trim())) {
                    const parsed = parseMsg(emailReply);
                    const rDate = parsed.date || new Date(lead.updated_at || lead.created_at);
                    if (inRange(rDate)) replyCount++;
                }
                if (lead.unsubscribed && String(lead.unsubscribed).toLowerCase().includes("yes")) {
                    if (inRange(new Date(lead.updated_at || lead.created_at))) unsubCount++;
                }
                stages.forEach((stage: string) => {
                    const s = stage.toLowerCase().trim();
                    if (!s.startsWith("email_")) return;
                    const rawContent = stageData[stage];
                    const emailDate = parseMsg(rawContent).date || new Date(lead.created_at);
                    if (!inRange(emailDate)) return;
                    totalEmails++;
                    if (loop === "intro") {
                        if (s === "email_1") intro[0]++;
                        else if (s === "email_2") intro[1]++;
                        else if (s === "email_3") intro[2]++;
                    } else if (loop.includes("follow")) {
                        if (s === "email_1") followUp[0]++;
                        else if (s === "email_2") followUp[1]++;
                        else if (s === "email_3") followUp[2]++;
                    } else if (loop.includes("nurture")) {
                        for (let i = 0; i < 9; i++) { if (s === `email_${i + 1}`) nurture[i]++; }
                    }
                });
            });

            const dailyMap: Record<string, number> = {};
            allLeads.forEach((lead: any) => {
                const stages = lead.stages_passed || [];
                const stageData = lead.stage_data || {};
                stages.forEach((stage: string) => {
                    if (stage.toLowerCase().startsWith("email_")) {
                        const emailDate = parseMsg(stageData[stage]).date || new Date(lead.created_at);
                        if (inRange(emailDate)) {
                            const dayKey = emailDate.toISOString().slice(0, 10);
                            dailyMap[dayKey] = (dailyMap[dayKey] || 0) + 1;
                        }
                    }
                });
            });

            const trends = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({
                date: format(new Date(date + 'T00:00:00'), 'MMM dd'),
                emails: count
            }));
            setTrendData(trends);

            setData({
                totalEmails, firstEmail: intro[0], totalReplies: replyCount, totalUnsubscribed: unsubCount,
                introCounts: intro, followUpCounts: followUp, nurtureCounts: nurture,
                loopTotals: {
                    intro: intro.reduce((a, b) => a + b, 0),
                    followup: followUp.reduce((a, b) => a + b, 0),
                    nurture: nurture.reduce((a, b) => a + b, 0),
                },
            });
        } catch (e) {
            console.error("Email dashboard error", e);
        }
    }, [dateRange, allLeads, loadingLeads]);

    const loopOptions = {
        intro:   { value: data.loopTotals.intro,   label: "Intro Loop",    color: 'var(--blue)'   },
        followup:{ value: data.loopTotals.followup, label: "Follow-up Loop",color: 'var(--orange)' },
        nurture: { value: data.loopTotals.nurture,  label: "Nurture Loop",  color: 'var(--purple)' },
    };
    const currentLoop = loopOptions[selectedLoopMetric as keyof typeof loopOptions];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, position: 'relative', minHeight: 500 }}>
            {loadingLeads && <BennettLoader />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Email Dashboard</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Overview of email campaigns</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DateRangePicker value={dateRange as any} onUpdate={r => setDateRange(r.range)} />
                    <button
                        onClick={() => refreshLeads?.()}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default' }}
                    >
                        <RefreshCw style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>

            {/* Top Metric Tiles */}
            <div className="metric-grid-sm">
                <MetricTile
                    title="Total Emails"
                    subtitle="selected range"
                    value={data.totalEmails.toLocaleString()}
                    accentColor="var(--indigo)"
                    icon={<Mail size={17} />}
                    onClick={() => router.push('/dashboard/email/sent')}
                />
                <MetricTile
                    title="Intro Email"
                    subtitle="selected range"
                    value={data.firstEmail.toLocaleString()}
                    accentColor="var(--blue)"
                    icon={<Send size={17} />}
                />

                {/* Dynamic loop card */}
                <div className="liquid-card" style={{ padding: '12px 14px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Select value={selectedLoopMetric} onValueChange={setSelectedLoopMetric}>
                            <SelectTrigger style={{
                                height: 24, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                                background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-sm)', padding: '0 8px', width: 130,
                                color: currentLoop.color,
                            }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="intro">Intro Loop</SelectItem>
                                <SelectItem value="followup">Follow-up Loop</SelectItem>
                                <SelectItem value="nurture">Nurture Loop</SelectItem>
                            </SelectContent>
                        </Select>
                        <div style={{
                            width: 32, height: 32, borderRadius: 'var(--radius-md)',
                            background: `color-mix(in srgb, ${currentLoop.color} 12%, transparent)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: currentLoop.color, flexShrink: 0
                        }}>
                            <LayoutDashboard size={14} />
                        </div>
                    </div>
                    <div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: 'var(--ls-metric)', lineHeight: 1.1 }}>
                            {currentLoop.value.toLocaleString()}
                        </h3>
                        <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--label-quaternary)', marginTop: 2 }}>{currentLoop.label} Emails</p>
                    </div>
                </div>

                <MetricTile
                    title="Total Replies"
                    subtitle="All time"
                    value={data.totalReplies.toLocaleString()}
                    accentColor="var(--teal)"
                    icon={<Inbox size={17} />}
                    onClick={() => router.push('/dashboard/email/received')}
                />
                <MetricTile
                    title="Unsubscribed"
                    subtitle="All time"
                    value={data.totalUnsubscribed.toLocaleString()}
                    accentColor="var(--red)"
                    icon={<UserMinus size={17} />}
                    onClick={() => router.push('/dashboard/email/unsubscribed')}
                />
            </div>

            {/* Email Performance Trend */}
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
        </div>
    );
}
