"use client";

import {
    Users, Mail, MessageCircle, Phone, TrendingUp, PieChart as PieChartIcon,
    Activity, Maximize2, Minimize2, X, Expand, Info, Wallet, LayoutDashboard, Mic, MessageSquare,
    Home, Coins, Crown, GraduationCap
} from "lucide-react";
import {
    Tooltip as UITooltip, TooltipContent as UITooltipContent,
    TooltipProvider as UITooltipProvider, TooltipTrigger as UITooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TotalRepliesView } from "@/components/dashboard/total-replies-view";
import { WhatsAppChatDetail } from "@/components/dashboard/whatsapp-chat-detail";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { BennettLoader } from "@/components/bennett-loader";
import { useData } from "@/context/DataContext";
import { MaqsamBalanceDetail } from "@/components/dashboard/maqsam-balance-detail";

/* ── Wallet Modal ── */
function WalletModal({ isOpen, onClose, type, details, calls }: any) {
    const vapiAgentUsed = useMemo(() => {
        if (!calls || !Array.isArray(calls)) return 0;
        return calls.filter((c: any) => c.source === 'vapi').reduce((acc: number, call: any) => acc + (call.breakdown?.agent || 0), 0);
    }, [calls]);

    const titles: Record<string, string> = {
        vapi: 'Vapi Wallet',
        maqsam: 'Maqsam Telephony', twilio: 'Twilio Account',
    };

    const accentColors: Record<string, string> = {
        vapi: '#3B5BDB', maqsam: '#40CBE0', twilio: '#FF453A',
    };
    const accent = accentColors[type] || '#3B5BDB';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={type === 'maqsam' ? "sm:max-w-[550px]" : "sm:max-w-[400px]"}>
                <DialogHeader>
                    <DialogTitle style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                        {titles[type]}
                    </DialogTitle>
                </DialogHeader>
                <div style={{ paddingTop: 8 }}>
                    {type === 'vapi' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{
                                background: `${accent}0F`,
                                borderRadius: 16,
                                padding: '28px 24px',
                                textAlign: 'center',
                                outline: `1px solid ${accent}22`,
                                outlineOffset: -1,
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--label-tertiary)', marginBottom: 8 }}>
                                    Vapi Credits Used
                                </div>
                                <div style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em', color: accent, fontVariantNumeric: 'tabular-nums' }}>
                                    ${vapiAgentUsed.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    )}
                    {type === 'twilio' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{
                                background: `${accent}0F`, borderRadius: 16, padding: '24px',
                                textAlign: 'center', outline: `1px solid ${accent}22`, outlineOffset: -1,
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--label-tertiary)', marginBottom: 8 }}>
                                    Remaining Balance
                                </div>
                                <div style={{ fontSize: 40, fontWeight: 300, letterSpacing: '-0.03em', color: accent, fontVariantNumeric: 'tabular-nums' }}>
                                    {typeof details?.balance === 'number' ? `$${details.balance.toFixed(2)}` : '—'}
                                </div>
                            </div>
                        </div>
                    )}
                    {type === 'maqsam' && (
                        <MaqsamBalanceDetail initialBalance={details} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ── Liquid Glass Metric Tile ── */
function MetricTile({
    title, value, subLabel, subLabelColor = 'rgba(255,255,255,0.28)', accentColor,
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
            style={{
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.09)',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                cursor: onClick ? 'pointer' : undefined,
                transition: 'transform 150ms ease',
                position: 'relative',
                zIndex: 1,
            }}
            onClick={onClick}
            onMouseEnter={e => {
                if (onClick) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
                if (onClick) e.currentTarget.style.transform = 'none';
            }}
        >
            {/* Row: label on left, icon on right */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontWeight: 400 }}>
                    {title}
                </span>
                <div style={{ color: accentColor, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
            </div>

            {/* Large number */}
            <div style={{ fontSize: 22, fontWeight: 500, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                {value}
            </div>

            {/* Sub-label */}
            <div style={{ fontSize: 10, fontWeight: 400, color: subLabelColor }}>
                {subLabel}
            </div>
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
                <h2 style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                    {title}
                </h2>
                <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', width: '100%', marginLeft: 8 }} />
            </div>

            {/* Grid Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 8,
            }}>
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
    const [dateRange, setDateRange] = useState<any>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });
    const [walletModal, setWalletModal] = useState<{ isOpen: boolean; type: 'vapi' | 'maqsam' | 'twilio' }>({
        isOpen: false, type: 'vapi',
    });

    const { masterMetrics, loadingMasterMetrics, refreshMasterMetrics, calls, maqsamBalance, twilioBalance } = useData();
    
    const walletChips = [
        { type: 'vapi' as const, icon: <Mic size={13} />, color: '#3B5BDB' },
        { type: 'twilio' as const, icon: <MessageCircle size={13} />, color: '#FF453A' },
        { type: 'maqsam' as const, icon: <Wallet size={13} />, color: '#40CBE0' },
    ];
    const router = useRouter();

    useEffect(() => {
        if (!dateRange?.from) return;
        refreshMasterMetrics({ from: dateRange.from, to: dateRange.to || dateRange.from });
    }, [dateRange, refreshMasterMetrics]);

    /* WA stats */
    const [waUniqueSent, setWaUniqueSent] = useState<number | null>(null);
    const [waReplies, setWaReplies] = useState<number | null>(null);
    const [waReplyLeads, setWaReplyLeads] = useState<any[]>([]);

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

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let pulse = 0;
        let scanLines = [0, 120, 240];

        const resizeCanvas = () => {
            canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
            canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const animate = () => {
            pulse += 0.008;
            const W = canvas.width;
            const H = canvas.height;

            // Clear background
            ctx.fillStyle = '#040812';
            ctx.fillRect(0, 0, W, H);

            const vp = { x: W / 2, y: -H * 0.3 };
            const baseAlpha = 0.06 + Math.sin(pulse) * 0.04;

            // 1. VERTICAL LINES (converging)
            const numLines = 15;
            ctx.strokeStyle = `rgba(99, 102, 241, ${baseAlpha})`;
            ctx.lineWidth = 0.6;
            for (let i = 0; i < numLines; i++) {
                const xBottom = (W / (numLines - 1)) * i;
                ctx.beginPath();
                ctx.moveTo(vp.x, vp.y);
                ctx.lineTo(xBottom, H);
                ctx.stroke();
            }

            // 2. HORIZONTAL LINES (perspective foreshortening)
            const rows = 10;
            ctx.lineWidth = 0.5;
            for (let j = 1; j <= rows; j++) {
                const frac = j / rows;
                const ty = vp.y + (H - vp.y) * Math.pow(frac, 0.7);
                if (ty < 0) continue;

                const rowAlpha = baseAlpha * Math.pow(frac, 0.5);
                ctx.strokeStyle = `rgba(99, 102, 241, ${rowAlpha})`;

                const spread = 0.05 + frac * 0.95;
                const x1 = vp.x - (W / 2) * spread;
                const x2 = vp.x + (W / 2) * spread;

                ctx.beginPath();
                ctx.moveTo(x1, ty);
                ctx.lineTo(x2, ty);
                ctx.stroke();
            }

            // 3. HORIZONTAL SCAN PULSES
            for (let i = 0; i < scanLines.length; i++) {
                scanLines[i] += 0.3;
                if (scanLines[i] > H) {
                    scanLines[i] = 0;
                }
                const sy = scanLines[i];
                const grad = ctx.createLinearGradient(0, sy - 20, 0, sy + 20);
                grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
                grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.10)');
                grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, sy - 20, W, 40);
            }

            // 4. VIGNETTE
            const vigGrad = ctx.createLinearGradient(0, 0, 0, H);
            vigGrad.addColorStop(0, 'rgba(4, 8, 18, 0.0)');
            vigGrad.addColorStop(1, 'rgba(4, 8, 18, 0.55)');
            ctx.fillStyle = vigGrad;
            ctx.fillRect(0, 0, W, H);

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        // Run double check resize after page load to align height
        setTimeout(resizeCanvas, 500);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [loading]);

    // Segmented Metrics Calculations
    const crmSmsReachouts = Math.max(0, totalSmsReachouts - smsOwnerReachouts);
    const crmSmsReplies = Math.max(0, totalSmsReplies - smsOwnerReplies);
    const crmSmsReplyRate = crmSmsReachouts > 0 ? ((crmSmsReplies / crmSmsReachouts) * 100).toFixed(1) : '0';

    return (
        <div style={{
            position: 'relative',
            background: '#040812',
            minHeight: '100%',
            margin: '-24px -24px 0 -24px',
            padding: '24px 24px 40px 24px',
            overflow: 'hidden',
        }}>
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 0,
                    pointerEvents: 'none',
                }}
            />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 28 }}>
                {loading && <BennettLoader />}

                {/* ── Page Header / Topbar ── */}
                <div style={{
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'transparent',
                }}>
                    <div>
                        <h1 style={{ fontSize: 16, fontWeight: 500, color: '#f1f5f9', margin: 0, lineHeight: 1.2 }}>
                            Master Overview
                        </h1>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0 0' }}>
                            Holistic view of all your marketing channels performance
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Date Range Pill */}
                        <div style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '0.5px solid rgba(255,255,255,0.10)',
                            borderRadius: '8px',
                            padding: '2px 4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}>
                            <DateRangePicker onUpdate={({ range }) => setDateRange(range)} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '6px 8px', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.10)' }}>
                            {walletChips.map(chip => (
                                <button
                                    key={chip.type}
                                    onClick={() => setWalletModal({ isOpen: true, type: chip.type })}
                                    className="wallet-chip"
                                    title={`View ${chip.type} wallet`}
                                    style={{ background: 'transparent', border: 'none', padding: '2px 6px' }}
                                >
                                    <span style={{ color: chip.color }}>{chip.icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Section 3: Bennett Bootcamps (CRM) ── */}
                <BusinessSection
                    title="Bennett Bootcamps"
                    icon={<GraduationCap size={11} />}
                    iconBg="rgba(230,126,34,0.15)"
                    iconColor="#f59e0b"
                    loading={loading}
                    metrics={[
                        { title: "Total Leads", value: totalLeadsCRM.toLocaleString(), subLabel: "All time", accentColor: "#6366f1", icon: <Users size={16} /> },
                        { title: "Emails Sent", value: "—", subLabel: "Real-time", accentColor: "#22c55e", icon: <Mail size={16} /> },
                        { title: "WA Reachouts", value: totalWaReachoutsCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#06b6d4", icon: <MessageCircle size={16} /> },
                        { title: "SMS Reachouts", value: crmSmsReachouts.toLocaleString(), subLabel: "Real-time", accentColor: "#ec4899", icon: <MessageSquare size={16} /> },
                        { title: "Voice Calls", value: totalVoiceCallsCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#f59e0b", icon: <Phone size={16} /> },
                        { title: "WA Replies", value: totalWaRepliesCRM.toLocaleString(), subLabel: `${replyRateCRM}% reply rate`, subLabelColor: Number(replyRateCRM) > 0 ? '#a78bfa' : 'rgba(255,255,255,0.28)', accentColor: "#a78bfa", icon: <MessageCircle size={16} /> },
                        { title: "SMS Replies", value: crmSmsReplies.toLocaleString(), subLabel: `${crmSmsReplyRate}% reply rate`, subLabelColor: Number(crmSmsReplyRate) > 0 ? '#ec4899' : 'rgba(255,255,255,0.28)', accentColor: "#ec4899", icon: <MessageSquare size={16} /> },
                    ]}
                />

                {/* ── Section 4: Bennett Realty Solutions (CRM) ── */}
                <BusinessSection
                    title="Bennett Realty Solutions"
                    icon={<Home size={11} />}
                    iconBg="rgba(59,91,219,0.15)"
                    iconColor="#6366f1"
                    loading={loading}
                    metrics={[
                        { title: "Total Leads", value: totalLeadsCRM.toLocaleString(), subLabel: "All time", accentColor: "#6366f1", icon: <Users size={16} /> },
                        { title: "Emails Sent", value: "—", subLabel: "Real-time", accentColor: "#22c55e", icon: <Mail size={16} /> },
                        { title: "WA Reachouts", value: totalWaReachoutsCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#06b6d4", icon: <MessageCircle size={16} /> },
                        { title: "SMS Reachouts", value: crmSmsReachouts.toLocaleString(), subLabel: "Real-time", accentColor: "#ec4899", icon: <MessageSquare size={16} /> },
                        { title: "Voice Calls", value: totalVoiceCallsCRM.toLocaleString(), subLabel: "Real-time", accentColor: "#f59e0b", icon: <Phone size={16} /> },
                        { title: "WA Replies", value: totalWaRepliesCRM.toLocaleString(), subLabel: `${replyRateCRM}% reply rate`, subLabelColor: Number(replyRateCRM) > 0 ? '#a78bfa' : 'rgba(255,255,255,0.28)', accentColor: "#a78bfa", icon: <MessageCircle size={16} /> },
                        { title: "SMS Replies", value: crmSmsReplies.toLocaleString(), subLabel: `${crmSmsReplyRate}% reply rate`, subLabelColor: Number(crmSmsReplyRate) > 0 ? '#ec4899' : 'rgba(255,255,255,0.28)', accentColor: "#ec4899", icon: <MessageSquare size={16} /> },
                    ]}
                />

                {/* ── Section 5: Bennett Wealth Builder (Generated) ── */}
                <BusinessSection
                    title="Bennett Wealth Builder"
                    icon={<Coins size={11} />}
                    iconBg="rgba(15,157,88,0.15)"
                    iconColor="#22c55e"
                    loading={loading}
                    metrics={[
                        { title: "Total Leads", value: totalLeadsGen.toLocaleString(), subLabel: "All time", accentColor: "#6366f1", icon: <Users size={16} /> },
                        { title: "Emails Sent", value: "—", subLabel: "Real-time", accentColor: "#22c55e", icon: <Mail size={16} /> },
                        { title: "WA Reachouts", value: totalWaReachoutsGen.toLocaleString(), subLabel: "Real-time", accentColor: "#06b6d4", icon: <MessageCircle size={16} /> },
                        { title: "SMS Reachouts", value: smsOwnerReachouts.toLocaleString(), subLabel: "Real-time", accentColor: "#ec4899", icon: <MessageSquare size={16} /> },
                        { title: "Voice Calls", value: totalVoiceCallsGen.toLocaleString(), subLabel: "Real-time", accentColor: "#f59e0b", icon: <Phone size={16} /> },
                        { title: "WA Replies", value: totalWaRepliesGen.toLocaleString(), subLabel: `${replyRateGen}% reply rate`, subLabelColor: Number(replyRateGen) > 0 ? '#a78bfa' : 'rgba(255,255,255,0.28)', accentColor: "#a78bfa", icon: <MessageCircle size={16} /> },
                        { title: "SMS Replies", value: smsOwnerReplies.toLocaleString(), subLabel: `${smsReplyRateGen}% reply rate`, subLabelColor: Number(smsReplyRateGen) > 0 ? '#ec4899' : 'rgba(255,255,255,0.28)', accentColor: "#ec4899", icon: <MessageSquare size={16} /> },
                    ]}
                />

                {/* ── Section 6: Platinum & Elite Coaching (Generated) ── */}
                <BusinessSection
                    title="Platinum & Elite Coaching"
                    icon={<Crown size={11} />}
                    iconBg="rgba(175,82,222,0.15)"
                    iconColor="#a78bfa"
                    loading={loading}
                    metrics={[
                        { title: "Total Leads", value: totalLeadsGen.toLocaleString(), subLabel: "All time", accentColor: "#6366f1", icon: <Users size={16} /> },
                        { title: "Emails Sent", value: "—", subLabel: "Real-time", accentColor: "#22c55e", icon: <Mail size={16} /> },
                        { title: "WA Reachouts", value: totalWaReachoutsGen.toLocaleString(), subLabel: "Real-time", accentColor: "#06b6d4", icon: <MessageCircle size={16} /> },
                        { title: "SMS Reachouts", value: smsOwnerReachouts.toLocaleString(), subLabel: "Real-time", accentColor: "#ec4899", icon: <MessageSquare size={16} /> },
                        { title: "Voice Calls", value: totalVoiceCallsGen.toLocaleString(), subLabel: "Real-time", accentColor: "#f59e0b", icon: <Phone size={16} /> },
                        { title: "WA Replies", value: totalWaRepliesGen.toLocaleString(), subLabel: `${replyRateGen}% reply rate`, subLabelColor: Number(replyRateGen) > 0 ? '#a78bfa' : 'rgba(255,255,255,0.28)', accentColor: "#a78bfa", icon: <MessageCircle size={16} /> },
                        { title: "SMS Replies", value: smsOwnerReplies.toLocaleString(), subLabel: `${smsReplyRateGen}% reply rate`, subLabelColor: Number(smsReplyRateGen) > 0 ? '#ec4899' : 'rgba(255,255,255,0.28)', accentColor: "#ec4899", icon: <MessageSquare size={16} /> },
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
            </div>

            {/* ── Replies Modal ── */}
            <Dialog open={isRepliesModalOpen} onOpenChange={setIsRepliesModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-6 gap-0">
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

            {/* ── Wallet Modal ── */}
            <WalletModal isOpen={walletModal.isOpen} type={walletModal.type} onClose={() => setWalletModal({ ...walletModal, isOpen: false })} details={walletModal.type === 'twilio' ? twilioBalance : maqsamBalance} calls={calls} />
        </div>
    );
}
