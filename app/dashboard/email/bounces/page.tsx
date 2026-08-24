"use client";

import { BennettLoader } from "@/components/bennett-loader";
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
import {
    RefreshCw,
    Mail,
    Search,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { AGENT_OPTIONS, AgentKey } from "@/lib/agents";
import { AgentBadge } from "@/components/agents/agent-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NormalizedLead } from "@/lib/leads-utils";

const ITEMS_PER_PAGE = 10;

export default function BouncedEmailsPage() {
    const [leads, setLeads] = useState<NormalizedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [agentFilter, setAgentFilter] = useState<AgentKey | "all">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });

    const fetchBounced = useCallback(async () => {
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
            const bounced = flat.filter(l => l.emailBounced);
            bounced.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setLeads(bounced);
        } catch (e) {
            console.error("Bounces fetch error", e);
        } finally {
            setLoading(false);
        }
    }, [agentFilter, dateRange]);

    useEffect(() => { fetchBounced(); }, [fetchBounced]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, agentFilter, dateRange]);

    const filteredLeads = useMemo(() => {
        return leads.filter(l =>
            l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [leads, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
    const paginatedLeads = filteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-5 pb-10 relative min-h-[500px]">
            {loading && leads.length === 0 && <BennettLoader />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Bounced Emails</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Leads whose emails bounced during outreach.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DateRangePicker value={dateRange as any} onUpdate={(r: any) => setDateRange(r.range)} />
                    <button
                        onClick={fetchBounced}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', cursor: 'default' }}
                    >
                        <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StatCard title="Total Bounced" value={leads.length.toString()} color="var(--label-primary)" />
                <StatCard title="In Current Filter" value={filteredLeads.length.toString()} color="var(--red)" />
            </div>

            {/* Filters */}
            <div className="liquid-card" style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                    <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--label-tertiary)' }} />
                    <Input
                        style={{ paddingLeft: 30, height: 36, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', fontSize: 12, borderRadius: 'var(--radius-md)' }}
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v as AgentKey | "all")}>
                    <SelectTrigger style={{ width: 190, height: 36, fontSize: 12, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                        <SelectValue placeholder="Agent" />
                    </SelectTrigger>
                    <SelectContent className="apple-dialog">
                        <SelectItem value="all">All Agents</SelectItem>
                        {AGENT_OPTIONS.map(a => (
                            <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Bounce Table */}
            <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <TableRow className="bg-[var(--fill-quaternary)] border-none hover:bg-[var(--fill-quaternary)]">
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Name</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Email</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Agent</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Status</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!loading && paginatedLeads.length === 0 ? (
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableCell colSpan={5} className="h-24 text-center text-[var(--label-secondary)]">
                                        No bounced emails found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedLeads.map((lead, idx) => {
                                    const dateObj = lead.createdAt ? new Date(lead.createdAt) : null;
                                    return (
                                        <TableRow key={lead.id || idx} className="hover:bg-[var(--fill-quaternary)] border-b border-[var(--separator)] transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div style={{ width: 28, height: 28, flexShrink: 0, background: 'rgba(255,69,58,0.08)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,69,58,0.15)' }}>
                                                        <Mail style={{ width: 13, height: 13, color: 'var(--red)' }} />
                                                    </div>
                                                    <span className="font-medium text-[var(--label-primary)]">{lead.name || "N/A"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[var(--label-secondary)]">{lead.email || "No Email"}</TableCell>
                                            <TableCell><AgentBadge agent={lead.agent} /></TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" style={{ background: 'rgba(255,69,58,0.10)', color: 'var(--red)', border: 'none', fontSize: 10, fontWeight: 700 }}>
                                                    Bounced
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-[var(--label-tertiary)]">
                                                {dateObj ? dateObj.toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
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

function StatCard({ title, value, color }: any) {
    return (
        <div className="liquid-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: color || 'var(--label-primary)', letterSpacing: 'var(--ls-metric)' }}>{value}</span>
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
