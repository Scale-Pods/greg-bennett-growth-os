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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, Instagram, Facebook, Clock, CheckCircle2, XCircle, AlertTriangle, Image as ImageIcon, Film, Layers } from "lucide-react";
import { BennettLoader } from "@/components/bennett-loader";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format, subDays } from "date-fns";
import type { SocialContentItem } from "@/app/api/content/social/route";

const ITEMS_PER_PAGE = 10;

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending_approval: { label: "Pending", color: "var(--orange)", icon: <Clock size={12} /> },
    approved: { label: "Approved", color: "var(--blue)", icon: <CheckCircle2 size={12} /> },
    posted: { label: "Posted", color: "var(--green)", icon: <CheckCircle2 size={12} /> },
    rejected: { label: "Rejected", color: "var(--red)", icon: <XCircle size={12} /> },
    failed: { label: "Failed", color: "var(--red)", icon: <AlertTriangle size={12} /> },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
    image: <ImageIcon size={12} />,
    video: <Film size={12} />,
    carousel: <Layers size={12} />,
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status] || { label: status, color: "var(--label-tertiary)", icon: null };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 'var(--radius-xs)',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            background: `${cfg.color}1A`, color: cfg.color,
        }}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
}

function PlatformIcons({ item }: { item: SocialContentItem }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.postToInstagram && (
                <span title={item.instagramPostId ? `Posted: ${item.instagramPostId}` : 'Instagram'} style={{ display: 'flex', color: item.instagramPostId ? '#E1306C' : 'var(--label-quaternary)' }}>
                    <Instagram size={14} />
                </span>
            )}
            {item.postToFacebook && (
                <span title={item.facebookPostId ? `Posted: ${item.facebookPostId}` : 'Facebook'} style={{ display: 'flex', color: item.facebookPostId ? '#1877F2' : 'var(--label-quaternary)' }}>
                    <Facebook size={14} />
                </span>
            )}
        </div>
    );
}

function MetricTile({ title, value, accentColor, icon }: {
    title: string; value: string | number; accentColor: string; icon: React.ReactNode;
}) {
    return (
        <div className="liquid-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${accentColor} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: accentColor }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</p>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: 'var(--ls-metric)', lineHeight: 1.1, marginTop: 2 }}>{value}</h3>
            </div>
        </div>
    );
}

