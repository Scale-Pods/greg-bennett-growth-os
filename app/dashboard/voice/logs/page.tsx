"use client";

import { RefreshCw, ChevronLeft, ChevronRight, User, Download, Search, Info, Activity } from "lucide-react";
import { BennettLoader } from "@/components/bennett-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { CallDetailsModal } from "@/components/voice/call-details-modal";
import { format, startOfDay, endOfDay } from "date-fns";
import { formatDuration } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { DateRangePicker } from "@/components/ui/date-range-picker";

const AGENTS = [
    { key: "recruiting", label: "Recruiting", color: "#3b5bdb" },
    { key: "coaching", label: "Coaching", color: "#22c55e" },
    { key: "investor", label: "Investor", color: "#f59e0b" },
    { key: "biglife", label: "BigLife", color: "#0f9d58" },
    { key: "bootcampsNew", label: "Bootcamps New Leads", color: "#e67e22" },
    { key: "bootcampsFollowup", label: "Bootcamps Follow-up", color: "#d6336c" },
] as const;

type AgentKey = typeof AGENTS[number]["key"];

const AGENT_MAP: Record<string, { label: string; color: string }> = Object.fromEntries(
    AGENTS.map(a => [a.key, { label: a.label, color: a.color }])
);

const selectTriggerStyle: React.CSSProperties = {
    height: 34, fontSize: 12, background: 'var(--fill-tertiary)',
    border: '1px solid var(--glass-border)', color: 'var(--label-primary)',
    borderRadius: 'var(--radius-md)',
};

function AgentBadge({ agent }: { agent: string }) {
    const cfg = AGENT_MAP[agent];
    if (!cfg) return <span style={{ fontSize: 11, color: 'var(--label-tertiary)' }}>—</span>;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 'var(--radius-xs)',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            background: `${cfg.color}1A`, color: cfg.color,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            {cfg.label}
        </span>
    );
}

const DynamicRowCells = ({ call, leads }: { call: any, leads: any[] }) => {
    let guestName = call.name || "Guest";
    const guestNum = call.phone || "Unknown";
    const callType = call.status === 'in-progress' ? 'Ongoing' : (call.voiceCallStatus || call.status || 'Unknown');

    if ((!guestName || guestName === "Guest" || guestName === "Unknown") && call.phone && leads) {
        const targetPhone = call.phone.replace(/\D/g, '');
        if (targetPhone && targetPhone.length > 5) {
            const foundLead = leads.find((l: any) => l.phone && l.phone.replace(/\D/g, '') === targetPhone);
            if (foundLead && foundLead.name) guestName = foundLead.name;
        }
    }

    return (
        <>
            <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User style={{ width: 12, height: 12, color: 'var(--label-tertiary)', flexShrink: 0 }} />
                    {guestName}
                </div>
            </td>
            <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', color: 'var(--label-secondary)' }}>{guestNum}</td>
            <td style={{ padding: '10px 14px' }}>
                <AgentBadge agent={call.agent} />
            </td>
            <td style={{ padding: '10px 14px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(59,91,219,0.10)', color: 'var(--blue)' }}>
                    {callType}
                </span>
            </td>
            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--label-secondary)', fontWeight: 500 }}>{formatDuration(call.durationSeconds)}</td>
            <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
                <Popover>
                    <PopoverTrigger asChild>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'help', color: 'var(--green)', fontSize: 12, fontWeight: 700 }} onClick={(e) => e.stopPropagation()}>
                            ${Number(call.totalCost ?? call.cost ?? 0).toFixed(3)}
                            <Info style={{ width: 11, height: 11, color: 'var(--label-quaternary)' }} />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent style={{ width: 220, padding: 14, background: 'var(--glass-fill)', backdropFilter: 'blur(60px) saturate(180%)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--glass-shadow)' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--hairline)', paddingBottom: 8 }}>
                                <Activity style={{ width: 14, height: 14, color: 'var(--blue)' }} />
                                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--label-primary)' }}>Cost Breakdown</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--label-secondary)' }}>
                                    <span>Agent (Vapi):</span>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--label-primary)' }}>${Number(call.cost || 0).toFixed(3)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--label-secondary)' }}>
                                    <span>Telephony (Twilio):</span>
                                    {call.telephonyCost === null || call.telephonyCost === undefined ? (
                                        <span style={{ fontFamily: 'monospace', color: 'var(--label-tertiary)', fontStyle: 'italic' }}>no match</span>
                                    ) : (
                                        <span style={{ fontFamily: 'monospace', color: 'var(--label-primary)' }}>${Number(call.telephonyCost).toFixed(3)}</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--label-primary)' }}>
                                <span>Total:</span>
                                <span style={{ color: 'var(--green)' }}>${Number(call.totalCost ?? call.cost ?? 0).toFixed(3)}</span>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </td>
        </>
    );
};

