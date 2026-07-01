"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Instagram, Linkedin, Facebook, Users, GraduationCap, Home, Mail, Phone, Clock, ChevronRight, Inbox } from "lucide-react";

export default function InboundLeadsClient({
    wealthLeads,
    realtyLeads,
    bootcampsLeads,
}: {
    wealthLeads: any[];
    realtyLeads: any[];
    bootcampsLeads: any[];
}) {
    const sources = ["Instagram", "LinkedIn", "Facebook"];
    const [selectedSource, setSelectedSource] = useState("Instagram");

    const businesses = [
        { id: "wealth", label: "Wealth Builders", icon: Users, color: "#22c55e", bg: "rgba(34,197,94,0.15)", data: wealthLeads },
        { id: "bootcamps", label: "Bootcamps", icon: GraduationCap, color: "#f59e0b", bg: "rgba(245,158,11,0.15)", data: bootcampsLeads },
        { id: "realty", label: "Realty Solutions", icon: Home, color: "#6366f1", bg: "rgba(99,102,241,0.15)", data: realtyLeads },
    ];
    const [selectedBusiness, setSelectedBusiness] = useState("wealth");

    const [selectedLead, setSelectedLead] = useState<any | null>(null);

    // Filter leads for the active business & source
    const activeBusinessObj = businesses.find(b => b.id === selectedBusiness);
    const activeLeads = useMemo(() => {
        if (!activeBusinessObj) return [];
        return activeBusinessObj.data.filter(lead => 
            lead.source && lead.source.toLowerCase().includes(selectedSource.toLowerCase())
        );
    }, [activeBusinessObj, selectedSource]);

    const renderLeadDetails = (lead: any, businessId: string) => {
        const getQuestions = () => {
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
            if (businessId === "bootcamps") {
                return [
                    { q: "Experience", a: lead.q1_experience },
                    { q: "Strategy", a: lead.q2_strategy },
                    { q: "Capital", a: lead.q3_capital },
                    { q: "Target Market", a: lead.q4_target_market },
                    { q: "Deals Completed", a: lead.q5_deals_completed },
                    { q: "Challenge", a: lead.q6_challenge },
                    { q: "Income Goal", a: lead.q7_income_goal },
                ];
            }
            return [];
        };

        const qs = getQuestions();

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="liquid-card p-4">
                        <div className="text-xs text-[var(--label-tertiary)] mb-1 uppercase tracking-wider">Contact</div>
                        <div className="flex items-center gap-2 text-sm text-[var(--label-primary)] mb-2">
                            <Mail size={14} className="text-[var(--label-secondary)]" /> {lead.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--label-primary)]">
                            <Phone size={14} className="text-[var(--label-secondary)]" /> {lead.phone || 'N/A'}
                        </div>
                    </div>
                    <div className="liquid-card p-4">
                        <div className="text-xs text-[var(--label-tertiary)] mb-1 uppercase tracking-wider">Status</div>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[var(--label-secondary)]">Qualified</span>
                                <Badge variant={lead.qualified ? 'default' : 'destructive'}>{lead.qualified ? 'Yes' : 'No'}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[var(--label-secondary)]">Score</span>
                                <span className="font-semibold">{lead.score || 0}/100</span>
                            </div>
                        </div>
                    </div>
                </div>

                {lead.summary && (
                    <div className="liquid-card p-4">
                        <div className="text-xs text-[var(--label-tertiary)] mb-2 uppercase tracking-wider">AI Summary</div>
                        <p className="text-sm text-[var(--label-secondary)] leading-relaxed">{lead.summary}</p>
                    </div>
                )}

                {lead.qualification_reason && (
                    <div className="liquid-card p-4">
                        <div className="text-xs text-[var(--label-tertiary)] mb-2 uppercase tracking-wider">Qualification Reason</div>
                        <p className="text-sm text-[var(--label-secondary)] leading-relaxed">{lead.qualification_reason}</p>
                    </div>
                )}

                <div className="liquid-card p-4">
                    <div className="text-xs text-[var(--label-tertiary)] mb-4 uppercase tracking-wider">Questionnaire</div>
                    <div className="space-y-3">
                        {qs.map((q, i) => (
                            <div key={i} className="flex flex-col gap-1 border-b border-[var(--separator)] pb-3 last:border-0 last:pb-0">
                                <span className="text-sm font-medium text-[var(--label-primary)]">{q.q}</span>
                                <span className="text-sm text-[var(--label-secondary)]">{q.a || '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const getSourceIcon = (src: string) => {
        if (src === 'Instagram') return <Instagram size={20} />;
        if (src === 'LinkedIn') return <Linkedin size={20} />;
        if (src === 'Facebook') return <Facebook size={20} />;
        return null;
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Source Selection */}
            <div>
                <h2 className="text-sm font-semibold text-[var(--label-secondary)] mb-4 uppercase tracking-wider">Select Source</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sources.map(src => {
                        const isSelected = selectedSource === src;
                        return (
                            <button
                                key={src}
                                onClick={() => setSelectedSource(src)}
                                className={`liquid-card p-5 flex items-center justify-between transition-all duration-200 ${
                                    isSelected ? 'ring-2 ring-[var(--blue)] shadow-[0_0_20px_rgba(0,122,255,0.15)] scale-[1.02]' : 'hover:scale-[1.01] hover:bg-[var(--fill-tertiary)]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        isSelected ? 'bg-[var(--blue)] text-white' : 'bg-[var(--fill-secondary)] text-[var(--label-secondary)]'
                                    }`}>
                                        {getSourceIcon(src)}
                                    </div>
                                    <span className={`font-semibold text-lg ${isSelected ? 'text-[var(--label-primary)]' : 'text-[var(--label-secondary)]'}`}>
                                        {src}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-[var(--label-tertiary)]">Total Leads</span>
                                    <span className="font-bold text-xl tabular-nums">
                                        {businesses.reduce((acc, b) => acc + b.data.filter(l => l.source?.toLowerCase().includes(src.toLowerCase())).length, 0)}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Business Selection */}
            <div>
                <h2 className="text-sm font-semibold text-[var(--label-secondary)] mb-4 uppercase tracking-wider">Select Business Unit</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {businesses.map(bus => {
                        const isSelected = selectedBusiness === bus.id;
                        const count = bus.data.filter(l => l.source?.toLowerCase().includes(selectedSource.toLowerCase())).length;
                        const Icon = bus.icon;
                        return (
                            <button
                                key={bus.id}
                                onClick={() => setSelectedBusiness(bus.id)}
                                className={`liquid-card p-5 flex flex-col gap-4 transition-all duration-200 ${
                                    isSelected ? `shadow-lg scale-[1.02]` : 'hover:scale-[1.01] hover:bg-[var(--fill-tertiary)]'
                                }`}
                                style={{
                                    boxShadow: isSelected ? `0 0 0 2px ${bus.color}, 0 0 20px ${bus.color}20` : 'none'
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bus.bg, color: bus.color }}>
                                        <Icon size={16} />
                                    </div>
                                    <span className={`font-medium ${isSelected ? 'text-[var(--label-primary)]' : 'text-[var(--label-secondary)]'}`}>
                                        {bus.label}
                                    </span>
                                </div>
                                <div className="flex items-end justify-between w-full">
                                    <span className="text-2xl font-bold tabular-nums" style={{ color: isSelected ? bus.color : 'var(--label-primary)' }}>
                                        {count}
                                    </span>
                                    <span className="text-xs text-[var(--label-tertiary)]">Leads from {selectedSource}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Leads List */}
            <div className="liquid-card overflow-hidden">
                <div className="p-5 border-b border-[var(--separator)] flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--label-primary)]">Leads List</h3>
                        <p className="text-sm text-[var(--label-tertiary)]">
                            Showing {activeLeads.length} leads for {activeBusinessObj?.label} via {selectedSource}
                        </p>
                    </div>
                </div>
                
                {activeLeads.length === 0 ? (
                    <div className="p-10 flex flex-col items-center justify-center text-[var(--label-tertiary)]">
                        <Inbox size={40} className="mb-4 opacity-50" />
                        <p>No leads found for this selection.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-[var(--label-secondary)]">
                            <thead className="bg-[var(--fill-secondary)] text-xs uppercase tracking-wider text-[var(--label-tertiary)]">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Name</th>
                                    <th className="px-6 py-4 font-medium">Contact</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Score</th>
                                    <th className="px-6 py-4 font-medium">Stage</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--separator)]">
                                {activeLeads.map((lead: any) => (
                                    <tr 
                                        key={lead.id} 
                                        onClick={() => setSelectedLead(lead)}
                                        className="hover:bg-[var(--fill-tertiary)] cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium text-[var(--label-primary)]">{lead.name || 'Unknown'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span>{lead.email}</span>
                                                <span className="text-xs text-[var(--label-tertiary)]">{lead.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {lead.created_at ? format(new Date(lead.created_at), 'MMM dd, yyyy') : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-[var(--fill-secondary)] flex items-center justify-center font-semibold text-xs text-[var(--label-primary)]">
                                                    {lead.score || 0}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline">{lead.lead_stage || 'New'}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronRight size={16} className="text-[var(--label-tertiary)] ml-auto" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Lead Details Modal */}
            <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            {selectedLead?.name || 'Lead Details'}
                        </DialogTitle>
                        <div className="text-sm text-[var(--label-tertiary)] flex items-center gap-2 mt-1">
                            <Clock size={12} />
                            {selectedLead?.created_at ? format(new Date(selectedLead.created_at), 'PPpp') : '—'}
                            <span>•</span>
                            <span className="capitalize">{selectedLead?.source} Lead</span>
                        </div>
                    </DialogHeader>
                    
                    <div className="mt-4">
                        {selectedLead && renderLeadDetails(selectedLead, selectedBusiness)}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
