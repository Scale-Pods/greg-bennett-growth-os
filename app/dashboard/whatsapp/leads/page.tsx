"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Briefcase,
    RefreshCw,
    Building2,
    Users
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { WhatsAppChatDetail } from "@/components/dashboard/whatsapp-chat-detail";
import { BennettLoader } from "@/components/bennett-loader";
import { useData } from "@/context/DataContext";

// Raw shape returned by /api/whatsapp-leads
interface WALead {
    "Lead ID"?: string;
    "Name"?: string;
    "Phone"?: string;
    "Email"?: string;
    "Created At"?: string;
    "W.P_1 TS"?: string;
    "WP_Replied_track"?: string;
    "Senders email"?: string;
    source_loop?: string;
    wp1_parsed_date?: string;
    [key: string]: any;
}

interface WAOwner {
    id?: string;
    name?: string;
    contactNo?: string;
    "Whatsapp_1_Date"?: string;
    "Whatsapp_1"?: string;
    "WTS_Reply_Track"?: string;
    whatsapp_1_parsed_date?: string;
    [key: string]: any;
}

// Extract the best available date for an owner row.
// RPC returns a pre-parsed whatsapp_1_parsed_date; fall back to Whatsapp_1_Date.
function getOwnerDate(owner: WAOwner): Date | null {
    const parsed = owner["whatsapp_1_parsed_date"];
    if (parsed) { const d = new Date(parsed); if (!isNaN(d.getTime())) return d; }
    const raw = owner["Whatsapp_1_Date"];
    if (raw) { const d = new Date(raw); if (!isNaN(d.getTime())) return d; }
    return null;
}

// Best available date for a lead row — RPC returns wp1_parsed_date.
function getLeadDate(lead: WALead): Date | null {
    const parsed = lead["wp1_parsed_date"];
    if (parsed) { const d = new Date(parsed); if (!isNaN(d.getTime())) return d; }
    return null;
}

