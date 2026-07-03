"use client";

import { BennettLoader } from "@/components/bennett-loader";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Mail, ChevronDown, ChevronUp, Reply, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, subDays } from "date-fns";

import { useData } from "@/context/DataContext";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export default function ReceivedEmailsPage() {
    const { leads: allLeads, loadingLeads } = useData();
    const [replies, setReplies] = useState<any[]>([]);
    const loading = loadingLeads;
    const [loopFilter, setLoopFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const { dateRange, setDateRange } = useData();
    const [sortBy, setSortBy] = useState("newest");

    useEffect(() => {
        const fetchReplies = async () => {
            if (loadingLeads) return;
            try {
                const realReplies: any[] = [];
                allLeads.forEach((lead: any, index: number) => {
                    const emailReply = lead.email_replied;
                    if (!emailReply || emailReply === "No" || String(emailReply).trim() === "") return;

                    const trimmed = String(emailReply).trim();
                    const lines = trimmed.split("\n");
                    const lastLine = lines[lines.length - 1].trim();
                    const lastLineDate = new Date(lastLine);

                    let displayDate: string = lead.created_at || new Date().toISOString();
                    let cleanContent = trimmed;

                    if (!isNaN(lastLineDate.getTime()) && lastLine.includes("-") && lastLine.includes(":")) {
                        displayDate = lastLineDate.toISOString();
                        cleanContent = lines.slice(0, -1).join("\n").trim() || "Email Reply Received";
                    }

                    const emailStages = (lead.stages_passed || []).filter((s: string) => s.startsWith("Email_"));
                    const lastEmailStage = emailStages.length > 0 ? emailStages[emailStages.length - 1] : "";

                    let formattedTimestamp = "Unknown Date";
                    try { formattedTimestamp = format(new Date(displayDate), "MMM dd, yyyy • p"); } catch (_) {}

                    realReplies.push({
                        id: `${lead.id || index}-email-reply`,
                        sender: lead.email || "No Email Provided",
                        senderName: lead.name || "Lead",
                        status: "Replied",
                        subject: lastEmailStage ? `Reply to ${lastEmailStage}` : "Email Reply",
                        timestamp: formattedTimestamp,
                        content: cleanContent,
                        originalDate: displayDate,
                        loop: lead.source_loop || "",
                        repliedToStep: lastEmailStage,
                    });
                });

                realReplies.sort((a, b) => new Date(b.originalDate).getTime() - new Date(a.originalDate).getTime());
                setReplies(realReplies);
            } catch (e) { console.error("Received emails error", e); }
        };
        fetchReplies();
    }, [allLeads, loadingLeads]);

    const filteredReplies = useMemo(() => {
        let result = replies.filter((reply) => {
            if (loopFilter !== "all") {
                const loop = (reply.loop || "").toLowerCase();
                if (loopFilter === "intro" && !loop.includes("intro")) return false;
                if (loopFilter === "followup" && !loop.includes("follow")) return false;
                if (loopFilter === "nurture" && !loop.includes("nurture")) return false;
            }
            const q = searchQuery.toLowerCase();
            if (q && !reply.sender.toLowerCase().includes(q) && !reply.content.toLowerCase().includes(q) && !reply.senderName.toLowerCase().includes(q)) return false;
            if (dateRange?.from) {
                const rd = reply.originalDate ? new Date(reply.originalDate) : null;
                if (!rd || isNaN(rd.getTime())) return false;
                const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
                const to = dateRange.to ? new Date(dateRange.to) : new Date(from); to.setHours(23, 59, 59, 999);
                if (rd < from || rd > to) return false;
            }
            return true;
        });
        return result.sort((a, b) => {
            const da = a.originalDate ? new Date(a.originalDate).getTime() : 0;
            const db = b.originalDate ? new Date(b.originalDate).getTime() : 0;
            return sortBy === "newest" ? db - da : da - db;
        });
    }, [replies, loopFilter, searchQuery, dateRange, sortBy]);

    return (
        <div className="space-y-5 pb-10 max-w-5xl mx-auto relative min-h-[500px]">
            {loading && <BennettLoader />}

            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Received Emails</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>View all received email replies from your campaigns</p>
                </div>
                <DateRangePicker value={dateRange as any} onUpdate={r => setDateRange(r.range)} />
            </div>

            {/* Summary Card */}
            <div className="liquid-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--label-primary)' }}>
                        {loading ? "..." : filteredReplies.length} replies received
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--label-secondary)', marginTop: 2 }}>Total Replies</p>
                </div>
                <div style={{ padding: 12, borderRadius: 'var(--radius-lg)', background: 'rgba(48,209,88,0.12)', color: 'var(--green)' }}>
                    <Mail style={{ width: 20, height: 20 }} />
                </div>
            </div>

            {/* Search & Filters */}
            <div className="liquid-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--label-tertiary)' }} />
                        <Input
                            placeholder="Search by sender or content..."
                            style={{ paddingLeft: 30, height: 36, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', fontSize: 12, borderRadius: 'var(--radius-md)' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Select value={loopFilter} onValueChange={setLoopFilter}>
                        <SelectTrigger style={{ width: 140, height: 32, fontSize: 12 }}><SelectValue placeholder="All Loops" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Loops</SelectItem>
                            <SelectItem value="intro">Intro Loop</SelectItem>
                            <SelectItem value="followup">Follow Up</SelectItem>
                            <SelectItem value="nurture">Nurture Loop</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger style={{ width: 140, height: 32, fontSize: 12 }}><SelectValue placeholder="Sort By" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                        </SelectContent>
                    </Select>
                    <button
                        style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--label-secondary)', background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', padding: '5px 12px', borderRadius: 'var(--radius-sm)', cursor: 'default', height: 32 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                        onClick={() => { setSearchQuery(""); setLoopFilter("all"); setSortBy("newest"); }}
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* Reply List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!loading && filteredReplies.map((reply) => <EmailReplyCard key={reply.id} reply={reply} />)}
                {!loading && filteredReplies.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--label-tertiary)', border: '1px dashed var(--hairline)', borderRadius: 'var(--radius-xl)' }}>
                        <Mail style={{ width: 28, height: 28, marginBottom: 8, opacity: 0.4 }} />
                        <p style={{ fontSize: 13 }}>No replies found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function EmailReplyCard({ reply }: { reply: any }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
            <CollapsibleTrigger asChild>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 42, height: 42, flexShrink: 0, background: 'rgba(48,209,88,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(48,209,88,0.2)' }}>
                        <Reply style={{ width: 16, height: 16, color: 'var(--green)' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reply.senderName}</h4>
                                {reply.loop && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(175,82,222,0.10)', color: 'var(--purple)' }}>{reply.loop}</span>
                                )}
                                {reply.repliedToStep && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, fontWeight: 700, background: 'rgba(59,91,219,0.08)', color: 'var(--blue)' }}>
                                        <Reply style={{ width: 9, height: 9 }} />{reply.repliedToStep}
                                    </span>
                                )}
                                {reply.timestamp && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 'var(--radius-xs)', fontSize: 10, background: 'rgba(59,91,219,0.08)', color: 'var(--blue)' }}>{reply.timestamp}</span>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail style={{ width: 11, height: 11, color: 'var(--label-tertiary)' }} />
                            <p style={{ fontSize: 11, color: 'var(--label-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reply.sender}</p>
                        </div>
                        {!isOpen && (
                            <p style={{ fontSize: 12, color: 'var(--label-quaternary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400, marginTop: 2 }}>
                                {reply.content.substring(0, 80)}...
                            </p>
                        )}
                    </div>

                    <div style={{ flexShrink: 0, color: 'var(--label-tertiary)', padding: 6, borderRadius: '50%' }}>
                        {isOpen ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--hairline)', paddingTop: 14 }}>
                    <div style={{ paddingLeft: 54 }}>
                        <div style={{ padding: 14, background: 'var(--fill-quaternary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', fontSize: 13, color: 'var(--label-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {reply.content}
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