export default function SocialContentPage() {
    const [rows, setRows] = useState<SocialContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string>("all");
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewing, setViewing] = useState<SocialContentItem | null>(null);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const from = dateRange.from.toISOString();
            const to = (dateRange.to || dateRange.from).toISOString();
            const res = await fetch(`/api/content/social?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
            if (!res.ok) { setRows([]); return; }
            const data = await res.json();
            setRows(Array.isArray(data.rows) ? data.rows : []);
        } catch (err) {
            console.error("Error fetching social content:", err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => { fetchRows(); }, [fetchRows]);
    useEffect(() => { setCurrentPage(1); }, [status, dateRange, searchQuery]);

    const filteredRows = useMemo(() => {
        let out = rows;
        if (status !== "all") out = out.filter(r => r.status === status);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            out = out.filter(r =>
                (r.caption || "").toLowerCase().includes(q) ||
                (r.driveFileName || "").toLowerCase().includes(q) ||
                (r.brand || "").toLowerCase().includes(q) ||
                (r.targetPage || "").toLowerCase().includes(q)
            );
        }
        return out;
    }, [rows, status, searchQuery]);

    const metrics = useMemo(() => {
        const pending = rows.filter(r => r.status === 'pending_approval').length;
        const posted = rows.filter(r => r.status === 'posted').length;
        const failed = rows.filter(r => r.status === 'failed' || r.status === 'rejected').length;
        return { total: rows.length, pending, posted, failed };
    }, [rows]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
    const paginatedRows = filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const fmt = (d: string | null) => d ? format(new Date(d), "MMM d, h:mm a") : "—";

    return (
        <div className="space-y-6 relative min-h-[500px]">
            {loading && rows.length === 0 && <BennettLoader />}

            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Facebook & Instagram</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Repurposed content queued, approved, and posted across social pages.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DateRangePicker value={dateRange as any} onUpdate={r => setDateRange(r.range as any)} />
                    <button
                        onClick={fetchRows}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)' }}
                    >
                        <RefreshCw style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <MetricTile title="Total" value={metrics.total} accentColor="var(--label-secondary)" icon={<Layers size={16} />} />
                <MetricTile title="Pending Review" value={metrics.pending} accentColor="var(--orange)" icon={<Clock size={16} />} />
                <MetricTile title="Posted" value={metrics.posted} accentColor="var(--green)" icon={<CheckCircle2 size={16} />} />
                <MetricTile title="Failed / Rejected" value={metrics.failed} accentColor="var(--red)" icon={<XCircle size={16} />} />
            </div>

            <div className="liquid-card" style={{ padding: 16 }}>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--label-tertiary)' }} />
                        <Input
                            placeholder="Search caption, file, brand, page..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: 32, height: 34, fontSize: 12 }}
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger style={{ width: 170, height: 34, fontSize: 12 }}>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending_approval">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="posted">Posted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Content</TableHead>
                            <TableHead>Brand / Page</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Platforms</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Scheduled</TableHead>
                            <TableHead>Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--label-tertiary)', fontSize: 13 }}>
                                    No content found for this range.
                                </TableCell>
                            </TableRow>
                        )}
                        {paginatedRows.map(r => (
                            <TableRow key={r.id} onClick={() => setViewing(r)} style={{ cursor: 'pointer' }}>
                                <TableCell style={{ maxWidth: 260 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {r.caption ? r.caption.slice(0, 60) : (r.driveFileName || 'Untitled')}
                                    </div>
                                    {r.errorMessage && (
                                        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <AlertTriangle size={10} /> {r.errorMessage.slice(0, 60)}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell style={{ fontSize: 12, color: 'var(--label-secondary)' }}>
                                    {r.brand || r.targetPage || '—'}
                                </TableCell>
                                <TableCell>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--label-secondary)', textTransform: 'capitalize' }}>
                                        {TYPE_ICON[r.contentType]} {r.contentType}
                                    </span>
                                </TableCell>
                                <TableCell><PlatformIcons item={r} /></TableCell>
                                <TableCell><StatusBadge status={r.status} /></TableCell>
                                <TableCell style={{ fontSize: 12, color: 'var(--label-secondary)' }}>{fmt(r.scheduledAt)}</TableCell>
                                <TableCell style={{ fontSize: 12, color: 'var(--label-secondary)' }}>{fmt(r.createdAt)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--separator)' }}>
                        <span style={{ fontSize: 12, color: 'var(--label-tertiary)' }}>
                            Page {currentPage} of {totalPages} · {filteredRows.length} total
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', opacity: currentPage === 1 ? 0.5 : 1 }}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', opacity: currentPage === totalPages ? 0.5 : 1 }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
                <DialogContent className="app-dialog sm:max-w-[560px]">
                    {viewing && (
                        <>
                            <DialogHeader>
                                <DialogTitle style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.022em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <PlatformIcons item={viewing} />
                                    {viewing.driveFileName || 'Content Detail'}
                                </DialogTitle>
                            </DialogHeader>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <StatusBadge status={viewing.status} />
                                    <span style={{ fontSize: 11, color: 'var(--label-tertiary)', textTransform: 'capitalize' }}>{viewing.contentType}</span>
                                    {viewing.brand && <span style={{ fontSize: 11, color: 'var(--label-tertiary)' }}>· {viewing.brand}</span>}
                                    {viewing.targetPage && <span style={{ fontSize: 11, color: 'var(--label-tertiary)' }}>· {viewing.targetPage}</span>}
                                </div>

                                {viewing.fileUrl && viewing.contentType === 'image' && (
                                    <img src={viewing.fileUrl} alt={viewing.altText || ''} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                                )}
                                {viewing.fileUrl && viewing.contentType === 'video' && (
                                    <video src={viewing.fileUrl} controls style={{ width: '100%', maxHeight: 280, borderRadius: 'var(--radius-md)' }} />
                                )}

                                <div>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Caption</p>
                                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}>
                                        {viewing.caption || '—'}
                                    </p>
                                </div>

                                {viewing.hashtags && (
                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Hashtags</p>
                                        <p style={{ fontSize: 12, color: 'var(--blue)' }}>{viewing.hashtags}</p>
                                    </div>
                                )}

                                {viewing.rejectionReason && (
                                    <div style={{ background: 'rgba(255,69,58,0.08)', borderRadius: 'var(--radius-md)', padding: 10 }}>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Rejection Reason</p>
                                        <p style={{ fontSize: 12, color: 'var(--label-primary)' }}>{viewing.rejectionReason}</p>
                                    </div>
                                )}

                                {viewing.errorMessage && (
                                    <div style={{ background: 'rgba(255,69,58,0.08)', borderRadius: 'var(--radius-md)', padding: 10 }}>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Error</p>
                                        <p style={{ fontSize: 12, color: 'var(--label-primary)' }}>{viewing.errorMessage}</p>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 8, borderTop: '1px solid var(--separator)' }}>
                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scheduled</p>
                                        <p style={{ fontSize: 13, color: 'var(--label-primary)', marginTop: 2 }}>{fmt(viewing.scheduledAt)}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caption Source</p>
                                        <p style={{ fontSize: 13, color: 'var(--label-primary)', marginTop: 2, textTransform: 'capitalize' }}>{(viewing.captionSource || '—').replace('_', ' ')}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created</p>
                                        <p style={{ fontSize: 13, color: 'var(--label-primary)', marginTop: 2 }}>{fmt(viewing.createdAt)}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Updated</p>
                                        <p style={{ fontSize: 13, color: 'var(--label-primary)', marginTop: 2 }}>{fmt(viewing.updatedAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
