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
                                <span className="font-semibold">{lead.score || 0}/100</span>
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

    const getSourceIcon = (src: string) => {
        if (src === 'Instagram') return <Instagram size={16} />;
        if (src === 'LinkedIn') return <Linkedin size={16} />;
        if (src === 'Facebook') return <Facebook size={16} />;
        return null;
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Source Selection */}
            <div>
                <h2 className="text-xs font-semibold text-[var(--label-secondary)] mb-3 uppercase tracking-wider">Select Source</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {sources.map(src => {
                        const isSelected = selectedSource === src;
                        return (
                            <button
                                key={src}
                                onClick={() => setSelectedSource(src)}
                                className={`liquid-card p-4 flex items-center justify-between transition-all duration-200 ${
                                    isSelected ? 'ring-1 ring-[var(--blue)] shadow-[0_0_15px_rgba(0,122,255,0.1)] scale-[1.01]' : 'hover:bg-[var(--fill-tertiary)]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        isSelected ? 'bg-[var(--blue)] text-white' : 'bg-[var(--fill-secondary)] text-[var(--label-secondary)]'
                                    }`}>
                                        {getSourceIcon(src)}
                                    </div>
                                    <span className={`font-semibold text-sm ${isSelected ? 'text-[var(--label-primary)]' : 'text-[var(--label-secondary)]'}`}>
                                        {src}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-[var(--label-tertiary)] uppercase tracking-wider">Total Leads</span>
                                    <span className="font-bold text-lg tabular-nums">
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
                <h2 className="text-xs font-semibold text-[var(--label-secondary)] mb-3 uppercase tracking-wider">Select Business Unit</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {businesses.map(bus => {
                        const isSelected = selectedBusiness === bus.id;
                        const count = bus.data.filter(l => l.source?.toLowerCase().includes(selectedSource.toLowerCase())).length;
                        const Icon = bus.icon;
                        return (
                            <button
                                key={bus.id}
                                onClick={() => setSelectedBusiness(bus.id)}
                                className={`liquid-card p-4 flex flex-col gap-3 transition-all duration-200 ${
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
                                    <span className="text-[10px] text-[var(--label-tertiary)] uppercase tracking-wider">Leads from {selectedSource}</span>
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
                            Showing {activeLeads.length} leads for {activeBusinessObj?.label} via {selectedSource}
                        </p>
                    </div>
                </div>
                
                {activeLeads.length === 0 ? (
                    <div className="p-8 flex flex-col items-center justify-center text-[var(--label-tertiary)]">
                        <Inbox size={32} className="mb-3 opacity-50" />
                        <p className="text-sm">No leads found for this selection.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[var(--label-secondary)]">
                            <thead className="bg-[var(--fill-secondary)] text-[10px] uppercase tracking-wider text-[var(--label-tertiary)]">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium">Contact</th>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Score</th>
                                    <th className="px-4 py-3 font-medium">Stage</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--separator)]">
                                {activeLeads.map((lead: any) => (
                                    <tr 
                                        key={lead.id} 
                                        onClick={() => setSelectedLead(lead)}
                                        className="hover:bg-[var(--fill-tertiary)] cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-[var(--label-primary)]">{lead.name || 'Unknown'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span>{lead.email}</span>
                                                <span className="text-[10px] text-[var(--label-tertiary)]">{lead.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {lead.created_at ? format(new Date(lead.created_at), 'MMM dd, yyyy') : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-6 h-6 rounded-full bg-[var(--fill-secondary)] flex items-center justify-center font-semibold text-[10px] text-[var(--label-primary)]">
                                                    {lead.score || 0}
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Lead Details Modal */}
            <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
                <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg">
                            {selectedLead?.name || 'Lead Details'}
                        </DialogTitle>
                        <div className="text-xs text-[var(--label-tertiary)] flex items-center gap-1.5 mt-1">
                            <Clock size={10} />
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
