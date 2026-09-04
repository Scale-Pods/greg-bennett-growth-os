"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, Loader2, Eye, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { BennettLoader } from "@/components/bennett-loader";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { AGENT_OPTIONS, AgentKey } from "@/lib/agents";
import { AgentBadge } from "@/components/agents/agent-badge";
import { SanitizedEmailBody } from "@/components/email/sanitized-email-body";
import type { NormalizedLead } from "@/lib/leads-utils";

interface SentEmailRow {
    lead: NormalizedLead;
    step: 1 | 2;
    body: string | null;
    status: string | null;
    sentAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function SentEmailsPage() {
    const [leads, setLeads] = useState<NormalizedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [agent, setAgent] = useState<AgentKey | "all">("all");
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewingEmail, setViewingEmail] = useState<SentEmailRow | null>(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const from = startOfDay(dateRange.from).toISOString();
            const to = endOfDay(dateRange.to || dateRange.from).toISOString();
            const agentsToFetch = agent === "all" ? AGENT_OPTIONS.map(a => a.key) : [agent];

            const results = await Promise.all(
                agentsToFetch.map(async (key) => {
                    const res = await fetch(`/api/leads?agent=${key}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return Array.isArray(data.leads) ? data.leads : [];
                })
            );

            const flat: NormalizedLead[] = results.flat();
            const seen = new Set<string>();
            const deduped = flat.filter(l => {
                const dedupeKey = `${l.agent}-${l.id}`;
                if (seen.has(dedupeKey)) return false;
                seen.add(dedupeKey);
                return true;
            });
            setLeads(deduped);
        } catch (err) {
            console.error("Error fetching sent emails:", err);
        } finally {
            setLoading(false);
        }
    }, [agent, dateRange]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    useEffect(() => {
        setCurrentPage(1);
    }, [agent, dateRange, searchQuery]);

    const rows = useMemo(() => {
        const flat: SentEmailRow[] = [];
        for (const lead of leads) {
            if (lead.email1.sentAt) {
                flat.push({ lead, step: 1, body: lead.email1.body, status: lead.email1.status, sentAt: lead.email1.sentAt });
            }
            if (lead.email2.sentAt) {
                flat.push({ lead, step: 2, body: lead.email2.body, status: lead.email2.status, sentAt: lead.email2.sentAt });
            }
        }
        flat.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
        return flat;
    }, [leads]);

    const filteredRows = useMemo(() => {
        if (!searchQuery) return rows;
        const q = searchQuery.toLowerCase();
        return rows.filter(r => r.lead.name?.toLowerCase().includes(q) || r.lead.email?.toLowerCase().includes(q));
    }, [rows, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
    const paginatedRows = filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 relative min-h-[500px]">
            {loading && rows.length === 0 && <BennettLoader />}

            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Sent Emails</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Emails sent to leads via the outreach sequence.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DateRangePicker value={dateRange as any} onUpdate={(r: any) => setDateRange(r.range)} />
                    <Button variant="outline" size="sm" onClick={fetchLeads} className="border-[var(--glass-border)] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] text-[var(--label-primary)] h-9">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', background: 'var(--fill-quaternary)', borderBottom: '1px solid var(--separator)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--label-tertiary)', pointerEvents: 'none' }} />
                        <Input
                            placeholder="Search by recipient name or email..."
                            className="border-none"
                            style={{ paddingLeft: 36, height: 40, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)', fontSize: 13 }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={agent} onValueChange={(v) => setAgent(v as AgentKey | "all")}>
                        <SelectTrigger className="border-none" style={{ width: 190, height: 40, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                            <SelectValue placeholder="Agent" />
                        </SelectTrigger>
                        <SelectContent className="apple-dialog">
                            <SelectItem value="all">All Agents</SelectItem>
                            {AGENT_OPTIONS.map(a => (
                                <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div style={{ background: 'var(--fill-secondary)', border: '1px solid var(--glass-border)', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, color: 'var(--label-secondary)' }}>
                        Total: {filteredRows.length}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <TableRow className="bg-[var(--fill-quaternary)] border-none hover:bg-[var(--fill-quaternary)]">
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Recipient</TableHead>
                                {agent === "all" && <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Agent</TableHead>}
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Step</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Status</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Sent At</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }} className="text-right">View</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && rows.length === 0 ? (
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableCell colSpan={agent === "all" ? 6 : 5} className="h-20 text-center text-sm">
                                        <div className="flex items-center justify-center gap-2 text-[var(--label-secondary)]">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading sent emails...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedRows.length === 0 ? (
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableCell colSpan={agent === "all" ? 6 : 5} className="h-20 text-center text-sm text-[var(--label-secondary)]">
                                        No sent emails matching these filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRows.map((row, idx) => {
                                    const statusLower = (row.status || '').toLowerCase();
                                    const isSent = statusLower.includes('sent') || statusLower.includes('delivered');
                                    return (
                                        <TableRow
                                            key={`${row.lead.agent}-${row.lead.id}-${row.step}-${idx}`}
                                            className="cursor-pointer hover:bg-[var(--fill-quaternary)] border-b border-[var(--separator)] transition-colors"
                                            onClick={() => setViewingEmail(row)}
                                        >
                                            <TableCell style={{ padding: '8px 16px' }}>
                                                <div className="text-sm font-medium text-[var(--label-primary)]">{row.lead.name}</div>
                                                <div className="flex items-center gap-1.5 text-xs text-[var(--label-tertiary)]">
                                                    <Mail size={11} /> {row.lead.email || 'No Email'}
                                                </div>
                                            </TableCell>
                                            {agent === "all" && <TableCell style={{ padding: '8px 16px' }}><AgentBadge agent={row.lead.agent} /></TableCell>}
                                            <TableCell style={{ padding: '8px 16px' }}>
                                                <Badge variant="secondary" className="badge-blue border-none text-[11px] font-bold">
                                                    Email {row.step}
                                                </Badge>
                                            </TableCell>
                                            <TableCell style={{ padding: '8px 16px' }}>
                                                <Badge variant={isSent ? "default" : "secondary"} className={isSent ? "badge-green border-none font-medium" : "text-[var(--label-secondary)] bg-[var(--fill-secondary)] border-[var(--glass-border)]"}>
                                                    {row.status || 'Unknown'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell style={{ padding: '8px 16px' }} className="text-sm text-[var(--label-secondary)]">
                                                {format(new Date(row.sentAt), 'PPp')}
                                            </TableCell>
                                            <TableCell style={{ padding: '8px 16px' }} className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-[var(--label-secondary)] hover:text-[var(--blue)] pointer-events-none"
                                                    tabIndex={-1}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <PaginationFooter
                    totalItems={filteredRows.length}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>

            <Dialog open={!!viewingEmail} onOpenChange={(open) => { if (!open) setViewingEmail(null); }}>
                <DialogContent className="apple-dialog max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle style={{ color: 'var(--label-primary)' }}>
                            Email {viewingEmail?.step} to {viewingEmail?.lead.name}
                        </DialogTitle>
                    </DialogHeader>
                    {viewingEmail && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-4 text-xs text-[var(--label-tertiary)]">
                                <span>{viewingEmail.lead.email}</span>
                                <span>•</span>
                                <span>{format(new Date(viewingEmail.sentAt), 'PPp')}</span>
                            </div>
                            <SanitizedEmailBody html={viewingEmail.body} alreadySanitized={false} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function PaginationFooter({ totalItems, currentPage, itemsPerPage, onPageChange }: any) {
    if (totalItems <= itemsPerPage) return null;

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="px-4 py-2.5 border-t border-[var(--separator)] bg-[var(--fill-quaternary)] flex items-center justify-between">
            <p className="text-xs text-[var(--label-secondary)]">
                Showing <span className="font-bold text-[var(--label-primary)]">{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)}</span> of {totalItems} items
            </p>
            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 border-[var(--glass-border)] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] text-[var(--label-primary)]"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--label-secondary)', padding: '0 6px' }}>Page {currentPage} of {totalPages}</span>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 border-[var(--glass-border)] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] text-[var(--label-primary)]"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
