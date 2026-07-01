"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { WhatsAppChatDetail } from "@/components/dashboard/whatsapp-chat-detail";
import { OwnerChatDetail } from "@/components/dashboard/owner-chat-detail";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Search,
    Filter,
    Users,
    Send,
    MessageSquare,
    RefreshCw,
    Building2
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { BennettLoader } from "@/components/bennett-loader";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

// --- Sorting & Activity Helpers ---
const parseMsg = (raw: any): { date: Date | null, content: string } => {
    if (!raw || !String(raw).trim()) return { date: null, content: "" };
    const content = String(raw).trim();

    // 1. Direct ISO (e.g. "2026-04-29T10:30:00.000Z")
    if (content.length >= 10 && !isNaN(new Date(content).getTime())) {
        if (content.includes('T') || (content.includes('-') && content.includes(':'))) {
            return { date: new Date(content), content: "" };
        }
    }

    // 2. ISO at the end (with any number of newlines/spaces)
    const isoRegex = /[\n\s]+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*)$/;
    const isoMatch = content.match(isoRegex);
    if (isoMatch) {
        const d = new Date(isoMatch[1]);
        if (!isNaN(d.getTime())) {
            return { date: d, content: content.replace(isoRegex, '').trim() };
        }
    }

    // 3. Space-separated datetime at the end (e.g. "2026-04-29 10:30:00")
    const lines = content.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    if (lastLine.includes('-') && lastLine.includes(':')) {
        const lastLineDate = new Date(lastLine.replace(' ', 'T'));
        if (!isNaN(lastLineDate.getTime())) {
            return {
                date: lastLineDate,
                content: lines.length > 1 ? lines.slice(0, -1).join('\n').trim() : content
            };
        }
    }

    // 4. DD/MM/YYYY at end of content
    const ddmmRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/;
    const ddmmMatch = content.match(ddmmRegex);
    if (ddmmMatch) {
        const d = new Date(Number(ddmmMatch[3]), Number(ddmmMatch[2]) - 1, Number(ddmmMatch[1]));
        if (!isNaN(d.getTime())) {
            return { date: d, content: content.replace(ddmmRegex, '').trim() };
        }
    }

    return { date: null, content: content };
};

const getMsgDate = (raw: any) => {
    return parseMsg(raw).date;
};

// Parse a date from the TS column (e.g. "Delivered - 29/04/2026", "Read - 29/4/2026 10:30:00 AM")
const parseTSDate = (tsValue: string): Date | null => {
    if (!tsValue) return null;
    const str = String(tsValue).trim();

    // Format: "Status - DD/MM/YYYY" or "Status - DD/MM/YYYY HH:MM:SS"
    if (str.includes(' - ')) {
        const parts = str.split(' - ');
        const datePart = parts[parts.length - 1].trim();

        // Try DD/MM/YYYY
        const ddmmMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (ddmmMatch) {
            const day = Number(ddmmMatch[1]);
            const month = Number(ddmmMatch[2]) - 1;
            const year = Number(ddmmMatch[3]);
            // Check for time portion after the date
            const timeMatch = datePart.match(/(\d{1,2}):(\d{2}):?(\d{2})?\s*(AM|PM)?/i);
            if (timeMatch) {
                let hours = Number(timeMatch[1]);
                const mins = Number(timeMatch[2]);
                const secs = Number(timeMatch[3] || 0);
                if (timeMatch[4]?.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (timeMatch[4]?.toUpperCase() === 'AM' && hours === 12) hours = 0;
                return new Date(year, month, day, hours, mins, secs);
            }
            return new Date(year, month, day);
        }

        // Try ISO format
        const isoDate = new Date(datePart.replace(' ', 'T'));
        if (!isNaN(isoDate.getTime())) return isoDate;
    }
    return null;
};

const getMsgDateWithFallback = (lead: any, msgKey: string, tsKey?: string) => {
    // 1. Try parsing from message content
    const msgContent = lead[msgKey] || lead.stage_data?.[msgKey];
    const d = getMsgDate(msgContent);
    if (d) return d;

    // 2. Try parsing from TS column
    const resolvedTsKey = tsKey || `${msgKey} TS`;
    const tsValue = lead[resolvedTsKey];
    const tsDate = parseTSDate(tsValue);
    if (tsDate) return tsDate;

    // 3. If the message EXISTS but we couldn't parse a date from content or TS,
    //    fall back to the lead's "Created At" as the message date.
    //    This is critical: without this, leads with non-timestamped messages
    //    are silently dropped from date-filtered views.
    if (msgContent && String(msgContent).trim() !== "" && String(msgContent).trim().toLowerCase() !== "no") {
        const createdAt = lead.created_at ? new Date(lead.created_at) : null;
        if (createdAt && !isNaN(createdAt.getTime())) return createdAt;
    }

    return null;
};

const getLeadLatestActivity = (lead: any) => {
    // WA endpoint uses "Created At" (DB column name); consolidated leads use created_at
    const createdRaw = lead["Created At"] || lead.created_at;
    let latestDate = createdRaw ? new Date(createdRaw) : new Date(0);
    // wp1_parsed_date is the most reliable WA send date — use it as the floor
    if (lead.wp1_parsed_date) {
        const d = new Date(lead.wp1_parsed_date);
        if (!isNaN(d.getTime()) && d > latestDate) latestDate = d;
    }

    // Check all bot messages (W.P_1 - W.P_12)
    for (let i = 1; i <= 12; i++) {
        const d = getMsgDateWithFallback(lead, `W.P_${i}`);
        if (d && d > latestDate) latestDate = d;
    }

    // Check reply (legacy and new track)
    const rd = getMsgDate(lead.whatsapp_replied || lead.stage_data?.["WhatsApp Replied"]);
    if (rd && rd > latestDate) latestDate = rd;

    const rt = getMsgDate(lead.WP_Replied_track);
    if (rt && rt > latestDate) latestDate = rt;

    // Check followup
    const fd = getMsgDateWithFallback(lead, "W.P_FollowUp", "W.P_FollowUp TS");
    if (fd && fd > latestDate) latestDate = fd;

    // Check extended history (W.P_Replied 1-10, W.P_FollowUp 1-10)
    for (let i = 1; i <= 10; i++) {
        const dReplied = getMsgDate(lead[`W.P_Replied_${i}`]);
        if (dReplied && dReplied > latestDate) latestDate = dReplied;

        const dFollow = getMsgDateWithFallback(lead, `W.P_FollowUp_${i}`, `W.P_FollowUp_${i} TS`);
        if (dFollow && dFollow > latestDate) latestDate = dFollow;
    }
    return latestDate;
};

// Extract ISO timestamp embedded in Whatsapp_1 message text, fall back to Whatsapp_1_Date
const extractOwnerWADate = (o: any): Date | null => {
    const text = o["Whatsapp_1"];
    if (text) {
        const m = String(text).match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\s\n]*)/);
        if (m) { const d = new Date(m[1]); if (!isNaN(d.getTime())) return d; }
    }
    const dateField = o["Whatsapp_1_Date"];
    if (dateField) { const d = new Date(dateField); if (!isNaN(d.getTime())) return d; }
    return null;
};

