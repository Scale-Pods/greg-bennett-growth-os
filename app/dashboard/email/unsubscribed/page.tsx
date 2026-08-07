"use client";

import { BennettLoader } from "@/components/bennett-loader";
import { useEffect, useState, useCallback, useMemo } from "react";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { UserMinus, Search, Mail, Calendar, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { AGENT_OPTIONS, AgentKey } from "@/lib/agents";
import { AgentBadge } from "@/components/agents/agent-badge";
import type { NormalizedLead } from "@/lib/leads-utils";

const ITEMS_PER_PAGE = 10;

export default function UnsubscribedPage() {
    const [leads, setLeads] = useState<NormalizedLead[]>([]);
    const [loading, setLoading] = useState(true);

    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 90),
        to: new Date(),
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [agentFilter, setAgentFilter] = useState<AgentKey | "all">("all");
    const [repliedFilter, setRepliedFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    const fetchUnsubscribed = useCallback(async () => {
        setLoading(true);
        try {
            const from = startOfDay(dateRange.from).toISOString();
            const to = endOfDay(dateRange.to || dateRange.from).toISOString();
            const agentsToFetch = agentFilter === "all" ? AGENT_OPTIONS.map(a => a.key) : [agentFilter];

            const results = await Promise.all(
                agentsToFetch.map(async (key) => {
                    const res = await fetch(`/api/leads?agent=${key}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return Array.isArray(data.leads) ? data.leads : [];
                })
            );

            const flat: NormalizedLead[] = results.flat();
            const unsubscribed = flat.filter(l => l.emailUnsubscribed);
            unsubscribed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setLeads(unsubscribed);
        } catch (err) {
            console.error("Error fetching unsubscribed leads:", err);
        } finally {
            setLoading(false);
        }
    }, [agentFilter, dateRange]);

    useEffect(() => {
        fetchUnsubscribed();
    }, [fetchUnsubscribed]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, agentFilter, repliedFilter, dateRange]);

    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const matchesSearch = l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.email?.toLowerCase().includes(searchTerm.toLowerCase());
            let matchesReplied = true;
            const isReplied = l.emailReplied || l.callReplied;
            if (repliedFilter === "yes") matchesReplied = isReplied;
            else if (repliedFilter === "no") matchesReplied = !isReplied;
            return matchesSearch && matchesReplied;
        });
    }, [leads, searchTerm, repliedFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
    const paginatedLeads = filteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-5 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Unsubscribed</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Leads who have opted out of email outreach.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DateRangePicker value={dateRange as any} onUpdate={(r: any) => setDateRange(r.range)} />
                    <button
                        onClick={fetchUnsubscribed}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default' }}
                    >
                        <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Filters inside card header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                        <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--label-tertiary)' }} />
                        <Input
                            type="text"
                            placeholder="Search name or email..."
                            style={{ paddingLeft: 28, height: 34, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', fontSize: 12, borderRadius: 'var(--radius-md)' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v as AgentKey | "all")}>
                        <SelectTrigger style={{ width: 190, height: 34, fontSize: 12, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                            <SelectValue placeholder="Agent" />
                        </SelectTrigger>
                        <SelectContent className="apple-dialog">
                            <SelectItem value="all">All Agents</SelectItem>
                            {AGENT_OPTIONS.map(a => (
                                <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={repliedFilter} onValueChange={setRepliedFilter}>
                        <SelectTrigger style={{ width: 150, height: 34, fontSize: 12, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                            <SelectValue placeholder="Reply Status" />
                        </SelectTrigger>
                        <SelectContent className="apple-dialog">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="yes">Replied</SelectItem>
                            <SelectItem value="no">No Reply</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div style={{ position: 'relative', minHeight: 400 }}>
                    {loading && leads.length === 0 ? (
                        <BennettLoader fullScreen={false} />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader style={{ borderBottom: '1px solid var(--hairline)' }}>
                                    <TableRow className="bg-[var(--fill-quaternary)] border-none hover:bg-[var(--fill-quaternary)]">
                                        <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Name</TableHead>
                                        <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Email</TableHead>
                                        <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Agent</TableHead>
                                        <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Status</TableHead>
                                        <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Date</TableHead>
                                        <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedLeads.length > 0 ? (
                                        paginatedLeads.map((lead, idx) => {
                                            const dateObj = lead.createdAt ? new Date(lead.createdAt) : null;
                                            return (
                                                <TableRow key={lead.id || idx} className="hover:bg-[var(--fill-quaternary)] border-b border-[var(--separator)] transition-colors">
                                                    <TableCell className="font-medium text-[var(--label-primary)]">{lead.name || "N/A"}</TableCell>
                                                    <TableCell className="text-[var(--label-secondary)]">
                                                        <div className="flex items-center gap-1.5">
                                                            <Mail style={{ width: 12, height: 12, color: 'var(--label-tertiary)', flexShrink: 0 }} />
                                                            {lead.email}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><AgentBadge agent={lead.agent} /></TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" style={{ background: 'rgba(255,69,58,0.10)', color: 'var(--red)', border: 'none', fontSize: 10, fontWeight: 700 }}>
                                                            Unsubscribed
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[var(--label-secondary)]">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar style={{ width: 12, height: 12, color: 'var(--label-tertiary)', flexShrink: 0 }} />
                                                            {dateObj ? dateObj.toLocaleDateString() : 'N/A'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-[var(--label-tertiary)] text-xs">
                                                        {dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow className="border-none hover:bg-transparent">
                                            <TableCell colSpan={6} className="h-24 text-center text-[var(--label-secondary)]">
                                                No unsubscribed leads match your search criteria.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
                <PaginationFooter
                    totalItems={filteredLeads.length}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}

function PaginationFooter({ totalItems, currentPage, itemsPerPage, onPageChange }: any) {
    if (totalItems <= itemsPerPage) return null;

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="px-6 py-4 border-t border-[var(--separator)] bg-[var(--fill-quaternary)] flex items-center justify-between">
            <p className="text-sm text-[var(--label-secondary)]">
                Showing <span className="font-bold text-[var(--label-primary)]">{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)}</span> of {totalItems} items
            </p>
            <div className="flex items-center gap-2">
                <button
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-[var(--glass-border)] bg-[var(--fill-tertiary)] text-[var(--label-primary)] disabled:opacity-40"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-secondary)', padding: '0 8px' }}>Page {currentPage} of {totalPages}</span>
                <button
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-[var(--glass-border)] bg-[var(--fill-tertiary)] text-[var(--label-primary)] disabled:opacity-40"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
