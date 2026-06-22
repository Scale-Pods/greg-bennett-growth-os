"use client";

import { Mail, Send, Inbox, LayoutDashboard, BarChart2, UserMinus } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
import { subDays } from "date-fns";
import { useData } from "@/context/DataContext";
import { BennettLoader } from "@/components/bennett-loader";

/* ── Apple Metric Tile ── */
function MetricTile({ title, subtitle, value, accentColor, icon, onClick }: {
    title: string; subtitle?: string; value: string | number;
    accentColor: string; icon: React.ReactNode; onClick?: () => void;
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
                    <div className="tile-value tabular-nums" style={{ fontSize: 30 }}>{value}</div>
                    {subtitle && (
                        <div className="tile-trend neutral">{subtitle}</div>
                    )}
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

/* ── Breakdown Card with mini donut ── */
function BreakdownCard({ title, count, total, accentColor }: {
    title: string; count: number; total: number; accentColor: string;
}) {
    const pct = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
    const data = [{ value: pct }, { value: 100 - pct }];

    return (
        <div className="liquid-card" style={{ padding: '20px 20px 24px', textAlign: 'center' }}>
            {/* Mini donut */}
            <div style={{ height: 110, position: 'relative', marginBottom: 4 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data} cx="50%" cy="50%"
                            innerRadius={30} outerRadius={45}
                            startAngle={90} endAngle={-270}
                            dataKey="value" stroke="none"
                        >
                            <Cell fill={accentColor} />
                            <Cell fill={`${accentColor}14`} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--label-primary)' }}>
                        {pct}%
                    </span>
                </div>
            </div>

            <div style={{ fontSize: 26, fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--label-primary)', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
                {count.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: accentColor }}>
                {title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--label-tertiary)', marginTop: 2 }}>Emails Sent</div>
        </div>
    );
}

export default function EmailDashboardPage() {
    const router = useRouter();
    const [selectedLoopMetric, setSelectedLoopMetric] = useState("intro");
    const [dateSubtitle, setDateSubtitle] = useState("all time");
    const { leads: allLeads, loadingLeads } = useData();

    const [dateRange, setDateRange] = useState<any>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });

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
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--label-primary)', marginBottom: 4 }}>
                        Email Marketing
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--label-secondary)' }}>
                        Monitor your campaigns and inbox health
                    </p>
                </div>
                <DateRangePicker onUpdate={r => {
                    setDateRange(r.range);
                    setDateSubtitle(r.label ? `${r.label.toLowerCase()}` : 'selected range');
                }} />
            </div>

            {/* Top Metric Tiles */}
            <div className="metric-grid-sm">
                <MetricTile
                    title="Total Emails"
                    subtitle={dateSubtitle}
                    value={data.totalEmails.toLocaleString()}
                    accentColor="var(--indigo)"
                    icon={<Mail size={17} />}
                    onClick={() => router.push('/dashboard/email/sent')}
                />
                <MetricTile
                    title="Intro Email"
                    subtitle={dateSubtitle}
                    value={data.firstEmail.toLocaleString()}
                    accentColor="var(--blue)"
                    icon={<Send size={17} />}
                />

                {/* Dynamic loop card */}
                <div className="metric-tile" style={{ '--tile-accent': currentLoop.color } as any}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Select value={selectedLoopMetric} onValueChange={setSelectedLoopMetric}>
                            <SelectTrigger style={{
                                height: 30, fontSize: 12, fontWeight: 600,
                                background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)',
                                borderRadius: 8, padding: '0 10px', width: 140,
                                color: 'var(--label-primary)',
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
                            width: 28, height: 28, borderRadius: 8,
                            background: `${currentLoop.color}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: currentLoop.color,
                        }}>
                            <LayoutDashboard size={14} />
                        </div>
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--label-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                        {currentLoop.value.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--label-secondary)', marginTop: 6 }}>
                        {currentLoop.label} Emails
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

            {/* Campaign Breakdown Tabs */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                        Campaign Performance
                    </h2>
                </div>

                <Tabs defaultValue="intro">
                    <TabsList style={{ marginBottom: 20 }}>
                        <TabsTrigger value="intro">Intro Loop</TabsTrigger>
                        <TabsTrigger value="followup">Follow-up Loop</TabsTrigger>
                        <TabsTrigger value="nurture">Nurture Loop</TabsTrigger>
                    </TabsList>

                    <TabsContent value="intro">
                        <div className="metric-grid-sm">
                            {["Email 1", "Email 2", "Email 3"].map((name, i) => (
                                <BreakdownCard key={name} title={name} count={data.introCounts[i]} total={data.totalEmails} accentColor="var(--blue)" />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="followup">
                        <div className="metric-grid-sm">
                            {["Email 1", "Email 2", "Email 3"].map((name, i) => (
                                <BreakdownCard key={name} title={name} count={data.followUpCounts[i]} total={data.totalEmails} accentColor="var(--orange)" />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="nurture">
                        <div className="metric-grid-sm">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <BreakdownCard key={i} title={`Email ${i + 1}`} count={data.nurtureCounts[i]} total={data.totalEmails} accentColor="var(--purple)" />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