const getOwnerLatestActivity = (o: any) => {
    // Start from the WA send date (extracted from message text) or createdOn
    const waDate = extractOwnerWADate(o);
    let latest = waDate || (o.createdOn ? new Date(o.createdOn) : new Date(0));
    
    // Check WTS_Reply_Track for timestamp
    if (o.WTS_Reply_Track) {
        const { date } = parseMsg(o.WTS_Reply_Track);
        if (date && date > latest) latest = date;
    }
    
    // Check Bot_Replied_X and User_Replied_X
    for (let i = 1; i <= 10; i++) {
        const br = o[`Bot_Replied_${i}`];
        if (br) {
            const { date } = parseMsg(br);
            if (date && date > latest) latest = date;
        }
        const ur = o[`User_Replied_${i}`];
        if (ur) {
            const { date } = parseMsg(ur);
            if (date && date > latest) latest = date;
        }
    }
    
    return latest;
};

// Fetch WA-specific data from the dedicated endpoint (filters by WA TS columns, not Created At)
async function fetchWALeadsData(from: Date, to: Date): Promise<{ nr_wf: any[]; followup: any[]; nurture: any[]; owners: any[] }> {
    const { startOfDay, endOfDay } = await import("date-fns");
    const fromISO = startOfDay(from).toISOString();
    const toISO = endOfDay(to).toISOString();
    const res = await fetch(`/api/whatsapp-leads?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function WhatsappChatPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [waOwners, setWaOwners] = useState<any[]>([]);
    const [loadingWA, setLoadingWA] = useState(true);
    const loading = loadingWA;
    const [searchQuery, setSearchQuery] = useState("");
    // Store the full lead object so WhatsAppChatDetail gets it via initialLead
    // (it would otherwise search DataContext.allLeads which doesn't contain WA-page leads)
    const [selectedLeadObj, setSelectedLeadObj] = useState<any | null>(null);
    const getStandardTemplates = (loops: string[]) => {
        const result: any[] = [];
        if (loops.includes("Intro")) {
            for (let i = 1; i <= 4; i++) {
                const day = (i - 1) * 2;
                result.push({ 
                    id: `intro-${i}`, 
                    name: `Cold Message #${i} (Day ${day})`, 
                    column: `W.P_${i}`,
                    category: 'Intro Loop'
                });
            }
        }
        if (loops.includes("Follow Up")) {
            for (let i = 1; i <= 10; i++) {
                result.push({ 
                    id: `followup-${i}`, 
                    name: `Follow-Up Message #${i}`, 
                    column: `W.P_FollowUp_${i}`,
                    category: 'Follow-Up Loop'
                });
            }
        }
        if (loops.includes("Nurture")) {
            for (let i = 1; i <= 6; i++) {
                result.push({ 
                    id: `nurture-wp-${i}`, 
                    name: `Nurture Message #${i}`, 
                    column: `W.P_${i}`,
                    category: 'Nurture Loop'
                });
            }
            for (let i = 1; i <= 10; i++) {
                result.push({ 
                    id: `nurture-fu-${i}`, 
                    name: `Nurture Message #${i + 6}`, 
                    column: `W.P_FollowUp_${i}`,
                    category: 'Nurture Loop'
                });
            }
        }
        return result;
    };

    const { dateRange } = useData();

    // Re-fetch from the WA-specific endpoint when date range changes.
    // This filters by "W.P_1 TS" (nr_wf), "W.P_1  TS" (followup), and "Whatsapp_1_Date" (owners)
    // so the list is correct regardless of "Created At".
    useEffect(() => {
        if (!dateRange?.from) return;
        setLoadingWA(true);
        fetchWALeadsData(dateRange.from, dateRange.to || dateRange.from)
            .then(data => {
                const nr_wf = (data.nr_wf || []).map((l: any) => ({ ...l, source_loop: "Intro" }));
                const followup = (data.followup || []).map((l: any) => ({ ...l, source_loop: "Follow Up" }));
                const nurture = (data.nurture || []).map((l: any) => ({ ...l, source_loop: "Nurture" }));
                setLeads([...nr_wf, ...followup, ...nurture]);
                setWaOwners(data.owners || []);
            })
            .catch(err => console.error("[WA chat]", err))
            .finally(() => setLoadingWA(false));
    }, [dateRange]);

    const [currentPage, setCurrentPage] = useState(1);
    const leadsPerPage = 10;

    // Mobile filter toggle
    const [showFilters, setShowFilters] = useState(false);

    // Tab state: 4 businesses
    const [activeTab, setActiveTab] = useState<"bootcamps" | "realty" | "wealth" | "coaching">("bootcamps");

    // URL Sync for chat
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialSelectedId = searchParams?.get('chat');
    const initialTab = searchParams?.get('tab');

    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialSelectedId || null);
    const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
    const initialProcessed = useRef(false);

    useEffect(() => {
        const url = new URL(window.location.origin + window.location.pathname);
        if (selectedLeadId) {
            url.searchParams.set('chat', selectedLeadId);
            url.searchParams.set('tab', activeTab);
        } else if (selectedOwner) {
            const ownerId = selectedOwner.id || selectedOwner.contactNo || selectedOwner.Phone || selectedOwner.phone;
            url.searchParams.set('chat', ownerId);
            url.searchParams.set('tab', activeTab);
        } else {
            url.searchParams.delete('chat');
            url.searchParams.delete('tab');
        }
        window.history.replaceState({}, '', url.toString());
    }, [selectedLeadId, selectedOwner]);

    // Handle initial URL parameters
    useEffect(() => {
        if (initialProcessed.current) return;
        
        if (initialTab === 'realty') setActiveTab('realty');
        else if (initialTab === 'wealth') setActiveTab('wealth');
        else if (initialTab === 'coaching') setActiveTab('coaching');
        
        if (initialSelectedId) {
            if (initialTab === 'realty' || initialTab === 'wealth' || initialTab === 'coaching') {
                // Find in waOwners (already fetched)
                if (waOwners.length > 0) {
                    const found = waOwners.find(o =>
                        String(o.id) === initialSelectedId ||
                        String(o.contactNo) === initialSelectedId ||
                        String(o.Phone) === initialSelectedId ||
                        String(o.phone) === initialSelectedId
                    );
                    if (found) {
                        setSelectedOwner(found);
                        initialProcessed.current = true;
                    }
                }
            } else {
                setSelectedLeadId(initialSelectedId);
                initialProcessed.current = true;
            }
        } else {
            initialProcessed.current = true;
        }
    }, [initialSelectedId, initialTab, waOwners]);

    // Filter State
    const [pendingFilters, setPendingFilters] = useState<{
        replyStatus: string[],
        loops: string[],
        messageStatus: string[],
        templates: string[]
    }>({
        replyStatus: [],
        loops: [],
        messageStatus: [],
        templates: []
    });

    const [activeFilters, setActiveFilters] = useState<{
        replyStatus: string[],
        loops: string[],
        messageStatus: string[],
        templates: string[]
    }>({
        replyStatus: [],
        loops: [],
        messageStatus: [],
        templates: []
    });


    // leadsInRange mirrors the RPC WHERE clause exactly:
    // include if whatsapp_last_contacted in range OR wp1_parsed_date in range OR no date at all.
    const leadsInRange = useMemo(() => {
        const from = dateRange?.from ? startOfDay(new Date(dateRange.from)).getTime() : null;
        const to = endOfDay(new Date(dateRange?.to || dateRange?.from || new Date())).getTime();
        const inRange = (t: number) => !from || (t >= from && t <= to);
        return leads.filter(lead => {
            if (!lead["W.P_1"]) return false;
            const wp1t = lead.wp1_parsed_date ? new Date(lead.wp1_parsed_date).getTime() : null;
            const lct = lead.whatsapp_last_contacted ? new Date(lead.whatsapp_last_contacted).getTime() : null;
            if (wp1t && inRange(wp1t)) return true;
            if (lct && inRange(lct)) return true;
            if (!wp1t && !lct) return true; // no date info — include
            return false;
        });
    }, [leads, dateRange]);

    const filteredLeads = useMemo(() => {
        return leadsInRange.filter(l => {
            const lead = l as any;
            // WA endpoint returns "Name" / "Phone" (uppercase keys from DB columns)
            const name = String(lead["Name"] || lead.name || "").toLowerCase();
            const phone = String(lead["Phone"] || lead.phone || "");
            const matchesSearch = name.includes(searchQuery.toLowerCase()) || phone.includes(searchQuery);

            const wtReplied = lead["WP_Replied_track"] || lead.WP_Replied_track;
            let hasReplied = false;
            if (wtReplied && String(wtReplied).trim() !== "") {
                const s = String(wtReplied).trim().toLowerCase();
                if (s !== "no" && s !== "none") hasReplied = true;
            }

            const matchesReplyStatus = activeFilters.replyStatus.length === 0 ||
                (activeFilters.replyStatus.includes("Replied") && hasReplied) ||
                (activeFilters.replyStatus.includes("No Reply") && !hasReplied);

            const matchesLoop = activeFilters.loops.length === 0 ||
                activeFilters.loops.some(loop => {
                    const lName = (lead.source_loop || "").toLowerCase();
                    const target = loop.toLowerCase();
                    if (target === "follow up") return lName.includes("follow up") || lName.includes("followup");
                    return lName.includes(target);
                });

            const matchesMessageStatus = activeFilters.messageStatus.length === 0 ||
                activeFilters.messageStatus.some(status => {
                    const target = status.toLowerCase();
                    for (let i = 1; i <= 12; i++) {
                        const s = (lead[`W.P_${i} TS`] || "").toLowerCase();
                        if (s.includes(target)) return true;
                    }
                    return false;
                });

            const matchesTemplate = activeFilters.templates.length === 0 ||
                activeFilters.templates.some(tName => {
                    const match = tName.match(/Message\s*#?\s*(\d+)/i);
                    const index = match ? parseInt(match[1]) : null;
                    if (!index) return false;

                    const isIntro = tName.toLowerCase().includes("cold") || tName.toLowerCase().includes("intro");
                    const isFollowUp = tName.toLowerCase().includes("follow-up") || tName.toLowerCase().includes("followup");
                    const isNurture = tName.toLowerCase().includes("nurture");

                    if (isIntro) {
                        return !!lead[`W.P_${index}`];
                    }
                    if (isFollowUp) {
                        return !!lead[`W.P_FollowUp ${index}`] || !!lead[`W.P_FollowUp_${index}`];
                    }
                    if (isNurture) {
                        const inWP = index <= 6 && (!!lead[`W.P_${index}`] || !!lead.stage_data?.[`WhatsApp ${index}`]);
                        const inFollowUp = index <= 10 && (!!lead[`W.P_FollowUp_${index}`] || (index === 1 && !!lead[`W.P_FollowUp`]));
                        return inWP || inFollowUp;
                    }
                    return false;
                });

            return matchesSearch && matchesReplyStatus && matchesLoop && matchesMessageStatus && matchesTemplate;
        }).sort((a, b) => {
            // Sort by latest_wp_date from server (most recent in-range message date).
            // Falls back to wp1_parsed_date then Created At.
            const getDate = (l: any) => {
                const raw = l.latest_wp_date || l.wp1_parsed_date || l["Created At"] || l.created_at;
                return raw ? new Date(raw).getTime() : 0;
            };
            return getDate(b) - getDate(a);
        });
    }, [leads, searchQuery, activeFilters, dateRange]);

    // Owner filtering — waOwners already pre-filtered by Whatsapp_1_Date on the server
    const filteredOwners = useMemo(() => {
        return waOwners.filter(o => {
            const name = String(o.Name || o.name || "").toLowerCase();
            const phone = String(o.contactNo || o.Phone || o.phone || "");
            const matchesSearch = name.includes(searchQuery.toLowerCase()) || phone.includes(searchQuery);
            if (!matchesSearch) return false;

            // Reply Status Filter
            if (activeFilters.replyStatus.length > 0) {
                const wtsReply = o["WTS_Reply_Track"];
                const hasReplied = wtsReply && wtsReply !== "" && String(wtsReply).toLowerCase() !== "no";
                const matchesReply = (activeFilters.replyStatus.includes("Replied") && hasReplied) ||
                                     (activeFilters.replyStatus.includes("No Reply") && !hasReplied);
                if (!matchesReply) return false;
            }

            // Message Status Filter (e.g. Read, Delivered, Sent, Failed)
            if (activeFilters.messageStatus.length > 0) {
                const status = (o["Whatsapp_1_status"] || "").toLowerCase();
                const matchesStatus = activeFilters.messageStatus.some(s => status.includes(s.toLowerCase()));
                if (!matchesStatus) return false;
            }

            // Template Filter
            if (activeFilters.templates.length > 0) {
                const matchesTemplate = activeFilters.templates.some(tName => {
                    const match = tName.match(/Message\s*#?\s*(\d+)/i);
                    const index = match ? parseInt(match[1]) : null;
                    if (!index) return false;

                    const isIntro = tName.toLowerCase().includes("cold") || tName.toLowerCase().includes("intro") || tName.toLowerCase().includes("owner");
                    const isFollowUp = tName.toLowerCase().includes("follow-up") || tName.toLowerCase().includes("followup");
                    const isNurture = tName.toLowerCase().includes("nurture");

                    if (isIntro) return !!o[`Whatsapp_${index}`];
                    if (isFollowUp) return !!o[`Bot_Replied_${index}`];
                    if (isNurture) {
                        return (index <= 6 && !!o[`Whatsapp_${index}`]) || (index <= 10 && !!o[`Bot_Replied_${index}`]);
                    }
                    return false;
                });
                if (!matchesTemplate) return false;
            }

            return true;
        }).sort((a, b) => {
            const dateA = getOwnerLatestActivity(a);
            const dateB = getOwnerLatestActivity(b);
            return dateB.getTime() - dateA.getTime();
        });
    }, [waOwners, searchQuery, activeFilters]);

    // --- Stats ---
    // Chat list + Unique Msg Sent = leadsInRange (W.P_1 sent in selected date range).
    // Messages Sent = total filled WP message slots across all in-range leads.
    // Total Replies = leads in filteredLeads (after search/filter) with a reply tracked.
    const stats = useMemo(() => {
        let sentCount = 0;
        let repliedCount = 0;
        let failedCount = 0;
        let uniqueSentCount = 0;

        if (activeTab === "bootcamps") {
            // uniqueSentCount = filteredLeads length (already filtered to in-range W.P_1 leads)
            uniqueSentCount = filteredLeads.length;

            filteredLeads.forEach(l => {
                const lead = l as any;

                // Messages Sent: all filled WP slots on this lead
                for (let i = 1; i <= 12; i++) {
                    if (lead[`W.P_${i}`]) {
                        sentCount++;
                        const ts = lead[`W.P_${i} TS`];
                        if (ts && String(ts).toLowerCase().includes("failed")) failedCount++;
                    }
                }
                if (lead["W.P_FollowUp"]) sentCount++;
                for (let i = 1; i <= 10; i++) {
                    if (lead[`W.P_FollowUp_${i}`] || lead[`W.P_FollowUp ${i}`]) sentCount++;
                }

                // Replied
                const rt = lead.WP_Replied_track || lead["WP_Replied_track"];
                if (rt && String(rt).trim() && String(rt).trim().toLowerCase() !== "no" && String(rt).trim().toLowerCase() !== "none") {
                    repliedCount++;
                }
            });
        } else {
            // Owner Stats — owners are already filtered by Whatsapp_1_Date in range
            filteredOwners.forEach(o => {
                if (o["Whatsapp_1"]) { sentCount++; uniqueSentCount++; }
                if (o["retry_1"]) sentCount++;
                for (let i = 1; i <= 5; i++) { if (o[`Bot_Replied_${i}`]) sentCount++; }
                if (o["Whatsapp_1_status"]?.toLowerCase().includes("failed")) failedCount++;
                const wtsReply = o["WTS_Reply_Track"];
                if (wtsReply && wtsReply !== "" && String(wtsReply).toLowerCase() !== "no") repliedCount++;
            });
        }

        const responseRate = uniqueSentCount > 0 ? ((repliedCount / uniqueSentCount) * 100).toFixed(1) : "0.0";

        return {
            totalLeads: activeTab === "bootcamps" ? filteredLeads.length : filteredOwners.length,
            sentCount,
            uniqueSentCount,
            repliedCount,
            failedCount,
            responseRate,
        };
    }, [filteredLeads, filteredOwners, activeTab, dateRange]);

    const handleApplyFilters = () => { setActiveFilters(pendingFilters); };
    const handleResetFilters = () => {
        const reset = { replyStatus: [], loops: [], messageStatus: [], templates: [] };
        setPendingFilters(reset);
        setActiveFilters(reset);
    };

    const toggleFilter = (type: 'replyStatus' | 'loops' | 'messageStatus' | 'templates', value: string) => {
        setPendingFilters(prev => {
            const current = prev[type];
            if (current.includes(value)) {
                return { ...prev, [type]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [type]: [...current, value] };
            }
        });
    };

    const paginatedLeads = useMemo(() => {
        const start = (currentPage - 1) * leadsPerPage;
        return filteredLeads.slice(start, start + leadsPerPage);
    }, [filteredLeads, currentPage]);

    const totalPages = activeTab === "bootcamps" 
        ? Math.ceil(filteredLeads.length / leadsPerPage) 
        : Math.ceil(filteredOwners.length / leadsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, activeFilters, dateRange]);

    const renderPaginationItems = () => {
        const items = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) {
                items.push(renderPageButton(i));
            }
        } else {
            items.push(renderPageButton(1));

            if (currentPage > 3) {
                items.push(<span key="dots-1" className="flex items-center justify-center w-8 h-8 text-slate-400"><MoreHorizontal className="h-4 w-4" /></span>);
            }

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (i > 1 && i < totalPages) {
                    items.push(renderPageButton(i));
                }
            }

            if (currentPage < totalPages - 2) {
                items.push(<span key="dots-2" className="flex items-center justify-center w-8 h-8 text-slate-400"><MoreHorizontal className="h-4 w-4" /></span>);
            }

            items.push(renderPageButton(totalPages));
        }
        return items;
    };

    const renderPageButton = (page: number) => (
        <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            className={`h-8 w-8 text-xs font-bold ${currentPage === page ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
            onClick={() => setCurrentPage(page)}
        >
            {page}
        </Button>
    );



    const paginatedOwners = filteredOwners.slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage);

    return (
        <div className="space-y-5 pb-10 relative min-h-[500px]">
            {(activeTab === "bootcamps" ? loading : loadingWA) && <BennettLoader />}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>WhatsApp Chats</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>
                        {activeTab === 'crm' ? 'Bennett Bootcamps' :
                         activeTab === 'realty' ? 'Bennett Realty Solutions' :
                         activeTab === 'wealth' ? 'Bennett Wealth Builders Foundation' :
                         ''} — Real-time engagement
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {/* Tab Switcher - 3 Businesses */}
                    <div style={{ display: 'flex', background: 'var(--fill-tertiary)', borderRadius: 'var(--radius-md)', padding: 3, gap: 2, flexWrap: 'wrap' }}>
                        {[
                            { key: 'bootcamps', label: 'Bennett Bootcamps', color: 'var(--orange)' },
                            { key: 'realty', label: 'Bennett Realty Solutions', color: 'var(--blue)' },
                            { key: 'wealth', label: 'Bennett Wealth Builders Foundation', color: 'var(--green)' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setActiveTab(tab.key as any); setCurrentPage(1); }}
                                style={{
                                    padding: '5px 14px', borderRadius: 'var(--radius-sm)',
                                    fontSize: 12, fontWeight: 600, border: 'none', cursor: 'default',
                                    display: 'flex', alignItems: 'center', gap: 5, transition: 'all 130ms',
                                    background: activeTab === tab.key ? 'var(--bg-layer1)' : 'transparent',
                                    color: activeTab === tab.key ? tab.color : 'var(--label-secondary)',
                                    boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => { window.location.reload(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)',
                            color: 'var(--label-secondary)', fontSize: 13, fontWeight: 500,
                            cursor: 'default', transition: 'background 130ms ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                    >
                        <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
                    </button>
                </div>
            </div>

            {/* Mobile filter toggle */}
            <div className="flex lg:hidden items-center gap-2">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--fill-tertiary)', fontSize: 13, fontWeight: 500, color: 'var(--label-secondary)', cursor: 'default' }}
                >
                    <Filter style={{ width: 13, height: 13 }} />
                    {showFilters ? 'Hide' : 'Show'} Filters
                    {(activeFilters.replyStatus.length > 0 || activeFilters.loops.length > 0 || activeFilters.messageStatus.length > 0 || activeFilters.templates.length > 0) && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', marginLeft: 2 }} />
                    )}
                </button>
                {(activeFilters.replyStatus.length > 0 || activeFilters.loops.length > 0 || activeFilters.messageStatus.length > 0 || activeFilters.templates.length > 0) && (
                    <button onClick={handleResetFilters} style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'default' }}>RESET ALL</button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                <div className={`lg:col-span-1 space-y-4 ${showFilters ? 'block' : 'hidden'} lg:block`}>
                    <div className="liquid-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--hairline)', paddingBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--label-primary)', fontSize: 13, fontWeight: 600 }}>
                                <Filter style={{ width: 14, height: 14 }} /> Filters
                            </div>
                            <button onClick={() => setShowFilters(false)} className="lg:hidden" style={{ fontSize: 11, color: 'var(--label-tertiary)', background: 'none', border: 'none', cursor: 'default' }}>✕</button>
                        </div>

                            <FilterSection title="Reply Status" >
                                <FilterOption label="Replied" checked={pendingFilters.replyStatus.includes("Replied")} onCheckedChange={() => toggleFilter('replyStatus', "Replied")} />
                                <FilterOption label="No Reply" checked={pendingFilters.replyStatus.includes("No Reply")} onCheckedChange={() => toggleFilter('replyStatus', "No Reply")} />
                            </FilterSection>

                            {activeTab === "bootcamps" && (
                                <FilterSection title="Loop">
                                    <FilterOption label="Intro" checked={pendingFilters.loops.includes("Intro")} onCheckedChange={() => toggleFilter('loops', "Intro")} />
                                    <FilterOption label="Follow Up" checked={pendingFilters.loops.includes("Follow Up")} onCheckedChange={() => toggleFilter('loops', "Follow Up")} />
                                    <FilterOption label="Nurture" checked={pendingFilters.loops.includes("Nurture")} onCheckedChange={() => toggleFilter('loops', "Nurture")} />
                                </FilterSection>
                            )}

                            {pendingFilters.loops.length > 0 && (
                                <FilterSection title="Templates">
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {getStandardTemplates(pendingFilters.loops).map(t => (
                                            <FilterOption 
                                                key={t.id} 
                                                id={t.id}
                                                label={
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold">{t.name}</span>
                                                        <span className="text-[9px] text-slate-400 font-mono uppercase">[{t.column}]</span>
                                                    </div>
                                                } 
                                                checked={pendingFilters.templates.includes(t.name)} 
                                                onCheckedChange={() => toggleFilter('templates', t.name)} 
                                            />
                                        ))}
                                    </div>
                                </FilterSection>
                            )}

                            {activeTab !== "bootcamps" && (
                                <FilterSection title="Templates">
                                    <FilterOption 
                                        id="owner-whatsapp-1"
                                        label={
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold">Generated Lead Message #1</span>
                                                <span className="text-[9px] text-slate-400 font-mono uppercase">[Whatsapp_1]</span>
                                            </div>
                                        } 
                                        checked={pendingFilters.templates.includes("Owner Message #1")} 
                                        onCheckedChange={() => toggleFilter('templates', "Owner Message #1")} 
                                    />
                                </FilterSection>
                            )}

                            <FilterSection title="Message Status">
                                <FilterOption label="Read" checked={pendingFilters.messageStatus.includes("Read")} onCheckedChange={() => toggleFilter('messageStatus', "Read")} />
                                <FilterOption label="Sent" checked={pendingFilters.messageStatus.includes("Sent")} onCheckedChange={() => toggleFilter('messageStatus', "Sent")} />
                                <FilterOption label="Failed" checked={pendingFilters.messageStatus.includes("Failed")} onCheckedChange={() => toggleFilter('messageStatus', "Failed")} />
                                <FilterOption label="Delivered" checked={pendingFilters.messageStatus.includes("Delivered")} onCheckedChange={() => toggleFilter('messageStatus', "Delivered")} />
                                <FilterOption label="Deleted" checked={pendingFilters.messageStatus.includes("Deleted")} onCheckedChange={() => toggleFilter('messageStatus', "Deleted")} />
                            </FilterSection>

                            <button
                                onClick={handleApplyFilters}
                                style={{
                                    width: '100%', padding: '7px 0', borderRadius: 'var(--radius-md)',
                                    background: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600,
                                    border: 'none', cursor: 'default', transition: 'opacity 130ms ease',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                            >
                                Apply Filters
                            </button>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        <div className="md:col-span-2 xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <MetricCard title="Messages Sent" value={(activeTab === "bootcamps" ? loading : loadingWA) ? "..." : stats.sentCount.toLocaleString()} desc="Total outgoing pulses" icon={Send} />
                            <MetricCard title="Unique Msg Sent" value={(activeTab === "bootcamps" ? loading : loadingWA) ? "..." : stats.uniqueSentCount.toLocaleString()} desc="Unique entities contacted" icon={Users} />
                            <MetricCard title="Total Replies" value={(activeTab === "bootcamps" ? loading : loadingWA) ? "..." : stats.repliedCount.toLocaleString()} desc={`${stats.responseRate}% Response Rate`} icon={MessageSquare} />
                        </div>
                        <div className="liquid-card" style={{ padding: '14px 16px' }}>
                            <div style={{ marginBottom: 12 }}>
                                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>Delivery Status</h3>
                                <p style={{ fontSize: 11, color: 'var(--label-tertiary)', marginTop: 2 }}>Global outbound health</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <StatusBar label="Sent" value={stats.sentCount} total={stats.sentCount || 1} color="var(--blue)" />
                                <StatusBar label="Replied" value={stats.repliedCount} total={stats.uniqueSentCount || 1} color="var(--green)" />
                                {stats.failedCount > 0 && (
                                    <StatusBar label="Failed" value={stats.failedCount} total={stats.sentCount || 1} color="var(--red)" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--label-tertiary)' }} />
                        <Input className="pl-10" style={{ background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-lg)' }} placeholder={`Search ${activeTab === "bootcamps" ? "Bennett Bootcamps" : activeTab === "realty" ? "Realty Solutions" : activeTab === "wealth" ? "Wealth Builder" : "Elite Coaching"} leads by name or phone...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>

                    <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {activeTab === "bootcamps" ? (
                            <>
                                {loading ? (
                                    <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--label-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                        <RefreshCw style={{ width: 18, height: 18, color: 'var(--green)' }} className="animate-spin" />
                                        <span style={{ fontSize: 13 }}>Loading real-time chats...</span>
                                    </div>
                                ) : filteredLeads.length === 0 ? (
                                    <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--label-tertiary)', fontSize: 13 }}>No WhatsApp chats found.</div>
                                ) : (
                                    <TooltipProvider>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm min-w-[700px]">
                                                <thead style={{ borderBottom: '1px solid var(--hairline)' }}>
                                                    <tr style={{ background: 'var(--fill-quaternary)' }}>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)' }}>Lead</th>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Loop</th>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Messages Sent</th>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Status</th>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Message Status</th>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'right' }}>Last Contacted</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {paginatedLeads.map((lead, idx) => {
                                                        const leadId = lead["Lead ID"] || lead.id || String(idx);
                                                        return (
                                                            <CustomerRow key={`${leadId}-${idx}`} lead={lead} onClick={() => {
                                                                setSelectedOwner(null);
                                                                // Normalize DB-column-cased keys to the shape WhatsAppChatDetail expects
                                                                setSelectedLeadObj({
                                                                    ...lead,
                                                                    id: leadId,
                                                                    name: lead["Name"] || lead.name || "",
                                                                    phone: lead["Phone"] || lead.phone || "",
                                                                    email: lead["Email"] || lead.email || "",
                                                                    source_loop: lead.source_loop,
                                                                });
                                                                setSelectedLeadId(leadId);
                                                            }} />
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TooltipProvider>
                                )}
                            </>
                        ) : (
                            <>
                                {loadingWA ? (
                                    <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--label-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                        <RefreshCw style={{ width: 18, height: 18, color: 'var(--orange)' }} className="animate-spin" />
                                        <span style={{ fontSize: 13 }}>Loading generated leads chats...</span>
                                    </div>
                                ) : filteredOwners.length === 0 ? (
                                    <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--label-tertiary)', fontSize: 13 }}>No generated leads chats found.</div>
                                ) : (
                                    <TooltipProvider>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm min-w-[650px]">
                                                <thead style={{ borderBottom: '1px solid var(--hairline)' }}>
                                                    <tr style={{ background: 'var(--fill-quaternary)' }}>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)' }}>Generated Lead</th>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>WTS Reply</th>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Status</th>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'center' }}>Messages</th>
                                                        <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)', textAlign: 'right' }}>Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {paginatedOwners.map((owner, idx) => {
                                                        const wtsReply = owner["WTS_Reply_Track"];
                                                        const hasReply = wtsReply && wtsReply !== "" && String(wtsReply).toLowerCase() !== "no";
                                                        let msgCount = 0;
                                                        if (owner["Whatsapp_1"]) msgCount++;
                                                        if (owner["retry_1"]) msgCount++;
                                                        for (let i = 1; i <= 5; i++) {
                                                            if (owner[`User_Replied_${i}`]) msgCount++;
                                                            if (owner[`Bot_Replied_${i}`]) msgCount++;
                                                        }
                                                        const wpDate = extractOwnerWADate(owner);
                                                        return (
                                                            <tr key={`${owner.id || ''}-${owner.contactNo || owner.Phone || owner.phone || ''}-${idx}`}
                                                                style={{ borderBottom: '1px solid var(--hairline)', cursor: 'pointer', transition: 'background 100ms' }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-quaternary)')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                                onClick={() => { setSelectedLeadId(null); setSelectedOwner(owner); }}>
                                                                <td style={{ padding: '10px 16px' }}>
                                                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>{owner.Name || owner.name || "—"}</div>
                                                                    <div style={{ fontSize: 11, color: 'var(--label-tertiary)', marginTop: 2 }}>{owner.contactNo || owner.Phone || owner.phone || "—"}</div>
                                                                </td>
                                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                                    {hasReply ? (
                                                                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(48,209,88,0.12)', color: 'var(--green)', border: '1px solid rgba(48,209,88,0.25)' }}>REPLIED</span>
                                                                    ) : (
                                                                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: 'var(--fill-tertiary)', color: 'var(--label-tertiary)', border: '1px solid var(--hairline)' }}>SENT</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                                    {owner["Whatsapp_1_status"] ? (
                                                                        <MessageStatusBadge index={1} status={owner["Whatsapp_1_status"]} />
                                                                    ) : (
                                                                        <span style={{ fontSize: 11, color: 'var(--label-quaternary)' }}>—</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--label-primary)', fontVariantNumeric: 'tabular-nums' }}>{msgCount}</td>
                                                                <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, color: 'var(--label-tertiary)', whiteSpace: 'nowrap' }}>
                                                                    {wpDate ? wpDate.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TooltipProvider>
                                )}
                            </>
                        )}

                        {totalPages > 1 && (
                            <div style={{ borderTop: '1px solid var(--hairline)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--fill-quaternary)' }}>
                                <div style={{ fontSize: 12, color: 'var(--label-tertiary)', fontWeight: 500 }}>
                                    Showing <span style={{ color: 'var(--label-primary)', fontWeight: 700 }}>{(currentPage - 1) * leadsPerPage + 1}</span> – <span style={{ color: 'var(--label-primary)', fontWeight: 700 }}>{Math.min(currentPage * leadsPerPage, (activeTab === "bootcamps" ? filteredLeads.length : filteredOwners.length))}</span> of <span style={{ color: 'var(--label-primary)', fontWeight: 700 }}>{(activeTab === "bootcamps" ? filteredLeads.length : filteredOwners.length)}</span> {activeTab === "bootcamps" ? "Bootcamps Leads" : activeTab === "realty" ? "Realty Leads" : activeTab === "wealth" ? "Wealth Builder Leads" : "Coaching Leads"}
                                </div>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                                        <ChevronLeft className="h-3 w-3" />
                                    </Button>
                                    <div style={{ display: 'flex', gap: 3 }}>
                                        {renderPaginationItems()}
                                    </div>
                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
                                        <ChevronRight className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lead Chat Dialog */}
            <Dialog open={!!selectedLeadId} onOpenChange={(open) => { if (!open) { setSelectedLeadId(null); setSelectedLeadObj(null); } }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-6 gap-0">
                    <DialogHeader className="sr-only"><DialogTitle>WhatsApp Chat Detail</DialogTitle></DialogHeader>
                    {selectedLeadId && (
                        <WhatsAppChatDetail
                            customerId={selectedLeadId}
                            initialLead={selectedLeadObj}
                            onClose={() => { setSelectedLeadId(null); setSelectedLeadObj(null); }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Owner Chat Dialog */}
            <Dialog open={!!selectedOwner} onOpenChange={(open) => !open && setSelectedOwner(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-6 gap-0">
                    <DialogHeader className="sr-only"><DialogTitle>Owner Chat Detail</DialogTitle></DialogHeader>
                    {selectedOwner && <OwnerChatDetail owner={selectedOwner} onClose={() => setSelectedOwner(null)} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function MetricCard({ title, value, desc, icon: Icon }: any) {
    return (
        <div className="liquid-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ padding: 7, borderRadius: 'var(--radius-sm)', background: 'rgba(59,91,219,0.10)', color: 'var(--blue)', flexShrink: 0 }}>
                    <Icon style={{ width: 14, height: 14 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--label-tertiary)' }}>{title}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 'var(--ls-metric)', color: 'var(--label-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--label-tertiary)', marginTop: 4 }}>{desc}</div>
        </div>
    );
}

function StatusBar({ label, value, total, color }: any) {
    const pct = ((value / total) * 100).toFixed(1);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 500, color: 'var(--label-secondary)' }}>
                <span>{label}</span><span>{value} ({pct}%)</span>
            </div>
            <div style={{ height: 4, width: '100%', background: 'var(--fill-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: 99 }} />
            </div>
        </div>
    );
}

function FilterSection({ title, children }: any) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)' }}>{title}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
        </div>
    );
}

function FilterOption({ label, checked, onCheckedChange }: any) {
    return (
        <button
            onClick={onCheckedChange}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 9px', borderRadius: 7, cursor: 'pointer',
                background: checked ? 'rgba(59,91,219,0.10)' : 'transparent',
                border: `1px solid ${checked ? 'rgba(59,91,219,0.25)' : 'transparent'}`,
                transition: 'all 120ms', width: '100%', textAlign: 'left',
            }}
            onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'var(--fill-tertiary)'; }}
            onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
        >
            <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: checked ? 'var(--blue)' : 'var(--fill-secondary)',
                border: `1.5px solid ${checked ? 'var(--blue)' : 'var(--hairline)'}`,
                transition: 'all 120ms',
            }} />
            <span style={{ fontSize: 12, fontWeight: checked ? 600 : 400, color: checked ? 'var(--blue)' : 'var(--label-secondary)', flex: 1 }}>{label}</span>
        </button>
    );
}

