"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, subDays, endOfDay } from "date-fns";
import { Instagram, Linkedin, Facebook, Globe, Users, GraduationCap, Home, Mail, Phone, Clock, ChevronRight, ChevronLeft, Inbox } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/context/DataContext";

const LEADS_PER_PAGE = 10;

type BusinessId = "wealth" | "bootcamps" | "realty";

const SOURCE_STYLES: Record<string, { color: string; bg: string; icon: any }> = {
    instagram: { color: "#E1306C", bg: "rgba(225,48,108,0.12)", icon: Instagram },
    linkedin: { color: "#0A66C2", bg: "rgba(10,102,194,0.12)", icon: Linkedin },
    facebook: { color: "#1877F2", bg: "rgba(24,119,242,0.12)", icon: Facebook },
};

function getSourceStyle(source: string | null | undefined) {
    const key = (source || "").toLowerCase();
    for (const k in SOURCE_STYLES) {
        if (key.includes(k)) return SOURCE_STYLES[k];
    }
    return { color: "var(--label-tertiary)", bg: "var(--fill-tertiary)", icon: Globe };
}

function SourceBadge({ source }: { source: string | null | undefined }) {
    const style = getSourceStyle(source);
    const Icon = style.icon;
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: style.color, background: style.bg }}
        >
            <Icon size={10} />
            {source || "Unknown"}
        </span>
    );
}

