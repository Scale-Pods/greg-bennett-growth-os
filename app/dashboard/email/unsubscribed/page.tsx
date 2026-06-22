"use client";

import { BennettLoader } from "@/components/bennett-loader";
import { useEffect, useState } from "react";
import { subDays } from "date-fns";
import { useData } from "@/context/DataContext";
import { UserMinus, Search, Mail, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UnsubscribedPage() {
    const { leads: allLeads, loadingLeads } = useData();
    const [leads, setLeads] = useState<any[]>([]);
    const loading = loadingLeads;

    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState<any>({ from: subDays(new Date(), 7), to: new Date() });
    const [sourceLoopFilter, setSourceLoopFilter] = useState("all");
    const [repliedFilter, setRepliedFilter] = useState("all");

    useEffect(() => {
        const fetchUnsubscribed = async () => {
            if (loadingLeads) return;
            try {
                const unsubscribed = allLeads.filter((lead: any) =>
                    lead.unsubscribed && String(lead.unsubscribed).toLowerCase().includes("yes")
                );
                unsubscribed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setLeads(unsubscribed);
            } catch (err) { console.error("Error processing leads:", err); }
        };
        fetchUnsubscribed();
    }, [allLeads, loadingLeads]);

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLoop = sourceLoopFilter === "all" ||
            l.source_loop?.toLowerCase() === sourceLoopFilter.toLowerCase() ||
            l.current_loop?.toLowerCase() === sourceLoopFilter.toLowerCase();
        let matchesReplied = true;
        if (repliedFilter === "yes") matchesReplied = l.replied && l.replied !== "No";
        else if (repliedFilter === "no") matchesReplied = !l.replied || l.replied === "No";
        let matchesDate = true;
        if (dateRange?.from && l.created_at) {
            const leadDate = new Date(l.created_at);
            const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
            const to = dateRange.to ? new Date(dateRange.to) : new Date(from); to.setHours(23, 59, 59, 999);
            matchesDate = leadDate >= from && leadDate <= to;
        }
        return matchesSearch && matchesLoop && matchesReplied && matchesDate;
    });

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserMinus style={{ width: 20, height: 20, color: 'var(--red)' }} />
                        Unsubscribed Leads
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>View detailed list of users who opted out of email marketing</p>
                </div>
                <DateRangePicker onUpdate={(range: any) => setDateRange(range.range)} />
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

                    <Select value={sourceLoopFilter} onValueChange={setSourceLoopFilter}>
                        <SelectTrigger style={{ width: 135, height: 34, fontSize: 12 }}><SelectValue placeholder="Source Loop" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Loops</SelectItem>
                            <SelectItem value="intro">Intro</SelectItem>
                            <SelectItem value="followup">Follow Up</SelectItem>
                            <SelectItem value="nurture">Nurture</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={repliedFilter} onValueChange={setRepliedFilter}>
                        <SelectTrigger style={{ width: 135, height: 34, fontSize: 12 }}><SelectValue placeholder="Reply Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="yes">Replied</SelectItem>
                            <SelectItem value="no">No Reply</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div style={{ position: 'relative', minHeight: 400 }}>
                    {loading ? (
                        <BennettLoader fullScreen={false} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead style={{ borderBottom: '1px solid var(--hairline)' }}>
                                    <tr style={{ background: 'var(--fill-quaternary)' }}>
                                        {['Name', 'Email', 'Source Loop', 'Status', 'Date', 'Timestamp'].map(h => (
                                            <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-tertiary)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.length > 0 ? (
                                        filteredLeads.map((lead, idx) => {
                                            const dateObj = lead.created_at ? new Date(lead.created_at) : null;
                                            return (
                                                <tr
                                                    key={lead.id || idx}
                                                    style={{ borderBottom: '1px solid var(--hairline)', transition: 'background 120ms' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-quaternary)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>{lead.name || "N/A"}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--label-secondary)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <Mail style={{ width: 12, height: 12, color: 'var(--label-tertiary)', flexShrink: 0 }} />
                                                            {lead.email}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--label-secondary)', textTransform: 'capitalize' }}>{lead.source_loop || "Intro"}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, background: 'rgba(255,69,58,0.10)', color: 'var(--red)' }}>
                                                            Unsubscribed
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--label-secondary)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <Calendar style={{ width: 12, height: 12, color: 'var(--label-tertiary)', flexShrink: 0 }} />
                                                            {dateObj ? dateObj.toLocaleDateString() : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--label-tertiary)' }}>
                                                        {dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '60px 16px', textAlign: 'center', fontSize: 13, color: 'var(--label-tertiary)' }}>
                                                No unsubscribed leads match your search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