function CustomerRow({ lead: leadRaw, onClick }: { lead: any; onClick: () => void }) {
    const lead = leadRaw as any;
    // latest_wp_date = most recent WP message date that falls within the selected range
    // (computed by the RPC in migration 006). Falls back to wp1_parsed_date then Created At.
    const latestWpRaw = lead.latest_wp_date || lead.wp1_parsed_date;
    const createdRaw = lead["Created At"] || lead.created_at;
    const latestDate = latestWpRaw ? new Date(latestWpRaw) : (createdRaw ? new Date(createdRaw) : new Date(0));
    // WA endpoint returns "Name"/"Phone" (DB column case); fallback to lowercase for consolidated leads
    const displayName = lead["Name"] || lead.name || "—";
    const displayPhone = lead["Phone"] || lead.phone || "—";

    let sentCount = 0;
    for (let i = 1; i <= 12; i++) { if (lead[`W.P_${i}`]) sentCount++; }
    // "W.P_FollowUp" aliased from "W.P_FollowUp 1" by the RPC
    if (lead["W.P_FollowUp"]) sentCount++;
    for (let i = 1; i <= 10; i++) { if (lead[`W.P_FollowUp ${i}`] || lead[`W.P_FollowUp_${i}`]) sentCount++; }

    // Collect all available statuses
    const allStatuses = [];
    for (let i = 1; i <= 12; i++) {
        if (lead[`W.P_${i} TS`]) {
            allStatuses.push({ index: i, status: lead[`W.P_${i} TS`] });
        }
    }
    // Just show the last 2 to keep UI clean, in chronological order
    const displayStatuses = allStatuses.slice(-2);

    const wtRepliedTrack = lead["WP_Replied_track"] || lead.WP_Replied_track;
    let hasReplied = false;
    if (wtRepliedTrack && String(wtRepliedTrack).trim() !== "") {
        const s = String(wtRepliedTrack).trim().toLowerCase();
        if (s !== "no" && s !== "none") hasReplied = true;
    }

    const formatTooltipDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return String(date);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleString([], { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <tr style={{ borderBottom: '1px solid var(--hairline)', cursor: 'pointer', transition: 'background 100ms' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-quaternary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onClick={onClick}>
            <td style={{ padding: '10px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>{displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--label-tertiary)', marginTop: 2 }}>{displayPhone}</div>
            </td>
            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(59,91,219,0.10)', color: 'var(--blue)', border: '1px solid rgba(59,91,219,0.20)' }}>{lead.source_loop}</span>
            </td>
            <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--label-primary)', fontVariantNumeric: 'tabular-nums' }}>{sentCount}</td>
            <td className="px-4 py-3 text-center">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                {hasReplied ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px] font-bold">REPLIED</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">SENT</Badge>
                                )}
                            </div>
                        </TooltipTrigger>
                        {hasReplied && (
                            <TooltipContent side="top" className="bg-slate-800/40 backdrop-blur-md text-white text-[10px] border-none px-2 py-1 shadow-xl">
                                {formatTooltipDate(latestDate)}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </td>
            <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-1.5">
                    {displayStatuses.map((s) => (
                        <MessageStatusBadge key={s.index} index={s.index} status={s.status} />
                    ))}
                    {displayStatuses.length === 0 && <span className="text-slate-300 text-[10px]">—</span>}
                </div>
            </td>
            <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, color: 'var(--label-tertiary)', whiteSpace: 'nowrap' }}>
                {latestDate.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
            </td>
        </tr>
    );
}

function MessageStatusBadge({ index, status }: { index: number, status: string }) {
    if (!status) return null;
    const parts = status.split(' - ');
    const statusText = parts[0].trim();
    // If there's no " - ", the entire status string might be the timestamp
    const rawTimestamp = parts.length > 1 ? parts[1].trim() : status.trim();

    const formatTooltipDate = (dateStr: string) => {
        const d = new Date(dateStr.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1'));
        const finalDate = isNaN(d.getTime()) ? new Date(dateStr) : d;
        if (isNaN(finalDate.getTime())) return dateStr;
        const now = new Date();
        if (finalDate.toDateString() === now.toDateString()) return finalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return finalDate.toLocaleString([], { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const formatted = statusText.charAt(0).toUpperCase() + statusText.slice(1).toLowerCase();
    let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
    if (formatted.includes("Delivered")) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (formatted.includes("Read")) badgeClass = "bg-blue-50 text-blue-700 border-blue-100";
    if (formatted.includes("Failed")) badgeClass = "bg-red-50 text-red-700 border-red-100";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 w-full justify-center cursor-help">
                        <span className="text-[9px] text-slate-400 font-mono select-none">{index}</span>
                        <Badge variant="outline" className={`h-5 px-1.5 text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>{formatted}</Badge>
                    </div>
                </TooltipTrigger>
                {rawTimestamp && (
                    <TooltipContent side="top" className="bg-slate-800/40 backdrop-blur-md text-white text-[10px] border-none px-2 py-1 shadow-xl">{formatTooltipDate(rawTimestamp)}</TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}
