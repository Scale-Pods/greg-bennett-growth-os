"use client";

import {
    Users, Mail, MessageCircle, Phone, TrendingUp, PieChart as PieChartIcon,
    Activity, X, Info, Wallet,
    Home, Coins, GraduationCap
} from "lucide-react";
import {
    Tooltip as UITooltip, TooltipContent as UITooltipContent,
    TooltipProvider as UITooltipProvider, TooltipTrigger as UITooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TotalRepliesView } from "@/components/dashboard/total-replies-view";
import { WhatsAppChatDetail } from "@/components/dashboard/whatsapp-chat-detail";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { BennettLoader } from "@/components/bennett-loader";
import { useData } from "@/context/DataContext";

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
    const [isRepliesModalOpen, setIsRepliesModalOpen] = useState(false);
    const [isRepliesExpanded, setIsRepliesExpanded] = useState(false);
    const [chatLead, setChatLead] = useState<any | null>(null);

    const {
        masterMetrics,
        loadingMasterMetrics,
        calls,
        dateRange,
        setDateRange,
        leads,
    } = useData();
    const router = useRouter();

    /* WA stats */
    const [waUniqueSent, setWaUniqueSent] = useState<number | null>(null);
    const [waReplies, setWaReplies] = useState<number | null>(null);
    const [waReplyLeads, setWaReplyLeads] = useState<any[]>([]);

    /* Inbound Leads stats */
    const [inboundMetrics, setInboundMetrics] = useState<{ totalCount: number; wealthCount: number; realtyCount: number; bootcampsCount: number } | null>(null);

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

    const fetchWaStats = useCallback(async (from: Date, to: Date) => {
        const fromISO = startOfDay(from).toISOString();
        const toISO = endOfDay(to).toISOString();
        const res = await fetch(`/api/whatsapp-leads?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`);
        if (!res.ok) return;
        const data = await res.json();
        const allLeadsWA: any[] = [...(data.nr_wf || []), ...(data.followup || []), ...(data.nurture || [])];
        const rangeFrom = startOfDay(from).getTime();
        const rangeTo = endOfDay(to).getTime();
        let unique = 0;
        const replied: any[] = [];
        allLeadsWA.forEach((lead: any) => {
            if (!lead["W.P_1"]) return;
            const wp1t = lead.wp1_parsed_date ? new Date(lead.wp1_parsed_date).getTime() : null;
            const lct = lead.whatsapp_last_contacted ? new Date(lead.whatsapp_last_contacted).getTime() : null;
            const inRange = (wp1t && wp1t >= rangeFrom && wp1t <= rangeTo) || (lct && lct >= rangeFrom && lct <= rangeTo) || (!wp1t && !lct);
            if (!inRange) return;
            unique++;
            const wp = lead.WP_Replied_track || lead["WP_Replied_track"];
            const hasReply = wp && String(wp).trim() && !['no', 'none'].includes(String(wp).trim().toLowerCase());
            if (hasReply) replied.push({ ...lead, id: lead["Lead ID"] || lead.id, name: lead["Name"] || lead.name || "Unknown", phone: lead["Phone"] || lead.phone || "", email: lead["Email"] || lead.email || "", WP_Replied_track: wp });
        });
        setWaUniqueSent(unique);
        setWaReplies(replied.length);
        setWaReplyLeads(replied);
    }, []);

    /* SMS stats */
    const [smsUniqueSent, setSmsUniqueSent] = useState<number | null>(null);
    const [smsReplies, setSmsReplies] = useState<number | null>(null);
    const [smsOwnerReachouts, setSmsOwnerReachouts] = useState<number>(0);
    const [smsOwnerReplies, setSmsOwnerReplies] = useState<number>(0);

    const fetchSmsStats = useCallback(async (from: Date, to: Date) => {
        const fromISO = startOfDay(from).toISOString();
        const toISO = endOfDay(to).toISOString();
        const res = await fetch(`/api/sms-leads?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`);
        if (!res.ok) return;
        const data = await res.json();
        const allLeadsSMS: any[] = [...(data.nr_wf || []), ...(data.followup || []), ...(data.nurture || [])];
        const rangeFrom = startOfDay(from).getTime();
        const rangeTo = endOfDay(to).getTime();
        let unique = 0;
        let repliedCount = 0;
        allLeadsSMS.forEach((lead: any) => {
            if (!lead["W.P_1"]) return;
            const wp1t = lead.wp1_parsed_date ? new Date(lead.wp1_parsed_date).getTime() : null;
            const lct = lead.whatsapp_last_contacted ? new Date(lead.whatsapp_last_contacted).getTime() : null;
            const inRange = (wp1t && wp1t >= rangeFrom && wp1t <= rangeTo) || (lct && lct >= rangeFrom && lct <= rangeTo) || (!wp1t && !lct);
            if (!inRange) return;
            unique++;
            const wp = lead.WP_Replied_track || lead["WP_Replied_track"];
            const hasReply = wp && String(wp).trim() && !['no', 'none'].includes(String(wp).trim().toLowerCase());
            if (hasReply) repliedCount++;
        });
        setSmsUniqueSent(unique);
        setSmsReplies(repliedCount);

        const owners = data.owners || [];
        const ownerReachouts = owners.filter((o: any) => o["Whatsapp_1"]).length;
        const ownerReplies = owners.filter((o: any) => {
            const v = o["WTS_Reply_Track"];
            return v && String(v).trim() && String(v).toLowerCase() !== "no";
        }).length;
        setSmsOwnerReachouts(ownerReachouts);
        setSmsOwnerReplies(ownerReplies);
    }, []);

    useEffect(() => {
        if (!dateRange?.from) return;
        fetchWaStats(dateRange.from, dateRange.to || dateRange.from);
        fetchSmsStats(dateRange.from, dateRange.to || dateRange.from);
    }, [dateRange, fetchWaStats, fetchSmsStats]);

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

    const m = masterMetrics;
    const totalWaReplies = waReplies ?? m?.totalWaReplies ?? 0;
    const totalWaReachouts = waUniqueSent ?? m?.totalWaReachouts ?? 0;
    const replyRate = totalWaReachouts > 0 ? ((totalWaReplies / totalWaReachouts) * 100).toFixed(1) : '0';

    const totalLeadsCRM = Math.max(0, (m?.totalLeads ?? 0) - (m?.totalOwnerLeads ?? 0));
    const totalWaReachoutsCRM = Math.max(0, totalWaReachouts - (m?.ownerWaReachouts ?? 0));
    const totalWaRepliesCRM = Math.max(0, totalWaReplies - (m?.ownerWaReplies ?? 0));
    const replyRateCRM = totalWaReachoutsCRM > 0 ? ((totalWaRepliesCRM / totalWaReachoutsCRM) * 100).toFixed(1) : '0';
    const totalVoiceCallsCRM = Math.max(0, (m?.totalVoiceCalls ?? 0) - (m?.ownerVoiceCalls ?? 0));

    const totalLeadsGen = m?.totalOwnerLeads ?? 0;
    const totalWaReachoutsGen = m?.ownerWaReachouts ?? 0;
    const totalWaRepliesGen = m?.ownerWaReplies ?? 0;
    const replyRateGen = totalWaReachoutsGen > 0 ? ((totalWaRepliesGen / totalWaReachoutsGen) * 100).toFixed(1) : '0';
    const totalVoiceCallsGen = m?.ownerVoiceCalls ?? 0;

    const totalSmsReachouts = smsUniqueSent ?? 0;
    const totalSmsReplies = smsReplies ?? 0;
    const smsReplyRate = totalSmsReachouts > 0 ? ((totalSmsReplies / totalSmsReachouts) * 100).toFixed(1) : '0';
    const smsReplyRateGen = smsOwnerReachouts > 0 ? ((smsOwnerReplies / smsOwnerReachouts) * 100).toFixed(1) : '0';

    const serviceDistribution = [
        { name: 'Email', value: 0, color: 'var(--blue)' },
        { name: 'WhatsApp', value: totalWaReachouts, color: 'var(--green)' },
        { name: 'SMS', value: totalSmsReachouts, color: '#D6336C' },
        { name: 'Voice', value: m?.totalVoiceCalls ?? 0, color: 'var(--cyan)' },
    ];

    const totalEmailsSentCRM = useMemo(() => {
        if (loading) return 0;
        let count = 0;
        const start = dateRange?.from ? startOfDay(dateRange.from).getTime() : null;
        const end = dateRange?.to ? endOfDay(dateRange.to).getTime() : null;
        const crmLeads = (leads || []).filter((l: any) => l.source_loop && l.source_loop !== 'Owner Message');
        crmLeads.forEach((lead: any) => {
            const dateRef = lead.last_contacted || lead.updated_at || lead.created_at;
            if (dateRef) {
                const t = new Date(dateRef).getTime();
                if (start && t < start) return;
                if (end && t > end) return;
            }
            for (let i = 1; i <= 10; i++) {
                const val = lead[`Email_${i}`] || lead.stage_data?.[`Email_${i}`];
                if (val && String(val).trim() !== "" && String(val).toLowerCase() !== "no") count++;
            }
        });
        return count;
    }, [leads, loading, dateRange]);

    const totalEmailsSentGen = useMemo(() => {
        if (loading) return 0;
        let count = 0;
        const start = dateRange?.from ? startOfDay(dateRange.from).getTime() : null;
        const end = dateRange?.to ? endOfDay(dateRange.to).getTime() : null;
        const genLeads = (leads || []).filter((l: any) => !l.source_loop || l.source_loop === 'Owner Message');
        genLeads.forEach((lead: any) => {
            const dateRef = lead.last_contacted || lead.updated_at || lead.created_at;
            if (dateRef) {
                const t = new Date(dateRef).getTime();
                if (start && t < start) return;
                if (end && t > end) return;
            }
            for (let i = 1; i <= 10; i++) {
                const val = lead[`Email_${i}`] || lead.stage_data?.[`Email_${i}`];
                if (val && String(val).trim() !== "" && String(val).toLowerCase() !== "no") count++;
            }
        });
        return count;
    }, [leads, loading, dateRange]);



    // Segmented Metrics Calculations
    const crmSmsReachouts = Math.max(0, totalSmsReachouts - smsOwnerReachouts);
    const crmSmsReplies = Math.max(0, totalSmsReplies - smsOwnerReplies);
    const crmSmsReplyRate = crmSmsReachouts > 0 ? ((crmSmsReplies / crmSmsReachouts) * 100).toFixed(1) : '0';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'relative' }}>
            {loading && <BennettLoader />}

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

                {/* ── Section 3: Bennett Bootcamps (CRM) ── */}
                <BusinessSection
                    title="Bennett Bootcamps"
                    icon={<img src="/bootcamps.png" className="w-3 h-3 object-contain" alt="" />}
                    iconBg="rgba(230,126,34,0.15)"
                    iconColor="#f59e0b"
                    loading={loading}
                    metrics={[
                        { title: "Total Leads", value: totalLeadsCRM.toLocaleString(), subLabel: "All time", accentColor: "#6366f1", icon: <Users size={16} /> },
                        { title: "Emails Sent", value: totalEmailsSentCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#22c55e", icon: <Mail size={16} /> },
                        { title: "WA Reachouts", value: totalWaReachoutsCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#06b6d4", icon: <MessageCircle size={16} /> },
                        { title: "Voice Calls", value: totalVoiceCallsCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#f59e0b", icon: <Phone size={16} /> },
                        { title: "WA Replies", value: totalWaRepliesCRM.toLocaleString(), subLabel: `${replyRateCRM}% reply rate`, subLabelColor: Number(replyRateCRM) > 0 ? '#a78bfa' : 'var(--label-tertiary)', accentColor: "#a78bfa", icon: <MessageCircle size={16} /> },
                    ]}
                />

                {/* ── Section 4: Bennett Realty Solutions (CRM) ── */}
                <BusinessSection
                    title="Bennett Realty Solutions"
                    icon={<img src="/realty.png" className="w-3 h-3 object-contain" alt="" />}
                    iconBg="rgba(59,91,219,0.15)"
                    iconColor="#6366f1"
                    loading={loading}
                    metrics={[
                        { title: "Total Leads", value: totalLeadsCRM.toLocaleString(), subLabel: "All time", accentColor: "#6366f1", icon: <Users size={16} /> },
                        { title: "Emails Sent", value: totalEmailsSentCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#22c55e", icon: <Mail size={16} /> },
                        { title: "WA Reachouts", value: totalWaReachoutsCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#06b6d4", icon: <MessageCircle size={16} /> },
                        { title: "Voice Calls", value: totalVoiceCallsCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#f59e0b", icon: <Phone size={16} /> },
                        { title: "WA Replies", value: totalWaRepliesCRM.toLocaleString(), subLabel: `${replyRateCRM}% reply rate`, subLabelColor: Number(replyRateCRM) > 0 ? '#a78bfa' : 'var(--label-tertiary)', accentColor: "#a78bfa", icon: <MessageCircle size={16} /> },
                    ]}
                />

                {/* ── Section 5: Bennett Wealth Builders Foundation (Generated) ── */}
                <BusinessSection
                    title="Bennett Wealth Builders Foundation"
                    icon={<img src="/wealth.png" className="w-3 h-3 object-contain" alt="" />}
                    iconBg="rgba(15,157,88,0.15)"
                    iconColor="#22c55e"
                    loading={loading}
                    metrics={[
                        { title: "Total Leads", value: totalLeadsGen.toLocaleString(), subLabel: "All time", accentColor: "#6366f1", icon: <Users size={16} /> },
                        { title: "Emails Sent", value: totalEmailsSentGen.toLocaleString(), subLabel: "Real-time", accentColor: "#22c55e", icon: <Mail size={16} /> },
                        { title: "WA Reachouts", value: totalWaReachoutsGen.toLocaleString(), subLabel: "Real-time", accentColor: "#06b6d4", icon: <MessageCircle size={16} /> },
                        { title: "Voice Calls", value: totalVoiceCallsGen.toLocaleString(), subLabel: "Real-time", accentColor: "#f59e0b", icon: <Phone size={16} /> },
                        { title: "WA Replies", value: totalWaRepliesGen.toLocaleString(), subLabel: `${replyRateGen}% reply rate`, subLabelColor: Number(replyRateGen) > 0 ? '#a78bfa' : 'var(--label-tertiary)', accentColor: "#a78bfa", icon: <MessageCircle size={16} /> },
                    ]}
                />



            {/* ── Expanded Replies ── */}
            {isRepliesExpanded && (
                <div
                    className="liquid-card"
                    style={{ padding: 24, animation: 'spring-in 280ms var(--ease-spring)' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                            <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)', marginBottom: 3 }}>
                                Total Replies Details
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--label-secondary)' }}>Detailed view of all replies</p>
                        </div>
                        <button
                            onClick={() => setIsRepliesExpanded(false)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 12px', borderRadius: 8,
                                background: 'var(--fill-tertiary)', border: 'none',
                                cursor: 'default', fontSize: 13, fontWeight: 500,
                                color: 'var(--label-secondary)',
                            }}
                        >
                            <X size={13} /> Close
                        </button>
                    </div>
                    <TotalRepliesView
                        leads={waReplyLeads}
                        dateRange={dateRange}
                        onViewLead={lead => { setIsRepliesExpanded(false); setChatLead(lead); }}
                    />
                </div>
            )}

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

                    {/* Response Performance Donut */}
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
                                <p style={{ fontSize: 12, color: 'var(--label-tertiary)' }}>Response performance</p>
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

            {/* ── Replies Modal ── */}
            <Dialog open={isRepliesModalOpen} onOpenChange={setIsRepliesModalOpen}>
                <DialogContent className="apple-dialog max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Total Replies — Detailed View</DialogTitle>
                    </DialogHeader>
                    <div style={{ paddingTop: 16 }}>
                        <TotalRepliesView
                            leads={waReplyLeads}
                            dateRange={dateRange}
                            onViewLead={lead => { setIsRepliesModalOpen(false); setChatLead(lead); }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── WhatsApp Chat Modal ── */}
            <Dialog open={!!chatLead} onOpenChange={open => { if (!open) setChatLead(null); }}>
                <DialogContent className="apple-dialog max-w-4xl max-h-[90vh] overflow-hidden p-6 gap-0">
                    <DialogHeader className="sr-only"><DialogTitle>WhatsApp Chat</DialogTitle></DialogHeader>
                    {chatLead && (
                        <WhatsAppChatDetail
                            customerId={String(chatLead["Lead ID"] || chatLead.id || "")}
                            initialLead={chatLead}
                            onClose={() => setChatLead(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}
