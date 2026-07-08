"use client";

import { RefreshCw, ChevronLeft, ChevronRight, User, Download, Search, Info, Activity, Phone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BennettLoader } from "@/components/bennett-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { CallDetailsModal } from "@/components/voice/call-details-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format, subDays } from "date-fns";
import { formatDuration } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { DateRangePicker } from "@/components/ui/date-range-picker";


const DynamicRowCells = ({ call, leads, telephonyCost }: { call: any, leads: any[], telephonyCost?: number }) => {
    let guestName = call.name || "Guest";
    const guestNum = call.phone || "Unknown";
    const realType = call.type || (call.isInbound ? "Inbound" : "Outbound");
    const isInboundState = call.isInbound;

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(59,91,219,0.10)', color: 'var(--blue)' }}>
                        {realType}
                    </span>
                    {call.vapiAccount === 'owners' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(255,159,10,0.12)', color: 'var(--orange)' }}>
                            generated leads
                        </span>
                    )}
                    {call.assistantId === '560ca61b-8cd3-4b5f-996b-2966abfa37fd' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(175,82,222,0.10)', color: 'var(--purple)' }}>
                            secondary leads
                        </span>
                    )}
                    {call.assistantId === '1ef6ea66-0a75-45f5-b025-1743e048dc90' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(255,159,10,0.12)', color: 'var(--orange)' }}>
                            open house
                        </span>
                    )}
                </div>
            </td>
            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--label-secondary)', fontWeight: 500 }}>{formatDuration(call.durationSeconds)}</td>
            <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--label-tertiary)' }}>{call.country || 'Unknown'}</td>
            <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
                <Popover>
                    <PopoverTrigger asChild>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'help', color: 'var(--green)', fontSize: 12, fontWeight: 700 }} onClick={(e) => e.stopPropagation()}>
                            {telephonyCost !== undefined && telephonyCost !== -1
                                ? `$${((call.breakdown?.agent || 0) + telephonyCost).toFixed(3)}`
                                : call.cost}
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
                                    <span>Agent (Vapi/AI):</span>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--label-primary)' }}>${(call.breakdown?.agent || 0).toFixed(3)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--label-secondary)' }}>
                                    <span>Telephony:</span>
                                    {telephonyCost === -1 ? (
                                        <span style={{ fontFamily: 'monospace', color: 'var(--label-tertiary)', fontStyle: 'italic' }}>loading...</span>
                                    ) : (
                                        <span style={{ fontFamily: 'monospace', color: 'var(--label-primary)' }}>${(telephonyCost !== undefined ? telephonyCost : (call.breakdown?.telephony || 0)).toFixed(3)}</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--label-primary)' }}>
                                <span>Total:</span>
                                <span style={{ color: 'var(--green)' }}>
                                    {telephonyCost !== undefined && telephonyCost !== -1
                                        ? `$${((call.breakdown?.agent || 0) + telephonyCost).toFixed(3)}`
                                        : call.cost}
                                </span>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </td>
        </>
    );
};

