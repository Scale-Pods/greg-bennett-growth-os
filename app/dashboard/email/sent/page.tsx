"use client";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    Filter,
    Mail,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    ArrowLeft,
    Reply,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, subDays } from "date-fns";

import { useData } from "@/context/DataContext";
import { BennettLoader } from "@/components/bennett-loader";


const ITEMS_PER_PAGE = 7;

export default function SentEmailsPage() {
    const { leads: allLeads, loadingLeads } = useData();
    const [page, setPage] = useState(1);
    const { dateRange, setDateRange } = useData();
    const [sentEmails, setSentEmails] = useState<any[]>([]);
    const loading = loadingLeads;
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({ campaign: "all", sender: "all", type: "all" });

    useEffect(() => {
        const fetchData = async () => {
            if (loadingLeads) return;
            try {
                const emails: any[] = [];
                allLeads.forEach((lead: any, leadIndex: number) => {
                    const stages = lead.stages_passed || [];
                    let sEmail = (lead.sender_email || lead["Sender Email"] || "").trim();
                    let sName = (lead.sender_name || lead["Sender Name"] || "").trim();
                    let extractedEmail = sEmail;
                    let extractedNameFromEmail = "";
                    if (sEmail.includes("<") && sEmail.includes(">")) {
                        const m = sEmail.match(/^(.*?)<(.*?)>$/);
                        if (m) { extractedNameFromEmail = m[1].trim().replace(/^"|"$/g, ""); extractedEmail = m[2].trim(); }
                    }
                    const displayName = sName || extractedNameFromEmail || "";
                    const displayEmail = extractedEmail || sEmail || "";
                    let fullSender = "";
                    if (displayName && displayEmail && displayEmail.includes("@")) {
                        fullSender = displayName.toLowerCase() === displayEmail.toLowerCase() ? displayEmail : `${displayName} (${displayEmail})`;
                    } else { fullSender = displayName || displayEmail || "Unknown Sender"; }
                    if (fullSender.includes("<>")) fullSender = fullSender.replace("<>", "").trim();

                    const emailReply = lead.email_replied;
                    const hasReplied = !!(emailReply && emailReply !== "No" && String(emailReply).trim() !== "");

                    stages.forEach((stage: string) => {
                        if (!stage.startsWith("Email_")) return;
                        const rawContent = lead.stage_data?.[stage];
                        let rawDateValue: string | null = lead.created_at || null;
                        let emailBody = "Email sent – no content stored.";
                        let sentDate: string | null = null;

                        if (rawContent && typeof rawContent === "string") {
                            const trimmed = rawContent.trim();
                            const lines = trimmed.split("\n");
                            const lastLine = lines[lines.length - 1].trim();
                            const fullDate = new Date(trimmed);
                            const lastLineDate = new Date(lastLine);
                            if (!isNaN(fullDate.getTime()) && trimmed.length < 50) {
                                rawDateValue = fullDate.toISOString();
                                sentDate = format(fullDate, "MMM dd, yyyy • p");
                                emailBody = "Email sent";
                            } else if (!isNaN(lastLineDate.getTime()) && lastLine.includes("-") && lastLine.includes(":")) {
                                rawDateValue = lastLineDate.toISOString();
                                sentDate = format(lastLineDate, "MMM dd, yyyy • p");
                                emailBody = lines.slice(0, -1).join("\n").trim() || "Email sent";
                            } else { emailBody = rawContent; }
                        }

                        emails.push({
                            id: `${lead.id || `lead-${leadIndex}`}-${stage.replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 11)}`,
                            recipient: lead.email || lead.name || `Lead ${leadIndex + 1}`,
                            sender: fullSender,
                            type: stage,
                            sentDate,
                            subject: stage,
                            content: emailBody,
                            loop: lead.source_loop || "Intro",
                            rawDate: rawDateValue,
                            hasReplied,
                        });
                    });
                });

                emails.sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());
                setSentEmails(emails);
            } catch (err) { console.error("Sent emails processing error", err); }
        };
        fetchData();
    }, [allLeads, loadingLeads]);

    const uniqueSenders = Array.from(new Set(sentEmails.map((e) => e.sender))).sort();

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const filteredEmails = sentEmails.filter((email) => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!email.recipient.toLowerCase().includes(q) && !email.subject.toLowerCase().includes(q) && !email.content.toLowerCase().includes(q)) return false;
        }
        if (dateRange?.from) {
            const ed = email.rawDate ? new Date(email.rawDate) : null;
            if (!ed || isNaN(ed.getTime())) return false;
            const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
            const to = dateRange.to ? new Date(dateRange.to) : new Date(from); to.setHours(23, 59, 59, 999);
            if (ed < from || ed > to) return false;
        }
        if (filters.campaign !== "all") {
            const loop = (email.loop || "").toLowerCase();
            if (filters.campaign === "intro" && !loop.includes("intro")) return false;
            if (filters.campaign === "nurture" && !loop.includes("nurture")) return false;
            if (filters.campaign === "followup" && !loop.includes("follow")) return false;
        }
        if (filters.sender !== "all" && email.sender !== filters.sender) return false;
        if (filters.type !== "all") {
            const typeMap: Record<string, string> = { email1: "email 1", email2: "email 2", email3: "email 3", email4: "email 4", email5: "email 5", email6: "email 6", email7: "email 7", email8: "email 8", email9: "email 9", email10: "email 10" };
            const expected = typeMap[filters.type];
            if (expected && !email.type.toLowerCase().includes(expected)) return false;
        }
        return true;
    });

    const totalPages = Math.ceil(filteredEmails.length / ITEMS_PER_PAGE);
    const paginatedEmails = filteredEmails.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="space-y-5 pb-10 max-w-5xl mx-auto relative min-h-[500px]">
            {loading && <BennettLoader />}


            {/* Search & Filters */}
            <div className="liquid-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--label-tertiary)' }} />
                        <Input
                            placeholder="Search recipients, subjects..."
                            style={{ paddingLeft: 30, height: 36, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', fontSize: 12, borderRadius: 'var(--radius-md)' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Filter style={{ width: 13, height: 13, color: 'var(--label-tertiary)', marginRight: 2 }} />

                    <Select value={filters.campaign} onValueChange={(val) => handleFilterChange("campaign", val)}>
                        <SelectTrigger style={{ width: 140, height: 32, fontSize: 12 }}><SelectValue placeholder="Campaign" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Campaigns</SelectItem>
                            <SelectItem value="intro">Intro Loop</SelectItem>
                            <SelectItem value="followup">Follow Up</SelectItem>
                            <SelectItem value="nurture">Nurture Loop</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.sender} onValueChange={(val) => handleFilterChange("sender", val)}>
                        <SelectTrigger style={{ width: 160, height: 32, fontSize: 12 }}><SelectValue placeholder="Sender" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Senders</SelectItem>
                            {uniqueSenders.map((sender) => (<SelectItem key={sender} value={sender}>{sender}</SelectItem>))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.type} onValueChange={(val) => handleFilterChange("type", val)}>
                        <SelectTrigger style={{ width: 140, height: 32, fontSize: 12 }}><SelectValue placeholder="Email Type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {[1,2,3,4,5,6,7,8,9].map(n => <SelectItem key={n} value={`email${n}`}>Email {n}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <button
                        style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--label-secondary)', background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', padding: '5px 12px', borderRadius: 'var(--radius-sm)', cursor: 'default', height: 32 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                        onClick={() => { setSearchQuery(""); setFilters({ campaign: "all", sender: "all", type: "all" }); setPage(1); }}
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* Email Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!loading && paginatedEmails.length > 0 ? (
                    paginatedEmails.map((email) => <SentEmailCard key={email.id} email={email} />)
                ) : !loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--label-tertiary)', border: '1px dashed var(--hairline)', borderRadius: 'var(--radius-xl)' }}>
                        <Mail style={{ width: 28, height: 28, marginBottom: 8, opacity: 0.4 }} />
                        <p style={{ fontSize: 13 }}>No emails found matching your filters</p>
                    </div>
                ) : null}
            </div>

            {/* Pagination */}
            {!loading && filteredEmails.length > ITEMS_PER_PAGE && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                    <p style={{ fontSize: 12, color: 'var(--label-tertiary)' }}>
                        Showing <span style={{ fontWeight: 700, color: 'var(--label-primary)' }}>{(page - 1) * ITEMS_PER_PAGE + 1}</span>–<span style={{ fontWeight: 700, color: 'var(--label-primary)' }}>{Math.min(page * ITEMS_PER_PAGE, filteredEmails.length)}</span> of <span style={{ fontWeight: 700, color: 'var(--label-primary)' }}>{filteredEmails.length}</span>
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', fontSize: 12, fontWeight: 500, cursor: 'default', opacity: page === 1 ? 0.4 : 1 }}
                            onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                        >
                            <ArrowLeft style={{ width: 12, height: 12 }} /> Previous
                        </button>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-secondary)', padding: '0 8px' }}>Page {page} of {totalPages}</span>
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)', fontSize: 12, fontWeight: 500, cursor: 'default', opacity: page === totalPages ? 0.4 : 1 }}
                            onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                        >
                            Next <ArrowRight style={{ width: 12, height: 12 }} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function SentEmailCard({ email }: { email: any }) {
    const [isOpen, setIsOpen] = useState(false);

    const stripHtml = (html: string) => {
        if (!html) return "";
        return html.replace(/<(br|p|div|li|h[1-6])[^>]*>/gi, " ").replace(/<\/?[^>]+(>|$)/g, "");
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="liquid-card" style={{ padding: 0, overflow: 'hidden', transition: 'all 150ms' }}>
            <CollapsibleTrigger asChild>
                <div style={{ padding: '14px 18px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 38, height: 38, flexShrink: 0, background: 'rgba(48,209,88,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(48,209,88,0.2)' }}>
                                <Mail style={{ width: 16, height: 16, color: 'var(--green)' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--fill-tertiary)', color: 'var(--label-secondary)' }}>{email.type}</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(175,82,222,0.10)', color: 'var(--purple)' }}>{email.loop}</span>
                                    {email.hasReplied && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, fontWeight: 700, background: 'rgba(48,209,88,0.12)', color: 'var(--green)' }}>
                                            <Reply style={{ width: 10, height: 10 }} /> Replied
                                        </span>
                                    )}
                                    {email.sentDate && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, background: 'rgba(59,91,219,0.08)', color: 'var(--blue)' }}>{email.sentDate}</span>
                                    )}
                                </div>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--label-primary)' }}>{email.recipient}</h4>
                                {!isOpen && (
                                    <p style={{ fontSize: 12, color: 'var(--label-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                        {stripHtml(email.content).substring(0, 80)}...
                                    </p>
                                )}
                            </div>
                        </div>
                        <div style={{ flexShrink: 0, color: 'var(--label-tertiary)' }}>
                            {isOpen ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                        </div>
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--hairline)', paddingTop: 14 }}>
                    <div style={{ paddingLeft: 50, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {email.sender && (
                            <p style={{ fontSize: 11, color: 'var(--label-tertiary)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--label-secondary)' }}>From:</span> {email.sender}
                            </p>
                        )}
                        <div style={{ fontSize: 13, color: 'var(--label-primary)', lineHeight: 1.6 }}>
                            <div className="email-content" dangerouslySetInnerHTML={{ __html: email.content }} />
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
