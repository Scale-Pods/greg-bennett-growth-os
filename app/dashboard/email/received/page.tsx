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
import { Search, RefreshCw, Loader2, Eye, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { BennettLoader } from "@/components/bennett-loader";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { AGENT_OPTIONS, AgentKey } from "@/lib/agents";
import { AgentBadge } from "@/components/agents/agent-badge";
import { SanitizedEmailBody } from "@/components/email/sanitized-email-body";
import type { NormalizedReply } from "@/lib/email-utils";

const ITEMS_PER_PAGE = 10;

function sentimentBadgeStyle(sentiment: string | null) {
    const s = (sentiment || '').toLowerCase();
    if (s === 'positive') return { background: 'rgba(48,209,88,0.12)', color: 'var(--green)' };
    if (s === 'negative') return { background: 'rgba(255,69,58,0.10)', color: 'var(--red)' };
    if (s === 'neutral') return { background: 'var(--fill-tertiary)', color: 'var(--label-secondary)' };
    return { background: 'var(--fill-tertiary)', color: 'var(--label-tertiary)' };
}

export default function ReceivedEmailsPage() {
    const [replies, setReplies] = useState<NormalizedReply[]>([]);
    const [loading, setLoading] = useState(true);
    const [agent, setAgent] = useState<AgentKey | "all">("all");
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [sentimentFilter, setSentimentFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewingReply, setViewingReply] = useState<NormalizedReply | null>(null);

    const fetchReplies = useCallback(async () => {
        setLoading(true);
        try {
            const from = startOfDay(dateRange.from).toISOString();
            const to = endOfDay(dateRange.to || dateRange.from).toISOString();
            const agentsToFetch = agent === "all" ? AGENT_OPTIONS.map(a => a.key) : [agent];

            const results = await Promise.all(
                agentsToFetch.map(async (key) => {
                    const res = await fetch(`/api/email/replies?agent=${key}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return Array.isArray(data.replies) ? data.replies : [];
                })
            );

            const flat: NormalizedReply[] = results.flat();
            const seen = new Set<string>();
            const deduped = flat.filter(r => {
                const dedupeKey = `${r.agent}-${r.messageId}`;
                if (seen.has(dedupeKey)) return false;
                seen.add(dedupeKey);
                return true;
            });
            deduped.sort((a, b) => new Date(b.replyTimestamp || 0).getTime() - new Date(a.replyTimestamp || 0).getTime());
            setReplies(deduped);
        } catch (err) {
            console.error("Error fetching replies:", err);
        } finally {
            setLoading(false);
        }
    }, [agent, dateRange]);

    useEffect(() => {
        fetchReplies();
    }, [fetchReplies]);

    useEffect(() => {
        setCurrentPage(1);
    }, [agent, dateRange, searchQuery, sentimentFilter]);

    const sentimentOptions = useMemo(() => {
        const set = new Set<string>();
        replies.forEach(r => { if (r.sentiment) set.add(r.sentiment); });
        return Array.from(set).sort();
    }, [replies]);

    const filteredReplies = useMemo(() => {
        return replies.filter(r => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matches =
                    r.lead?.name?.toLowerCase().includes(q) ||
                    r.lead?.email?.toLowerCase().includes(q) ||
                    r.leadEmailId?.toLowerCase().includes(q) ||
                    r.replySubject?.toLowerCase().includes(q);
                if (!matches) return false;
            }
            if (sentimentFilter !== "all" && r.sentiment !== sentimentFilter) return false;
            return true;
        });
    }, [replies, searchQuery, sentimentFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredReplies.length / ITEMS_PER_PAGE));
    const paginatedReplies = filteredReplies.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 relative min-h-[500px]">
            {loading && replies.length === 0 && <BennettLoader />}

            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Received Replies</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Replies from leads across your outreach campaigns.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DateRangePicker value={dateRange as any} onUpdate={(r: any) => setDateRange(r.range)} />
                    <Button variant="outline" size="sm" onClick={fetchReplies} className="border-[var(--glass-border)] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] text-[var(--label-primary)] h-9">
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
                            placeholder="Search by name, email, or subject..."
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
                    <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                        <SelectTrigger className="border-none" style={{ width: 160, height: 40, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                            <SelectValue placeholder="Sentiment" />
                        </SelectTrigger>
                        <SelectContent className="apple-dialog">
                            <SelectItem value="all">All Sentiments</SelectItem>
                            {sentimentOptions.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div style={{ background: 'var(--fill-secondary)', border: '1px solid var(--glass-border)', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, color: 'var(--label-secondary)' }}>
                        Total: {filteredReplies.length}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <TableRow className="bg-[var(--fill-quaternary)] border-none hover:bg-[var(--fill-quaternary)]">
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Lead</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Agent</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Subject</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Sentiment</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>AI Interest</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Reply Date</TableHead>
                                <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }} className="text-right">View</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && replies.length === 0 ? (
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableCell colSpan={7} className="h-20 text-center text-sm">
                                        <div className="flex items-center justify-center gap-2 text-[var(--label-secondary)]">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading replies...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedReplies.length === 0 ? (
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableCell colSpan={7} className="h-20 text-center text-sm text-[var(--label-secondary)]">
                                        No replies matching these filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedReplies.map((reply) => {
                                    const sentimentStyle = sentimentBadgeStyle(reply.sentiment);
                                    return (
                                        <TableRow key={`${reply.agent}-${reply.messageId}`} className="cursor-pointer hover:bg-[var(--fill-quaternary)] border-b border-[var(--separator)] transition-colors" onClick={() => setViewingReply(reply)}>
                                            <TableCell style={{ padding: '8px 16px' }}>
                                                {reply.lead ? (
                                                    <>
                                                        <div className="text-sm font-medium text-[var(--label-primary)]">{reply.lead.name}</div>
                                                        <div className="text-xs text-[var(--label-tertiary)]">{reply.lead.email}</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="text-sm font-medium text-[var(--label-primary)]">{reply.leadEmailId || 'Unknown'}</div>
                                                        <Badge variant="secondary" className="text-[10px] mt-1 bg-[var(--fill-secondary)] border border-[var(--glass-border)] text-[var(--label-tertiary)]">
                                                            Unmatched
                                                        </Badge>
                                                    </>
                                                )}
                                            </TableCell>
                                            <TableCell style={{ padding: '8px 16px' }}><AgentBadge agent={reply.agent} /></TableCell>
                                            <TableCell style={{ padding: '8px 16px' }} className="text-sm text-[var(--label-secondary)] max-w-[220px] truncate">
                                                {reply.replySubject || '—'}
                                            </TableCell>
                                            <TableCell style={{ padding: '8px 16px' }}>
                                                {reply.sentiment ? (
                                                    <Badge variant="secondary" style={{ ...sentimentStyle, border: 'none', fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>
                                                        {reply.sentiment}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-[var(--label-tertiary)]">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell style={{ padding: '8px 16px' }}>
                                                {reply.aiInterestScore !== null ? (
                                                    <div className="flex items-center gap-1 text-sm text-[var(--label-primary)] font-semibold">
                                                        <Sparkles size={12} className="text-[var(--purple)]" />
                                                        {reply.aiInterestScore}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-[var(--label-tertiary)]">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell style={{ padding: '8px 16px' }} className="text-sm text-[var(--label-secondary)]">
                                                {reply.replyTimestamp ? format(new Date(reply.replyTimestamp), 'PPp') : '—'}
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
                    totalItems={filteredReplies.length}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>

            <Dialog open={!!viewingReply} onOpenChange={(open) => { if (!open) setViewingReply(null); }}>
                <DialogContent className="apple-dialog max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle style={{ color: 'var(--label-primary)' }}>
                            {viewingReply?.replySubject || 'Reply'}
                        </DialogTitle>
                    </DialogHeader>
                    {viewingReply && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-4 text-xs text-[var(--label-tertiary)] flex-wrap">
                                <span>{viewingReply.lead?.name || viewingReply.leadEmailId}</span>
                                <span>•</span>
                                <span>{viewingReply.lead?.email || viewingReply.leadEmailId}</span>
                                {viewingReply.replyTimestamp && (
                                    <>
                                        <span>•</span>
                                        <span>{format(new Date(viewingReply.replyTimestamp), 'PPp')}</span>
                                    </>
                                )}
                            </div>
                            {viewingReply.sentimentReason && (
                                <div style={{ background: 'var(--fill-quaternary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Sentiment Reasoning</p>
                                    <p style={{ fontSize: 13, color: 'var(--label-secondary)' }}>{viewingReply.sentimentReason}</p>
                                </div>
                            )}
                            <div className="liquid-card" style={{ padding: 16 }}>
                                {viewingReply.cleanReplyText ? (
                                    <p style={{ fontSize: 13, color: 'var(--label-primary)', whiteSpace: 'pre-wrap' }}>
                                        {viewingReply.cleanReplyText}
                                    </p>
                                ) : viewingReply.emailBodySent ? (
                                    <SanitizedEmailBody html={viewingReply.emailBodySent} alreadySanitized={true} />
                                ) : (
                                    <p style={{ fontSize: 13, color: 'var(--label-tertiary)' }}>No content available.</p>
                                )}
                            </div>
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
