"use client";

import { BennettLoader } from "@/components/bennett-loader";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    RefreshCw,
    Mail,
    AlertCircle,
    Info,
    ChevronUp,
    ChevronDown,
    ArrowUp,
    Search
} from "lucide-react";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useData } from "@/context/DataContext";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface BounceEmail {
    email: string;
    type: string;
    from: string;
    date: string;
}

interface BounceSummary {
    total_bounces: number;
    hard_bounces: number;
    soft_bounces: number;
    technical_bounces: number;
}

export default function BouncedEmailsPage() {
    const [bounces, setBounces] = useState<BounceEmail[]>([]);
    const [summary, setSummary] = useState<BounceSummary>({ total_bounces: 0, hard_bounces: 0, soft_bounces: 0, technical_bounces: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const { dateRange, setDateRange } = useData();

    const fetchBounces = async () => {
        setLoading(true);
        setError(null);
        try {
            // Removed Instantly API fetch as requested
            setSummary({ total_bounces: 0, hard_bounces: 0, soft_bounces: 0, technical_bounces: 0 });
            setBounces([]);
        } catch (e: any) {
            console.error("Bounces fetch error", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBounces(); }, []);

    const filteredBounces = bounces.filter(b => {
        const matchesSearch = b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.from.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (dateRange?.from) {
            const bd = b.date && b.date !== "Unknown" ? new Date(b.date) : null;
            if (!bd || isNaN(bd.getTime())) return false;
            const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
            const to = dateRange.to ? new Date(dateRange.to) : new Date(from); to.setHours(23, 59, 59, 999);
            if (bd < from || bd > to) return false;
        }
        return true;
    });

    return (
        <TooltipProvider>
            <div className="space-y-5 pb-10 relative min-h-[500px]">
                {loading && <BennettLoader />}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle style={{ width: 14, height: 14 }} />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Bounced Emails</h1>
                        <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Review hard and soft email bounces</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <DateRangePicker value={dateRange as any} onUpdate={r => setDateRange(r.range)} />
                        <button
                            onClick={() => fetchBounces()}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default' }}
                        >
                            <RefreshCw style={{ width: 14, height: 14 }} />
                        </button>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard title="Total Bounces" value={summary.total_bounces.toString()} color="var(--label-primary)" />
                    <StatCard title="Hard Bounces" value={summary.hard_bounces.toString()} color="var(--red)" tooltip="Permanent failures. Remove these contacts." />
                    <StatCard title="Soft Bounces" value={summary.soft_bounces.toString()} color="var(--orange)" tooltip="Temporary failures. Worth retrying later." />
                    <StatCard title="Technical Bounces" value={summary.technical_bounces.toString()} color="var(--yellow, #FFD60A)" tooltip="Failures due to connection or server issues." />
                </div>

                {/* Search */}
                <div className="liquid-card" style={{ padding: '12px 14px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--label-tertiary)' }} />
                        <Input
                            style={{ paddingLeft: 30, height: 36, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', fontSize: 12, borderRadius: 'var(--radius-md)' }}
                            placeholder="Search by recipient email or sender..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Bounce List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {!loading && filteredBounces.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--label-tertiary)', border: '1px dashed var(--hairline)', borderRadius: 'var(--radius-xl)', fontSize: 13 }}>
                            No bounces found.
                        </div>
                    ) : (
                        filteredBounces.map((bounce, index) => <BounceCard key={index} bounce={bounce} />)
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}

function StatCard({ title, value, color, tooltip }: any) {
    return (
        <div className="liquid-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
                {tooltip && (
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <span style={{ cursor: 'help', display: 'flex' }}>
                                <Info style={{ width: 11, height: 11, color: 'var(--label-quaternary)' }} />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p style={{ maxWidth: 200, fontSize: 11 }}>{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            <span style={{ fontSize: 24, fontWeight: 700, color: color || 'var(--label-primary)', letterSpacing: 'var(--ls-metric)' }}>{value}</span>
        </div>
    );
}

function BounceCard({ bounce }: { bounce: BounceEmail }) {
    const [isOpen, setIsOpen] = useState(false);

    let badgeBg = 'var(--fill-tertiary)';
    let badgeColor = 'var(--label-secondary)';
    if (bounce.type?.toLowerCase().includes("hard")) { badgeBg = 'rgba(255,69,58,0.10)'; badgeColor = 'var(--red)'; }
    else if (bounce.type?.toLowerCase().includes("soft")) { badgeBg = 'rgba(255,159,10,0.12)'; badgeColor = 'var(--orange)'; }
    else if (bounce.type?.toLowerCase().includes("tech")) { badgeBg = 'rgba(255,214,10,0.12)'; badgeColor = '#A0860A'; }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
            <CollapsibleTrigger asChild>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, background: 'rgba(255,69,58,0.08)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,69,58,0.15)' }}>
                        <Mail style={{ width: 15, height: 15, color: 'var(--red)' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 12 }}>
                        <div>
                            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bounce.email}</h4>
                            <p style={{ fontSize: 11, color: 'var(--label-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>From: {bounce.from}</p>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, background: badgeBg, color: badgeColor, whiteSpace: 'nowrap' }}>
                            {bounce.type}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--label-tertiary)', whiteSpace: 'nowrap' }}>{bounce.date}</span>
                    </div>

                    <div style={{ flexShrink: 0, color: 'var(--label-tertiary)' }}>
                        {isOpen ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--hairline)', background: 'var(--fill-quaternary)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--label-secondary)', background: 'none', border: 'none', cursor: 'default' }}>
                        View Campaign <ArrowUp style={{ width: 11, height: 11, transform: 'rotate(45deg)' }} />
                    </button>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
