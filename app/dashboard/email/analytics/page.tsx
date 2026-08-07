"use client";

import { useEffect, useState, useMemo } from "react";
import { BennettLoader } from "@/components/bennett-loader";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Send,
    Eye,
    MessageSquare,
    AlertTriangle,
    UserMinus,
    Link2,
    Target,
    DollarSign,
    RefreshCw,
} from "lucide-react";
import { AGENT_OPTIONS, AgentKey } from "@/lib/agents";
import { AgentBadge } from "@/components/agents/agent-badge";
import type { NormalizedCampaignAnalytics } from "@/lib/email-utils";

interface OverviewResponse {
    byAgent: Record<string, { campaigns: NormalizedCampaignAnalytics[]; totals: Record<string, number> }>;
    grandTotals: Record<string, number>;
}

export default function EmailAnalyticsPage() {
    const [data, setData] = useState<OverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [agentFilter, setAgentFilter] = useState<AgentKey | "all">("all");

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/email/analytics/campaigns');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error('Error fetching campaign analytics', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const { totals, campaigns } = useMemo(() => {
        if (!data) return { totals: null as Record<string, number> | null, campaigns: [] as NormalizedCampaignAnalytics[] };

        if (agentFilter === "all") {
            const allCampaigns = Object.values(data.byAgent).flatMap(a => a.campaigns);
            return { totals: data.grandTotals, campaigns: allCampaigns };
        }

        const agentData = data.byAgent[agentFilter];
        return { totals: agentData?.totals || null, campaigns: agentData?.campaigns || [] };
    }, [data, agentFilter]);

    const openRate = totals && totals.emailsSentCount > 0 ? (totals.openCountUnique / totals.emailsSentCount) * 100 : 0;
    const replyRate = totals && totals.emailsSentCount > 0 ? (totals.replyCountUnique / totals.emailsSentCount) * 100 : 0;

    return (
        <div className="space-y-6 pb-10 relative min-h-[500px]">
            {loading && <BennettLoader />}

            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Email Analytics</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Campaign performance across all outreach channels.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v as AgentKey | "all")}>
                        <SelectTrigger style={{ width: 190, height: 36, fontSize: 13, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                            <SelectValue placeholder="Agent" />
                        </SelectTrigger>
                        <SelectContent className="apple-dialog">
                            <SelectItem value="all">All Agents</SelectItem>
                            {AGENT_OPTIONS.map(a => (
                                <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchAnalytics} className="border-[var(--glass-border)] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] text-[var(--label-primary)] h-9">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Metric Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Total Sent" value={(totals?.emailsSentCount ?? 0).toLocaleString()} icon={Send} color="var(--blue)" />
                <MetricCard label="Opened (Unique)" value={(totals?.openCountUnique ?? 0).toLocaleString()} subtext={`${openRate.toFixed(1)}% rate`} icon={Eye} color="var(--purple)" />
                <MetricCard label="Replied (Unique)" value={(totals?.replyCountUnique ?? 0).toLocaleString()} subtext={`${replyRate.toFixed(1)}% rate`} icon={MessageSquare} color="var(--green)" />
                <MetricCard label="Bounced" value={(totals?.bouncedCount ?? 0).toLocaleString()} icon={AlertTriangle} color="var(--orange)" />
                <MetricCard label="Unsubscribed" value={(totals?.unsubscribedCount ?? 0).toLocaleString()} icon={UserMinus} color="var(--red)" />
                <MetricCard label="Link Clicks (Unique)" value={(totals?.linkClickCountUnique ?? 0).toLocaleString()} icon={Link2} color="var(--cyan)" />
                <MetricCard label="Opportunities" value={(totals?.totalOpportunities ?? 0).toLocaleString()} icon={Target} color="var(--label-secondary)" />
                <MetricCard label="Opportunity Value" value={`$${(totals?.totalOpportunityValue ?? 0).toLocaleString()}`} icon={DollarSign} color="var(--green)" />
            </div>

            {/* Campaigns Table */}
            <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--separator)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--label-primary)' }}>Campaigns</h2>
                    <p style={{ fontSize: 12, color: 'var(--label-secondary)', marginTop: 2 }}>Real-time performance from Instantly campaign analytics.</p>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <TableRow className="bg-[var(--fill-quaternary)] border-none hover:bg-[var(--fill-quaternary)]">
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Campaign</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Agent</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Status</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Sent</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Opened %</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Replied %</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Bounced</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Unsubscribed</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Opportunities</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!loading && campaigns.length === 0 ? (
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableCell colSpan={9} className="h-24 text-center text-[var(--label-secondary)]">
                                        No campaigns found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                campaigns.map((c) => {
                                    const openPct = c.emailsSentCount > 0 ? (c.openCountUnique / c.emailsSentCount) * 100 : 0;
                                    const replyPct = c.emailsSentCount > 0 ? (c.replyCountUnique / c.emailsSentCount) * 100 : 0;
                                    return (
                                        <TableRow key={c.campaignId} className="hover:bg-[var(--fill-quaternary)] border-b border-[var(--separator)] transition-colors">
                                            <TableCell className="font-medium text-[var(--label-primary)]">{c.campaignName || 'Unnamed Campaign'}</TableCell>
                                            <TableCell><AgentBadge agent={c.agent} /></TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{c.campaignStatus || '—'}</TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{c.emailsSentCount.toLocaleString()}</TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{openPct.toFixed(1)}%</TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{replyPct.toFixed(1)}%</TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{c.bouncedCount.toLocaleString()}</TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">{c.unsubscribedCount.toLocaleString()}</TableCell>
                                            <TableCell className="text-sm text-[var(--label-secondary)]">
                                                {c.totalOpportunities.toLocaleString()}
                                                {c.totalOpportunityValue > 0 && ` ($${c.totalOpportunityValue.toLocaleString()})`}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
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