export default function VoiceLogsPage() {
    const { leads, loadingLeads, dateRange, setDateRange } = useData();
    const [allCallsMapped, setAllCallsMapped] = useState<any[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [agent, setAgent] = useState<AgentKey | "all">("all");
    const [phoneFilter, setPhoneFilter] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [exporting, setExporting] = useState(false);

    const fetchCallsForAgents = useCallback(async () => {
        if (!dateRange?.from) return;
        setLoading(true);
        try {
            const from = startOfDay(dateRange.from).toISOString();
            const to = endOfDay(dateRange.to || dateRange.from).toISOString();
            const agentsToFetch = agent === "all" ? AGENTS.map(a => a.key) : [agent];

            const results = await Promise.all(
                agentsToFetch.map(async (key) => {
                    const res = await fetch(`/api/calls?agent=${key}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&includeTelephony=true`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return Array.isArray(data) ? data : [];
                })
            );

            setAllCallsMapped(results.flat());
        } catch (err) {
            console.error("Error fetching calls", err);
        } finally {
            setLoading(false);
        }
    }, [agent, dateRange]);

    useEffect(() => {
        fetchCallsForAgents();
    }, [fetchCallsForAgents]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const mappedCalls = useCallback(() => {
        if (loadingLeads) return [];
        return allCallsMapped.map((c: any) => {
            let resolvedName = c.name;
            if ((!resolvedName || resolvedName === "Guest" || resolvedName === "Unknown") && c.phone && leads) {
                const targetPhone = c.phone.replace(/\D/g, '');
                if (targetPhone && targetPhone.length > 5) {
                    const foundLead = leads.find((l: any) => l.phone && l.phone.replace(/\D/g, '') === targetPhone);
                    if (foundLead && foundLead.name) resolvedName = foundLead.name;
                }
            }

            return {
                ...c,
                name: resolvedName,
                displayDate: c.startedAt ? format(new Date(c.startedAt), 'PPp') : 'N/A',
                displayDuration: formatDuration(c.durationSeconds || 0),
            };
        });
    }, [allCallsMapped, leads, loadingLeads]);

    useEffect(() => {
        setCurrentPage(1);
    }, [dateRange, statusFilter, agent, phoneFilter, sortBy]);

    useEffect(() => {
        const resolved = mappedCalls();
        const filteredCalls = resolved.filter((call: any) => {
            if (statusFilter !== "all" && call.status !== statusFilter) return false;
            if (phoneFilter) {
                const searchStr = phoneFilter.toLowerCase().trim();
                const phoneSearch = searchStr.replace(/\D/g, '');
                const phoneTarget = (call.phone || "").replace(/\D/g, '');
                const matchesPhone = phoneSearch && phoneTarget.includes(phoneSearch);
                const matchesName = (call.name || "Guest").toLowerCase().includes(searchStr);
                if (!matchesPhone && !matchesName) return false;
            }
            return true;
        });

        const sortedCalls = [...filteredCalls].sort((a, b) => {
            if (sortBy === "longest") return (b.durationSeconds || 0) - (a.durationSeconds || 0);
            if (sortBy === "shortest") return (a.durationSeconds || 0) - (b.durationSeconds || 0);
            if (sortBy === "oldest") return (a.startedAt ? new Date(a.startedAt).getTime() : 0) - (b.startedAt ? new Date(b.startedAt).getTime() : 0);
            return (b.startedAt ? new Date(b.startedAt).getTime() : 0) - (a.startedAt ? new Date(a.startedAt).getTime() : 0);
        });

        setCalls(sortedCalls);
    }, [allCallsMapped, statusFilter, phoneFilter, sortBy, mappedCalls]);

    const handleRefresh = () => {
        fetchCallsForAgents();
    };

    const handleExport = async () => {
        if (calls.length === 0) return;
        setExporting(true);
        try {
            const headers = ["Name", "Phone", "Agent", "Duration (sec)", "Duration (min)", "Agent Cost", "Telephony Cost", "Total Cost", "Status", "Date"];
            const csvData = calls.map(call => {
                const telephonyStr = call.telephonyCost === null || call.telephonyCost === undefined ? "N/A" : `$${Number(call.telephonyCost).toFixed(3)}`;
                return [call.name || "Guest", call.phone || "Unknown", AGENT_MAP[call.agent]?.label || call.agent, call.durationSeconds || 0, ((call.durationSeconds || 0) / 60).toFixed(2), `$${Number(call.cost || 0).toFixed(3)}`, telephonyStr, `$${Number(call.totalCost ?? call.cost ?? 0).toFixed(3)}`, call.status, call.displayDate].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
            });
            const csvContent = "﻿" + [headers.join(","), ...csvData].join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `voice_logs_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) { console.error("Export error:", err); } finally { setExporting(false); }
    };

    const paginatedCalls = calls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-4 pb-10 relative min-h-[500px]">
            {loading && allCallsMapped.length === 0 && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)' }}>
                    <BennettLoader />
                </div>
            )}
            {loading && allCallsMapped.length > 0 && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(1px)', pointerEvents: 'none' }}>
                    <div className="liquid-card" style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <BennettLoader />
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Updating Logs...</span>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <DateRangePicker onUpdate={(r: any) => setDateRange(r.range)} />
                <button
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: exporting || calls.length === 0 ? 'var(--fill-quaternary)' : 'rgba(48,209,88,0.10)', color: exporting || calls.length === 0 ? 'var(--label-tertiary)' : 'var(--green)', fontSize: 12, fontWeight: 500, cursor: 'default', opacity: calls.length === 0 ? 0.5 : 1 }}
                    onClick={handleExport}
                    disabled={exporting || calls.length === 0}
                >
                    <Download style={{ width: 13, height: 13 }} /> {exporting ? 'Exporting...' : 'Export'}
                </button>
                <button
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', fontSize: 12, fontWeight: 500, cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                </button>
            </div>

            {/* Filters Bar */}
            <div className="liquid-card" style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', width: 180 }}>
                    <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--label-tertiary)' }} />
                    <Input
                        placeholder="Search name or phone..."
                        style={{ paddingLeft: 28, height: 34, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', fontSize: 12, borderRadius: 'var(--radius-md)' }}
                        value={phoneFilter}
                        onChange={(e) => setPhoneFilter(e.target.value)}
                    />
                </div>

                <Select value={agent} onValueChange={(v) => setAgent(v as AgentKey | "all")}>
                    <SelectTrigger style={{ ...selectTriggerStyle, width: 200 }}>
                        <SelectValue placeholder="Agent" />
                    </SelectTrigger>
                    <SelectContent className="apple-dialog">
                        <SelectItem value="all">All Agents</SelectItem>
                        {AGENTS.map(a => (
                            <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger style={{ ...selectTriggerStyle, width: 130 }}><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent className="apple-dialog">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                        <SelectItem value="failed">Failed / Error</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger style={{ ...selectTriggerStyle, width: 150 }}><SelectValue placeholder="Sort By" /></SelectTrigger>
                    <SelectContent className="apple-dialog">
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="longest">Longest Duration</SelectItem>
                        <SelectItem value="shortest">Shortest Duration</SelectItem>
                    </SelectContent>
                </Select>

                {(phoneFilter || statusFilter !== "all" || agent !== "all" || sortBy !== "newest") && (
                    <button
                        onClick={() => { setPhoneFilter(""); setStatusFilter("all"); setAgent("all"); setSortBy("newest"); }}
                        style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-secondary)', background: 'none', border: 'none', cursor: 'default', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <tr style={{ background: 'var(--fill-quaternary)' }}>
                                {['Name', 'Guest Number', 'Agent', 'Type', 'Duration', 'Cost', 'Status', 'Date & Time'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {calls.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '60px 16px', textAlign: 'center', fontSize: 13, color: 'var(--label-tertiary)' }}>No calls matching filters.</td>
                                </tr>
                            ) : (
                                paginatedCalls.map((call) => (
                                    <tr
                                        key={call.id}
                                        style={{ borderBottom: '1px solid var(--hairline)', cursor: 'pointer', transition: 'background 120ms' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-quaternary)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => { setSelectedCall(call); setModalOpen(true); }}
                                    >
                                        <DynamicRowCells call={call} leads={leads} />
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: call.status === 'ended' ? 'rgba(48,209,88,0.12)' : 'var(--fill-tertiary)', color: call.status === 'ended' ? 'var(--green)' : 'var(--label-tertiary)', border: `1px solid ${call.status === 'ended' ? 'transparent' : 'var(--hairline)'}` }}>
                                                {call.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--label-tertiary)', whiteSpace: 'nowrap' }}>{call.displayDate}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--hairline)', background: 'var(--fill-quaternary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ fontSize: 12, color: 'var(--label-tertiary)' }}>
                        Showing <span style={{ fontWeight: 700, color: 'var(--label-primary)' }}>{calls.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, calls.length)}</span> of <span style={{ fontWeight: 700, color: 'var(--label-primary)' }}>{calls.length}</span> calls
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                            style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default', opacity: currentPage === 1 ? 0.4 : 1 }}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        >
                            <ChevronLeft style={{ width: 14, height: 14 }} />
                        </button>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-secondary)', padding: '0 10px' }}>Page {currentPage}</span>
                        <button
                            style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default', opacity: currentPage >= Math.ceil(calls.length / itemsPerPage) ? 0.4 : 1 }}
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(calls.length / itemsPerPage), p + 1))} disabled={currentPage >= Math.ceil(calls.length / itemsPerPage)}
                        >
                            <ChevronRight style={{ width: 14, height: 14 }} />
                        </button>
                    </div>
                </div>
            </div>

            <CallDetailsModal open={modalOpen} onOpenChange={setModalOpen} call={selectedCall} />

        </div>
    );
}