export default function VoiceLogsPage() {
    const { calls: globalCalls, loadingCalls, refreshCalls, leads, loadingLeads, dateRange, setDateRange } = useData();
    const [allCallsMapped, setAllCallsMapped] = useState<any[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const loading = loadingCalls;
    const [selectedCall, setSelectedCall] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [accountFilter, setAccountFilter] = useState("vapi");
    const [phoneFilter, setPhoneFilter] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [regionFilter, setRegionFilter] = useState("all");
    const [costModalOpen, setCostModalOpen] = useState(false);
    const [telephonyCosts, setTelephonyCosts] = useState<Record<string, number>>({});
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (!refreshCalls) return;
        refreshCalls({
            from: !dateRange ? undefined : dateRange?.from,
            to: !dateRange ? undefined : (dateRange?.to || dateRange?.from),
            provider: 'vapi'
        });
    }, [dateRange, refreshCalls]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (loadingLeads || !globalCalls) return;

        const mappedCalls = globalCalls.map((c: any) => {
            let resolvedName = c.name;
            if ((!resolvedName || resolvedName === "Guest" || resolvedName === "Unknown") && c.phone && leads) {
                const targetPhone = c.phone.replace(/\D/g, '');
                if (targetPhone && targetPhone.length > 5) {
                    const foundLead = leads.find((l: any) => l.phone && l.phone.replace(/\D/g, '') === targetPhone);
                    if (foundLead && foundLead.name) resolvedName = foundLead.name;
                }
            }
            const UAE_BOT_ID = '70f05e16-18f3-4f6e-964a-f47b299c6c1d';
            const UAE_BUSINESS_NUMBER = '+97148714150';
            let resolvedType = c.type || (c.isInbound ? "Inbound" : "Outbound");

            if (resolvedType === "Inbound") {
                const isFromUAEBot = c.assistantId === UAE_BOT_ID;
                const isFromUAENumber = c.fromNumber === UAE_BUSINESS_NUMBER || c.phoneNumber === UAE_BUSINESS_NUMBER;
                if ((isFromUAEBot || isFromUAENumber) && c.phone) resolvedType = "Outbound";
            }

            return {
                ...c,
                name: resolvedName,
                type: resolvedType,
                displayDate: c.startedAt ? format(new Date(c.startedAt), 'PPp') : 'N/A',
                displayDuration: formatDuration(c.durationSeconds || 0),
            };
        });

        setAllCallsMapped(mappedCalls);
    }, [globalCalls, leads, loadingLeads]);

    useEffect(() => {
        setCurrentPage(1);
    }, [dateRange, statusFilter, typeFilter, accountFilter, phoneFilter, sortBy, regionFilter]);

    useEffect(() => {
        const filteredCalls = allCallsMapped.filter((call: any) => {
            if (accountFilter === 'vapi' && call.source !== 'vapi') return false;
            if (accountFilter === 'bootcamps' && (call.source !== 'vapi' || call.vapiAccount !== 'normal' || call.assistantId === '1ef6ea66-0a75-45f5-b025-1743e048dc90')) return false;
            if (accountFilter === 'realty' && (call.source !== 'vapi' || call.vapiAccount !== 'normal' || (call.assistantId !== '1ef6ea66-0a75-45f5-b025-1743e048dc90' && call.assistantId !== '70f05e16-18f3-4f6e-964a-f47b299c6c1d'))) return false;
            if (accountFilter === 'wealth' && (call.source !== 'vapi' || call.vapiAccount !== 'owners' || call.assistantId === '560ca61b-8cd3-4b5f-996b-2966abfa37fd')) return false;
            if (accountFilter === 'coaching' && (call.source !== 'vapi' || call.vapiAccount !== 'owners' || call.assistantId !== '560ca61b-8cd3-4b5f-996b-2966abfa37fd')) return false;
            if (statusFilter !== "all" && call.status !== statusFilter) return false;
            if (typeFilter !== "all") {
                const normalizedCallType = (call.type || (call.isInbound ? "Inbound" : "Outbound")).toLowerCase();
                const isSecondaryLeads = call.assistantId === '560ca61b-8cd3-4b5f-996b-2966abfa37fd';
                if (typeFilter === "secondary-leads") { if (!isSecondaryLeads) return false; }
                else if (typeFilter === "normal") { if (isSecondaryLeads) return false; }
                else if (normalizedCallType !== typeFilter.toLowerCase()) return false;
            }
            if (phoneFilter) {
                const searchStr = phoneFilter.toLowerCase().trim();
                const phoneSearch = searchStr.replace(/\D/g, '');
                const phoneTarget = (call.phone || "").replace(/\D/g, '');
                const matchesPhone = phoneSearch && phoneTarget.includes(phoneSearch);
                const matchesName = (call.name || "Guest").toLowerCase().includes(searchStr);
                if (!matchesPhone && !matchesName) return false;
            }
            if (regionFilter !== "all") {
                const assistantId = call.assistantId;
                const assistantNum = (call.phoneNumber || call.fromNumber || "").replace(/\D/g, '');
                const regionMap: Record<string, { nums: string[], ids: string[] }> = {
                    "uae": { nums: ["97148714150"], ids: ["70f05e16-18f3-4f6e-964a-f47b299c6c1d", "9ac979c3-a0b3-4af6-bb0d-07ddf9c0d1cd"] },
                    "us": { nums: ["14782159151", "17624000439"], ids: ["b35e3032-7865-4913-ba22-a913b5d4117b"] },
                    "uk": { nums: ["447462179309", "7462179309"], ids: ["918c25eb-9882-452e-86df-b4851d464852"] }
                };
                const target = regionMap[regionFilter];
                if (target) {
                    const matchesNum = assistantNum && target.nums.some(n => assistantNum.endsWith(n) || n.endsWith(assistantNum));
                    const matchesId = assistantId && target.ids.includes(assistantId);
                    if (!matchesNum && !matchesId) return false;
                }
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
    }, [allCallsMapped, dateRange, statusFilter, typeFilter, accountFilter, phoneFilter, sortBy, regionFilter]);

    const handleRefresh = () => {
        refreshCalls({ from: dateRange?.from, to: dateRange?.to || dateRange?.from, provider: 'vapi', force: true });
    };

    const handleExport = async () => {
        if (calls.length === 0) return;
        setExporting(true);
        try {
            const missingCostCalls = calls.filter(c => telephonyCosts[c.id] === undefined);
            let allCosts = { ...telephonyCosts };
            if (missingCostCalls.length > 0) {
                const res = await fetch('/api/calls/telephony-cost', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ calls: missingCostCalls.map(c => ({ id: c.id, phoneNumber: c.phoneNumber, phone: c.phone, durationSeconds: c.durationSeconds, isInbound: c.isInbound })) })
                });
                const data = await res.json();
                if (data && data.costs) { allCosts = { ...allCosts, ...data.costs }; setTelephonyCosts(prev => ({ ...prev, ...data.costs })); }
            }
            const headers = ["Name", "Phone", "Type", "Duration (sec)", "Duration (min)", "Country", "Telephony Cost", "Total Cost", "Status", "Date"];
            const csvData = calls.map(call => {
                const tCost = allCosts[call.id];
                const agentCost = call.breakdown?.agent || 0;
                let totalCostStr = call.cost;
                let telephonyCostStr = "N/A";
                if (tCost !== undefined && tCost !== -1) { telephonyCostStr = `$${tCost.toFixed(3)}`; totalCostStr = `$${(agentCost + tCost).toFixed(3)}`; }
                return [call.name || "Guest", call.phone || "Unknown", call.type, call.durationSeconds || 0, ((call.durationSeconds || 0) / 60).toFixed(2), call.country || "Unknown", telephonyCostStr, totalCostStr, call.status, call.displayDate].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
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

    useEffect(() => {
        if (!paginatedCalls || paginatedCalls.length === 0) return;
        const callsToFetch = paginatedCalls.filter(c => telephonyCosts[c.id] === undefined);
        if (callsToFetch.length === 0) return;
        setTelephonyCosts(prev => { const fetching = { ...prev }; callsToFetch.forEach(c => fetching[c.id] = -1); return fetching; });
        fetch('/api/calls/telephony-cost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calls: callsToFetch.map(c => ({ id: c.id, phoneNumber: c.phoneNumber, phone: c.phone, durationSeconds: c.durationSeconds, isInbound: c.isInbound, startedAt: c.startedAt })) })
        }).then(res => res.json()).then(data => { if (data && data.costs) setTelephonyCosts(prev => ({ ...prev, ...data.costs })); }).catch(err => console.error("Error fetching telephony costs", err));
    }, [paginatedCalls]);

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

                <Select value={accountFilter} onValueChange={setAccountFilter}>
                    <SelectTrigger style={{ width: 220, height: 34, fontSize: 12 }}>
                        <SelectValue placeholder="Select Business" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="vapi">All Businesses</SelectItem>
                        <SelectItem value="bootcamps">Bennett Bootcamps</SelectItem>
                        <SelectItem value="realty">Bennett Realty Solutions</SelectItem>
                        <SelectItem value="wealth">Bennett Wealth Builders Foundation</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger style={{ width: 110, height: 34, fontSize: 12 }}><SelectValue placeholder="Call Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Inbound">Inbound</SelectItem>
                        <SelectItem value="Outbound">Outbound</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger style={{ width: 110, height: 34, fontSize: 12 }}><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="answered">Answered / Done</SelectItem>
                        <SelectItem value="failed">Failed / Error</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={regionFilter} onValueChange={setRegionFilter}>
                    <SelectTrigger style={{ width: 150, height: 34, fontSize: 12, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                            <Phone style={{ width: 12, height: 12, color: 'var(--label-tertiary)', flexShrink: 0 }} />
                            <SelectValue placeholder="Region" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="uae">UAE (Dubai)</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger style={{ width: 130, height: 34, fontSize: 12 }}><SelectValue placeholder="Sort By" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="longest">Longest Duration</SelectItem>
                        <SelectItem value="shortest">Shortest Duration</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <tr style={{ background: 'var(--fill-quaternary)' }}>
                                {['Name', 'Guest Number', 'Type', 'Duration', 'Country', 'Cost', 'Status', 'Date & Time'].map(h => (
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
                                        <DynamicRowCells call={call} leads={leads} telephonyCost={telephonyCosts[call.id]} />
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: call.status === 'answered' ? 'rgba(48,209,88,0.12)' : 'var(--fill-tertiary)', color: call.status === 'answered' ? 'var(--green)' : 'var(--label-tertiary)', border: `1px solid ${call.status === 'answered' ? 'transparent' : 'var(--hairline)'}` }}>
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