export default function InboundLeadsClient({
    wealthLeads,
    realtyLeads,
    bootcampsLeads,
}: {
    wealthLeads: any[];
    realtyLeads: any[];
    bootcampsLeads: any[];
}) {
    const businesses: { id: BusinessId; label: string; icon: any; color: string; bg: string; data: any[] }[] = [
        { id: "wealth", label: "Wealth Builders", icon: Users, color: "#22c55e", bg: "rgba(34,197,94,0.15)", data: wealthLeads },
        { id: "bootcamps", label: "Bootcamps", icon: GraduationCap, color: "#f59e0b", bg: "rgba(245,158,11,0.15)", data: bootcampsLeads },
        { id: "realty", label: "Realty Solutions", icon: Home, color: "#6366f1", bg: "rgba(99,102,241,0.15)", data: realtyLeads },
    ];
    const [selectedBusiness, setSelectedBusiness] = useState<BusinessId>("wealth");
    const { dateRange } = useData();
    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [page, setPage] = useState(1);

    const activeBusinessObj = businesses.find(b => b.id === selectedBusiness)!;

    const activeLeads = useMemo(() => {
        return activeBusinessObj.data.filter(lead => {
            if (dateRange?.from && lead.created_at) {
                const leadDate = new Date(lead.created_at);
                if (leadDate < dateRange.from) return false;
                if (dateRange.to && leadDate > endOfDay(dateRange.to)) return false;
            }
            return true;
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [activeBusinessObj, dateRange]);

    useEffect(() => { setPage(1); }, [selectedBusiness, dateRange]);

    const totalPages = Math.max(1, Math.ceil(activeLeads.length / LEADS_PER_PAGE));
    const paginatedLeads = useMemo(() => {
        const start = (page - 1) * LEADS_PER_PAGE;
        return activeLeads.slice(start, start + LEADS_PER_PAGE);
    }, [activeLeads, page]);

    // Helper for total leads calculation considering date filter (for business cards)
    const getFilteredCount = (busData: any[]) => {
        return busData.filter(lead => {
            if (dateRange?.from && lead.created_at) {
                const leadDate = new Date(lead.created_at);
                if (leadDate < dateRange.from) return false;
                if (dateRange.to && leadDate > endOfDay(dateRange.to)) return false;
            }
            return true;
        }).length;
    };

    // Per-business questionnaire field mapping (matches each Supabase table's schema)
    const getQuestions = (lead: any, businessId: BusinessId) => {
        if (businessId === "wealth") {
            return [
                { q: "Strategy", a: lead.q1_strategy },
                { q: "Deals in 12mo", a: lead.q2_deals_12mo },
                { q: "Capital", a: lead.q3_capital },
                { q: "Market", a: lead.q4_market },
                { q: "Challenge", a: lead.q5_challenge },
                { q: "Income Goal", a: lead.q6_income_goal },
            ];
        }
        if (businessId === "realty") {
            return [
                { q: "Sell Timing", a: lead.q1_sell_timing },
                { q: "Occupied", a: lead.q2_occupied },
                { q: "Condition", a: lead.q3_condition },
                { q: "Timeline", a: lead.q4_timeline },
                { q: "Other Agent", a: lead.q5_other_agent },
                { q: "Property Address", a: lead.q6_property_address },
                { q: "Motivation", a: lead.q7_motivation },
            ];
        }
        // bootcamps
        return [
            { q: "Experience", a: lead.q1_experience },
            { q: "Strategy", a: lead.q2_strategy },
            { q: "Capital", a: lead.q3_capital },
            { q: "Target Market", a: lead.q4_target_market },
            { q: "Deals Completed", a: lead.q5_deals_completed },
            { q: "Challenge", a: lead.q6_challenge },
            { q: "Income Goal", a: lead.q7_income_goal },
        ];
    };

    // Per-business "key detail" column shown in the table (most distinguishing question)
    const getKeyDetail = (lead: any, businessId: BusinessId): { label: string; value: string } => {
        if (businessId === "wealth") return { label: "Capital", value: lead.q3_capital || "—" };
        if (businessId === "realty") return { label: "Property", value: lead.q6_property_address || "—" };
        return { label: "Target Market", value: lead.q4_target_market || "—" };
    };

    const renderLeadDetails = (lead: any, businessId: BusinessId) => {
        const qs = getQuestions(lead, businessId);

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="liquid-card p-3">
                        <div className="text-[10px] text-[var(--label-tertiary)] mb-1.5 uppercase tracking-wider">Contact</div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--label-primary)] mb-1.5">
                            <Mail size={12} className="text-[var(--label-secondary)]" /> {lead.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--label-primary)]">
                            <Phone size={12} className="text-[var(--label-secondary)]" /> {lead.phone || 'N/A'}
                        </div>
                    </div>
                    <div className="liquid-card p-3">
                        <div className="text-[10px] text-[var(--label-tertiary)] mb-1.5 uppercase tracking-wider">Status</div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[var(--label-secondary)]">Qualified</span>
                                <Badge variant={lead.qualified ? 'default' : 'destructive'} className="text-[10px] py-0">{lead.qualified ? 'Yes' : 'No'}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[var(--label-secondary)]">Score</span>
                                <span className="font-semibold">{lead.score ?? 0}/100</span>
                            </div>
                        </div>
                    </div>
                </div>

                {lead.summary && (
                    <div className="liquid-card p-3">
                        <div className="text-[10px] text-[var(--label-tertiary)] mb-1.5 uppercase tracking-wider">AI Summary</div>
                        <p className="text-xs text-[var(--label-secondary)] leading-relaxed">{lead.summary}</p>
                    </div>
                )}

                {lead.qualification_reason && (
                    <div className="liquid-card p-3">
                        <div className="text-[10px] text-[var(--label-tertiary)] mb-1.5 uppercase tracking-wider">Qualification Reason</div>
                        <p className="text-xs text-[var(--label-secondary)] leading-relaxed">{lead.qualification_reason}</p>
                    </div>
                )}

                <div className="liquid-card p-3">
                    <div className="text-[10px] text-[var(--label-tertiary)] mb-3 uppercase tracking-wider">Questionnaire</div>
                    <div className="space-y-2.5">
                        {qs.map((q, i) => (
                            <div key={i} className="flex flex-col gap-0.5 border-b border-[var(--separator)] pb-2.5 last:border-0 last:pb-0">
                                <span className="text-xs font-medium text-[var(--label-primary)]">{q.q}</span>
                                <span className="text-xs text-[var(--label-secondary)]">{q.a || '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const keyDetailLabel = selectedBusiness === "wealth" ? "Capital" : selectedBusiness === "realty" ? "Property" : "Target Market";

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-[var(--label-primary)]">Inbound Leads</h1>
            </div>

            {/* Business Selection */}
            <div>
                <h2 className="text-xs font-semibold text-[var(--label-secondary)] mb-3 uppercase tracking-wider">Select Business Unit</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {businesses.map(bus => {
                        const isSelected = selectedBusiness === bus.id;
                        const count = getFilteredCount(bus.data);
                        const Icon = bus.icon;
                        return (
                            <button
                                key={bus.id}
                                onClick={() => setSelectedBusiness(bus.id)}
                                className={`liquid-card p-4 flex flex-col gap-3 transition-all duration-200 text-left ${
                                    isSelected ? `shadow-md scale-[1.01]` : 'hover:bg-[var(--fill-tertiary)]'
                                }`}
                                style={{
                                    boxShadow: isSelected ? `0 0 0 1.5px ${bus.color}, 0 0 15px ${bus.color}15` : 'none'
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: bus.bg, color: bus.color }}>
                                        <Icon size={14} />
                                    </div>
                                    <span className={`text-sm font-medium ${isSelected ? 'text-[var(--label-primary)]' : 'text-[var(--label-secondary)]'}`}>
                                        {bus.label}
                                    </span>
                                </div>
                                <div className="flex items-end justify-between w-full">
                                    <span className="text-xl font-bold tabular-nums" style={{ color: isSelected ? bus.color : 'var(--label-primary)' }}>
                                        {count}
                                    </span>
                                    <span className="text-[10px] text-[var(--label-tertiary)] uppercase tracking-wider">Total Leads</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Leads List */}
            <div className="liquid-card overflow-hidden">
                <div className="p-4 border-b border-[var(--separator)] flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-[var(--label-primary)]">Leads List</h3>
                        <p className="text-xs text-[var(--label-tertiary)] mt-0.5">
                            Showing {activeLeads.length} leads for {activeBusinessObj.label}
                        </p>
                    </div>
                </div>

                {activeLeads.length === 0 ? (
                    <div className="p-8 flex flex-col items-center justify-center text-[var(--label-tertiary)]">
                        <Inbox size={32} className="mb-3 opacity-50" />
                        <p className="text-sm">No leads found for this selection.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-[var(--label-secondary)]">
                                <thead className="bg-[var(--fill-secondary)] text-[10px] uppercase tracking-wider text-[var(--label-tertiary)]">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Contact</th>
                                        <th className="px-4 py-3 font-medium">Source</th>
                                        <th className="px-4 py-3 font-medium">{keyDetailLabel}</th>
                                        <th className="px-4 py-3 font-medium">Created At</th>
                                        <th className="px-4 py-3 font-medium">Score</th>
                                        <th className="px-4 py-3 font-medium">Stage</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--separator)]">
                                    {paginatedLeads.map((lead: any) => {
                                        const style = getSourceStyle(lead.source);
                                        const keyDetail = getKeyDetail(lead, selectedBusiness);
                                        return (
                                            <tr
                                                key={lead.id}
                                                onClick={() => setSelectedLead(lead)}
                                                className="hover:bg-[var(--fill-tertiary)] cursor-pointer transition-colors"
                                                style={{ borderLeft: `3px solid ${style.color}` }}
                                            >
                                                <td className="px-4 py-3 font-medium text-[var(--label-primary)] whitespace-nowrap">{lead.name || 'Unknown'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span>{lead.email || '—'}</span>
                                                        <span className="text-[10px] text-[var(--label-tertiary)]">{lead.phone || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <SourceBadge source={lead.source} />
                                                </td>
                                                <td className="px-4 py-3 max-w-[200px] truncate" title={keyDetail.value}>
                                                    {keyDetail.value}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {lead.created_at ? format(new Date(lead.created_at), 'MMM dd, yyyy') : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-6 h-6 rounded-full bg-[var(--fill-secondary)] flex items-center justify-center font-semibold text-[10px] text-[var(--label-primary)]">
                                                            {lead.score ?? 0}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="text-[10px] py-0">{lead.lead_stage || 'New'}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <ChevronRight size={14} className="text-[var(--label-tertiary)] ml-auto" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--separator)] bg-[var(--fill-quaternary)]">
                                <p className="text-[11px] text-[var(--label-tertiary)]">
                                    Showing <span className="font-semibold text-[var(--label-primary)]">{(page - 1) * LEADS_PER_PAGE + 1}</span>
                                    {" – "}
                                    <span className="font-semibold text-[var(--label-primary)]">{Math.min(page * LEADS_PER_PAGE, activeLeads.length)}</span>
                                    {" of "}
                                    <span className="font-semibold text-[var(--label-primary)]">{activeLeads.length}</span>
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--glass-border)] bg-[var(--fill-tertiary)] text-[var(--label-secondary)] text-[11px] font-medium disabled:opacity-40 transition-colors"
                                    >
                                        <ChevronLeft size={12} /> Prev
                                    </button>
                                    <span className="text-[11px] font-semibold text-[var(--label-secondary)] px-2">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--glass-border)] bg-[var(--fill-tertiary)] text-[var(--label-secondary)] text-[11px] font-medium disabled:opacity-40 transition-colors"
                                    >
                                        Next <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Lead Details Modal */}
            <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
                <DialogContent className="apple-dialog max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg">
                            {selectedLead?.name || 'Lead Details'}
                        </DialogTitle>
                        <div className="text-xs text-[var(--label-tertiary)] flex items-center gap-1.5 mt-1">
                            <Clock size={10} />
                            {selectedLead?.created_at ? format(new Date(selectedLead.created_at), 'PPpp') : '—'}
                            <span>•</span>
                            <SourceBadge source={selectedLead?.source} />
                        </div>
                    </DialogHeader>

                    <Tabs defaultValue="details" className="w-full mt-2">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="email">Email Content</TabsTrigger>
                            <TabsTrigger value="conversation">Conversation</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="mt-4 outline-none">
                            {selectedLead && renderLeadDetails(selectedLead, selectedBusiness)}
                        </TabsContent>
                        <TabsContent value="email" className="mt-4 outline-none">
                            <div className="liquid-card p-4">
                                <div className="text-[10px] text-[var(--label-tertiary)] mb-1.5 uppercase tracking-wider">Date Received</div>
                                <div className="text-sm text-[var(--label-primary)] mb-4">
                                    {selectedLead?.created_at ? format(new Date(selectedLead.created_at), 'PPpp') : '—'}
                                </div>
                                <div className="text-[10px] text-[var(--label-tertiary)] mb-1.5 uppercase tracking-wider">Email Content</div>
                                {selectedLead?.email_content ? (
                                    <div 
                                        className="bg-white text-black rounded-lg p-4 overflow-x-auto" 
                                        dangerouslySetInnerHTML={{ __html: selectedLead.email_content }} 
                                    />
                                ) : (
                                    <div className="text-sm text-[var(--label-secondary)] whitespace-pre-wrap leading-relaxed">
                                        No email content available.
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="conversation" className="mt-4 outline-none">
                            <div className="liquid-card p-4">
                                <div className="text-[10px] text-[var(--label-tertiary)] mb-4 uppercase tracking-wider">Chat History</div>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {(() => {
                                        let conv = selectedLead?.conversation;
                                        if (typeof conv === 'string') {
                                            try { conv = JSON.parse(conv); } catch (e) { conv = null; }
                                        }
                                        if (!Array.isArray(conv) || conv.length === 0) {
                                            return (
                                                <div className="text-sm text-[var(--label-secondary)] text-center py-8">
                                                    No conversation history available.
                                                </div>
                                            );
                                        }
                                        return conv.map((msg: any, idx: number) => (
                                            <div key={idx} className={`flex flex-col ${msg.role === 'lead' ? 'items-end' : 'items-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'lead' ? 'bg-[var(--accent)] text-white rounded-br-none' : 'bg-[var(--fill-secondary)] text-[var(--label-primary)] rounded-bl-none'}`}>
                                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                </div>
                                                <span className="text-[10px] text-[var(--label-tertiary)] mt-1 mx-1">
                                                    {msg.timestamp ? format(new Date(msg.timestamp), 'h:mm a') : ''}
                                                </span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
}