export default function WhatsappLeadsPage() {
    const { dateRange, setDateRange } = useData();
    const [waLeads, setWaLeads] = useState<WALead[]>([]);
    const [waOwners, setWaOwners] = useState<WAOwner[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLeadIdForChat, setSelectedLeadIdForChat] = useState<string | null>(null);
    const [selectedLeadObj, setSelectedLeadObj] = useState<WALead | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const leadsPerPage = 10;
    const [activeTab, setActiveTab] = useState<"leads" | "owners">("leads");

    const [activeFilters, setActiveFilters] = useState<{
        replyStatus: string[];
        loops: string[];
    }>({ replyStatus: [], loops: [] });

    // Fetch from the dedicated WhatsApp leads endpoint
    const fetchWAData = useCallback(async (from: Date, to: Date) => {
        setLoading(true);
        try {
            const fromISO = startOfDay(from).toISOString();
            const toISO = endOfDay(to).toISOString();
            const res = await fetch(`/api/whatsapp-leads?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`);
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            const nr_wf: WALead[] = (data.nr_wf || []).map((l: any) => ({ ...l, source_loop: "Intro" }));
            const followup: WALead[] = (data.followup || []).map((l: any) => ({ ...l, source_loop: "Follow Up" }));
            const nurture: WALead[] = (data.nurture || []).map((l: any) => ({ ...l, source_loop: "Nurture" }));
            setWaLeads([...nr_wf, ...followup, ...nurture]);
            setWaOwners(data.owners || []);
        } catch (err) {
            console.error("[WA leads]", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!dateRange?.from) return;
        fetchWAData(dateRange.from, dateRange.to || dateRange.from);
    }, [dateRange, fetchWAData]);

    const filteredLeads = useMemo(() => {
        setCurrentPage(1);
        return waLeads.filter(lead => {
            const name = String(lead["Name"] || "").toLowerCase();
            const phone = String(lead["Phone"] || "");
            const email = String(lead["Email"] || "").toLowerCase();
            const matchesSearch =
                name.includes(searchQuery.toLowerCase()) ||
                email.includes(searchQuery.toLowerCase()) ||
                phone.includes(searchQuery);
            if (!matchesSearch) return false;

            const wtR = lead["WP_Replied_track"];
            const hasReplied = wtR && wtR !== "" && String(wtR).trim().toLowerCase() !== "no";
            if (activeFilters.replyStatus.length > 0) {
                const ok = (activeFilters.replyStatus.includes("Replied") && hasReplied) ||
                    (activeFilters.replyStatus.includes("Sent") && !hasReplied);
                if (!ok) return false;
            }

            if (activeFilters.loops.length > 0) {
                const loop = String(lead.source_loop || "").toLowerCase();
                const ok = activeFilters.loops.some(f => loop.includes(f.toLowerCase()));
                if (!ok) return false;
            }

            return true;
        });
    }, [waLeads, searchQuery, activeFilters]);

    const filteredOwners = useMemo(() => {
        setCurrentPage(1);
        return waOwners.filter(owner => {
            const name = String(owner.name || "").toLowerCase();
            const phone = String(owner.contactNo || "");
            const matchesSearch =
                name.includes(searchQuery.toLowerCase()) ||
                phone.includes(searchQuery);
            if (!matchesSearch) return false;

            const wtR = owner["WTS_Reply_Track"];
            const hasReplied = wtR && wtR !== "" && String(wtR).toLowerCase() !== "no";
            if (activeFilters.replyStatus.length > 0) {
                const ok = (activeFilters.replyStatus.includes("Replied") && hasReplied) ||
                    (activeFilters.replyStatus.includes("Sent") && !hasReplied);
                if (!ok) return false;
            }

            return true;
        });
    }, [waOwners, searchQuery, activeFilters]);

    const toggleFilter = (type: 'replyStatus' | 'loops', value: string) => {
        setActiveFilters(prev => {
            const current = prev[type];
            return current.includes(value)
                ? { ...prev, [type]: current.filter(v => v !== value) }
                : { ...prev, [type]: [...current, value] };
        });
    };

    const resetFilters = () => {
        setActiveFilters({ replyStatus: [], loops: [] });
        setSearchQuery("");
    };

    const totalPages = activeTab === "leads"
        ? Math.ceil(filteredLeads.length / leadsPerPage)
        : Math.ceil(filteredOwners.length / leadsPerPage);

    const paginatedLeads = filteredLeads.slice(
        (currentPage - 1) * leadsPerPage,
        currentPage * leadsPerPage
    );

    const paginatedOwners = filteredOwners.slice(
        (currentPage - 1) * leadsPerPage,
        currentPage * leadsPerPage
    );

    const toggleSelectAll = () => {
        if (selectedLeads.length === filteredLeads.length) setSelectedLeads([]);
        else setSelectedLeads(filteredLeads.map(l => String(l["Lead ID"] || "")));
    };

    const toggleSelect = (id: string) => {
        setSelectedLeads(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };


    return (
        <div className="space-y-5 pb-10 relative min-h-[500px]">
            {loading && <BennettLoader />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>WhatsApp Leads</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Review leads successfully contacted via WhatsApp</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <DateRangePicker onUpdate={(r: any) => setDateRange(r.range)} />
                    <div style={{ display: 'flex', background: 'var(--fill-tertiary)', borderRadius: 'var(--radius-md)', padding: 3, gap: 2 }}>
                        <button
                            onClick={() => { setActiveTab("leads"); setCurrentPage(1); }}
                            style={{ padding: '5px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'default', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 130ms', background: activeTab === "leads" ? 'var(--bg-layer1)' : 'transparent', color: activeTab === "leads" ? 'var(--label-primary)' : 'var(--label-secondary)', boxShadow: activeTab === "leads" ? 'var(--shadow-sm)' : 'none' }}
                        ><Users style={{ width: 13, height: 13 }} /> CRM Leads</button>
                        <button
                            onClick={() => { setActiveTab("owners"); setCurrentPage(1); }}
                            style={{ padding: '5px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'default', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 130ms', background: activeTab === "owners" ? 'var(--bg-layer1)' : 'transparent', color: activeTab === "owners" ? 'var(--orange)' : 'var(--label-secondary)', boxShadow: activeTab === "owners" ? 'var(--shadow-sm)' : 'none' }}
                        ><Building2 style={{ width: 13, height: 13 }} /> Generated Leads</button>
                    </div>
                    {(activeFilters.replyStatus.length > 0 || activeFilters.loops.length > 0 || searchQuery) && (
                        <button onClick={resetFilters} style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'default' }}>RESET FILTERS</button>
                    )}
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="liquid-card" style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--label-tertiary)' }} />
                    <Input
                        style={{ paddingLeft: 30, height: 36, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', fontSize: 13, borderRadius: 'var(--radius-md)' }}
                        placeholder={`Search ${activeTab === "leads" ? "CRM Leads" : "Generated Leads"}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: activeFilters.replyStatus.length > 0 ? 'rgba(59,91,219,0.10)' : 'var(--fill-tertiary)', color: activeFilters.replyStatus.length > 0 ? 'var(--blue)' : 'var(--label-secondary)', fontSize: 13, fontWeight: 500, cursor: 'default' }}>
                                <Filter style={{ width: 12, height: 12 }} />
                                {activeFilters.replyStatus.length > 0 ? `Status (${activeFilters.replyStatus.length})` : 'Status'}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 apple-dialog">
                            <DropdownMenuItem onClick={() => toggleFilter('replyStatus', 'Replied')} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                Replied {activeFilters.replyStatus.includes('Replied') && "✓"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFilter('replyStatus', 'Sent')} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                Sent {activeFilters.replyStatus.includes('Sent') && "✓"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {activeTab === "leads" && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: activeFilters.loops.length > 0 ? 'rgba(175,82,222,0.10)' : 'var(--fill-tertiary)', color: activeFilters.loops.length > 0 ? 'var(--purple)' : 'var(--label-secondary)', fontSize: 13, fontWeight: 500, cursor: 'default' }}>
                                    <Briefcase style={{ width: 12, height: 12 }} />
                                    {activeFilters.loops.length > 0 ? `Loops (${activeFilters.loops.length})` : 'Loops'}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 apple-dialog">
                                <DropdownMenuItem onClick={() => toggleFilter('loops', 'Intro')} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Intro {activeFilters.loops.includes('Intro') && "✓"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleFilter('loops', 'Follow Up')} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Follow Up {activeFilters.loops.includes('Follow Up') && "✓"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <button
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', fontSize: 13, fontWeight: 500, cursor: 'default', transition: 'background 130ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                        onClick={() => { if (dateRange?.from) fetchWAData(dateRange.from, dateRange.to || dateRange.from); }}
                    >
                        <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
                    </button>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedLeads.length > 0 && (
                <div className="liquid-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>{selectedLeads.length} leads selected</span>
                    <button style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-secondary)', background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', padding: '4px 12px', borderRadius: 'var(--radius-sm)', cursor: 'default' }}>Export Selected</button>
                </div>
            )}

            {/* Table */}
            <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <tr style={{ background: 'var(--fill-quaternary)' }}>
                                <th style={{ padding: '10px 16px', width: 40 }}>
                                    <Checkbox
                                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </th>
                                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)' }}>{activeTab === "leads" ? "Name" : "Generated Lead"}</th>
                                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)' }}>Phone</th>
                                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)' }}>{activeTab === "leads" ? "Loop" : "Source"}</th>
                                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Reply Status</th>
                                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)' }}>WhatsApp Date</th>
                                <th style={{ padding: '10px 16px', width: 40 }}></th>
                            </tr>
                        </thead>
                            <tbody>
                                {activeTab === "leads" ? (
                                    loading ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--label-tertiary)' }}>
                                                <RefreshCw style={{ width: 20, height: 20, margin: '0 auto 8px', animation: 'spin 1s linear infinite', color: 'var(--green)' }} />
                                                Loading WhatsApp leads...
                                            </td>
                                        </tr>
                                    ) : filteredLeads.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--label-tertiary)' }}>
                                                No leads found for this date range.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedLeads.map((lead, index) => {
                                            const id = String(lead["Lead ID"] || index);
                                            const wtR = lead["WP_Replied_track"];
                                            const hasReplied = wtR && wtR !== "" && String(wtR).trim().toLowerCase() !== "no";
                                            const waDate = getLeadDate(lead);
                                            return (
                                                <tr
                                                    key={`${id}-${index}`}
                                                    style={{ borderBottom: '1px solid var(--hairline)', cursor: 'pointer', transition: 'background 120ms' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-quaternary)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    onClick={() => { setSelectedLeadIdForChat(id); setSelectedLeadObj(lead); }}
                                                >
                                                    <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selectedLeads.includes(id)}
                                                            onCheckedChange={() => toggleSelect(id)}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>{lead["Name"] || "—"}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: 11, fontFamily: 'monospace', color: 'var(--label-secondary)' }}>{lead["Phone"] || "—"}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(175,82,222,0.10)', color: 'var(--purple)' }}>
                                                            {lead.source_loop || "—"}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        {hasReplied
                                                            ? <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, background: 'rgba(48,209,88,0.12)', color: 'var(--green)' }}>REPLIED</span>
                                                            : <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600, border: '1px solid var(--hairline)', color: 'var(--label-tertiary)' }}>SENT</span>
                                                        }
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--label-tertiary)' }}>
                                                        {waDate ? waDate.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                                        <button style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--label-tertiary)', cursor: 'default' }}>
                                                            <MoreVertical style={{ width: 14, height: 14 }} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )
                                ) : (
                                    loading ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--label-tertiary)' }}>
                                                <RefreshCw style={{ width: 20, height: 20, margin: '0 auto 8px', animation: 'spin 1s linear infinite', color: 'var(--orange)' }} />
                                                Loading generated leads...
                                            </td>
                                        </tr>
                                    ) : filteredOwners.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '80px 16px', textAlign: 'center', color: 'var(--label-tertiary)' }}>
                                                No generated leads found for this date range.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedOwners.map((owner, index) => {
                                            const wtsReply = owner["WTS_Reply_Track"];
                                            const hasReplied = wtsReply && wtsReply !== "" && String(wtsReply).toLowerCase() !== "no";
                                            const waDate = getOwnerDate(owner);
                                            return (
                                                <tr
                                                    key={`${owner.id || ''}-${owner.contactNo || ''}-${index}`}
                                                    style={{ borderBottom: '1px solid var(--hairline)', cursor: 'pointer', transition: 'background 120ms' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-quaternary)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox />
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>{owner.name || "—"}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: 11, fontFamily: 'monospace', color: 'var(--label-secondary)' }}>{owner.contactNo || "—"}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(255,159,10,0.12)', color: 'var(--orange)' }}>
                                                            GENERATED LEADS OUTREACH
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        {hasReplied
                                                            ? <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, background: 'rgba(48,209,88,0.12)', color: 'var(--green)' }}>REPLIED</span>
                                                            : <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600, border: '1px solid var(--hairline)', color: 'var(--label-tertiary)' }}>SENT</span>
                                                        }
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--label-tertiary)' }}>
                                                        {waDate ? waDate.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                                        <button style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--label-tertiary)', cursor: 'default' }}>
                                                            <MoreVertical style={{ width: 14, height: 14 }} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--hairline)', background: 'var(--fill-quaternary)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <p style={{ fontSize: 12, color: 'var(--label-tertiary)' }}>
                            Showing <span style={{ fontWeight: 700, color: 'var(--label-primary)' }}>
                                {activeTab === "leads" ? paginatedLeads.length : paginatedOwners.length}
                            </span> of <span style={{ fontWeight: 700, color: 'var(--label-primary)' }}>
                                {activeTab === "leads" ? filteredLeads.length : filteredOwners.length}
                            </span> {activeTab === "leads" ? "CRM Leads" : "Generated Leads"}
                        </p>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default', opacity: currentPage === 1 ? 0.4 : 1 }}
                                >
                                    <ChevronLeft style={{ width: 14, height: 14 }} />
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 3, margin: '0 4px' }}>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) pageNum = i + 1;
                                        else if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: currentPage === pageNum ? 'none' : '1px solid var(--hairline)', background: currentPage === pageNum ? 'var(--blue)' : 'var(--fill-tertiary)', color: currentPage === pageNum ? '#fff' : 'var(--label-secondary)', fontSize: 12, fontWeight: 600, cursor: 'default' }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default', opacity: currentPage === totalPages ? 0.4 : 1 }}
                                >
                                    <ChevronRight style={{ width: 14, height: 14 }} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            {/* Chat Detail Modal */}
            <Dialog open={!!selectedLeadIdForChat} onOpenChange={(open) => { if (!open) { setSelectedLeadIdForChat(null); setSelectedLeadObj(null); } }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-6 gap-0 apple-dialog">
                    <DialogHeader className="sr-only">
                        <DialogTitle>WhatsApp Chat Detail</DialogTitle>
                    </DialogHeader>
                    {selectedLeadIdForChat && (
                        <WhatsAppChatDetail
                            customerId={selectedLeadIdForChat}
                            initialLead={selectedLeadObj as any}
                            onClose={() => { setSelectedLeadIdForChat(null); setSelectedLeadObj(null); }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
