"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, Loader2, RefreshCw, Mail, MessageCircle, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BennettLoader } from "@/components/bennett-loader";
import { useMemo } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { startOfDay, endOfDay } from "date-fns";
import { useData } from "@/context/DataContext";

interface Lead {
    id?: string;
    name: string;
    phone: string;
    email: string;
    replied: string;
    email_replied?: string;
    whatsapp_replied?: string;
    current_loop: string;
    stages_passed: string[];
    lead_id?: string;
    current_week?: string;
    display_loop?: string;
    source_loop?: string;
    country_code?: string;
}

// USA Stages (Day 0: WA+Email, Day 2: WA, Day 3: Voice1, Day 3: Voice2, Day 5: Email, Day 7: Email)
const USA_STAGES = [
    { id: 1, label: "Day 0: WhatsApp & Email", criteria: ["WhatsApp 1", "Email 1"] }, // Both required? Usually implies "Contacted"
    { id: 2, label: "Day 2: WhatsApp", criteria: ["WhatsApp 2"] },
    { id: 3, label: "Day 3: Voice Call 1", criteria: ["Voice 1"] },
    { id: 4, label: "Day 4: Voice Call 2", criteria: ["Voice 2"] },
    { id: 5, label: "Day 5: Email", criteria: ["Email 2"] }, // Mapping to next available email
    { id: 6, label: "Day 7: Email", criteria: ["Email 3"] }
];

// Global Stages (Day 0: WA, Day 2: WA, Day 3: Voice1, Day 3: Voice2, Day 5: WA, Day 7: WA)
const GLOBAL_STAGES = [
    { id: 1, label: "Day 0: WhatsApp", criteria: ["WhatsApp 1"] },
    { id: 2, label: "Day 2: WhatsApp", criteria: ["WhatsApp 2"] },
    { id: 3, label: "Day 3: Voice Call 1", criteria: ["Voice 1"] },
    { id: 4, label: "Day 4: Voice Call 2", criteria: ["Voice 2"] },
    { id: 5, label: "Day 5: WhatsApp", criteria: ["WhatsApp 3" /*, "Email 2"*/] }, // Email removed for Global
    { id: 6, label: "Day 7: WhatsApp", criteria: ["WhatsApp 4" /*, "Email 3"*/] }  // Email removed for Global
];

const isUSALead = (phone: string) => {
    if (!phone) return false;
    const clean = phone.replace(/\D/g, '');
    // standard USA format: 10 digits (no country code) or 11 digits starting with 1
    return (clean.length === 10) || (clean.length === 11 && clean.startsWith('1'));
};

const getStagesForLead = (lead: Lead) => {
    return isUSALead(lead.phone) ? USA_STAGES : GLOBAL_STAGES;
};

const calculateProgress = (lead: Lead) => {
    const stages = getStagesForLead(lead);
    const stagesPassed = lead.stages_passed || [];

    // Check match count
    let completed = 0;

    // For Nurture, we might be in Week 1, 2, or 4.
    // The requirement says "same loop only", so the stages are the same for each week.
    // However, the data might be stored as "Email 1", "Email 2" etc which might overlap.
    // Effectively, we just check if the specific criteria for that "Day" has been met in the current context.

    stages.forEach(stage => {
        // Broad check: if ANY of the criteria is met.
        // For "WhatsApp & Email", strictly speaking we might want both, but usually leads data marks stages as they happen.
        // Let's assume if ANY criteria in the list is found, that stage step is done. (OR logic)
        // If strict AND logic is needed for Day 0 (WA AND Email), we can adjust.
        // Given data structure usually has "Email 1" AND "WhatsApp 1", we can check if ALL are present for multi-criteria.

        const isMet = stage.criteria.every(c => stagesPassed.includes(c)); // Strict AND for Day 0
        if (isMet) completed++;

        // Fallback for "WhatsApp & Email": if only one sent, is it 50% of step? 
        // Let's keep it simple: if criteria has multiple, require all? 
        // User request: "Day 0 whatsapp and email". If only WA sent, Day 0 incomplete.
    });

    // Special handling for Nurture Week scaling?
    // "In Nurture loop week 1, week 2 and week 4 same loop only"
    // This implies the structure repeats. 
    // If we are in Nurture, we can show progress WITHIN the current week.

    return Math.round((completed / stages.length) * 100);
};



function ProgressBreakdown({ lead }: { lead: Lead }) {
    const stages = getStagesForLead(lead);
    const stagesPassed = lead.stages_passed || [];

    const breakdown = stages.map(stage => {
        const useAndLogic = stage.label.includes("Day 0") && stage.criteria.length > 1;
        const isMet = useAndLogic
            ? stage.criteria.every(c => stagesPassed.includes(c))
            : stage.criteria.some(c => stagesPassed.includes(c));
        return { name: stage.label, value: 1, isCompleted: isMet };
    });

    const completedCount = breakdown.filter(b => b.isCompleted).length;
    const progress = Math.round((completedCount / stages.length) * 100);

    const data = [
        { name: 'Completed', value: completedCount, color: '#10b981' }, 
        { name: 'Remaining', value: stages.length - completedCount, color: 'var(--fill-secondary)' } 
    ];

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="cursor-pointer group relative">
                    <div className="flex justify-between items-center text-xs text-[var(--label-secondary)] mb-1.5">
                        <div className="flex items-center gap-1 group-hover:text-[var(--blue)] transition-colors">
                            <span className="font-medium">Stage {completedCount} of {stages.length}</span>
                            <ChevronRight className="h-3 w-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                        </div>
                        <span className="font-bold text-[var(--label-primary)]">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-[var(--fill-secondary)] group-hover:bg-[var(--blue)]/5 transition-all" indicatorClassName="bg-[var(--blue)]" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--fill-secondary)] text-[var(--label-primary)] text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-[var(--glass-border)]">
                        View Journey
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="apple-dialog max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--label-primary)' }}>
                        <span>Lead Journey</span>
                        <Badge variant="outline" className="ml-2 bg-[var(--fill-secondary)] text-[var(--label-primary)] border-[var(--glass-border)]">
                            {isUSALead(lead.phone) ? "USA Flow" : "Global Flow"}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 py-4">
                    <div className="h-[160px] relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-bold text-[var(--label-primary)]">{progress}%</span>
                            <span className="text-[10px] text-[var(--label-tertiary)] uppercase font-bold">Complete</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {breakdown.map((step, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                    <div className={`h-2 w-2 rounded-full ${step.isCompleted ? 'bg-[var(--green)]' : 'bg-[var(--fill-secondary)]'}`} />
                                    <span className={step.isCompleted ? 'text-[var(--label-primary)] font-medium' : 'text-[var(--label-tertiary)]'}>
                                        {step.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}



// Restore LeadsPage component
export default function LeadsPage() {
    const { leads, loadingLeads, refreshLeads, dateRange, setDateRange } = useData();
    const [templates, setTemplates] = useState<any[]>([]);
    const loadingTemplates = useState(false)[0]; // Placeholder for template loading if needed
    const [view, setView] = useState<"leads" | "templates">("leads");
    const [templateFilter, setTemplateFilter] = useState<"email" | "whatsapp">("email");
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [loopFilter, setLoopFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [regionFilter, setRegionFilter] = useState("all");
    const [channelFilter, setChannelFilter] = useState("all");

    // Reset page on view or filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [view, templateFilter, searchQuery, loopFilter, statusFilter, regionFilter, channelFilter, dateRange]);


    const loading = view === "leads" ? loadingLeads : false;

    const fetchTemplates = async () => {
        setError(null);
        try {
            const response = await fetch("/api/templates");
            if (!response.ok) {
                throw new Error("Failed to fetch templates");
            }
            const data = await response.json();
            setTemplates(data);
        } catch (err) {
            console.error(err);
            setError("Could not load templates. Please try again later.");
        }
    };

    useEffect(() => {
        if (view === "templates") {
            fetchTemplates();
        }
    }, [view]);

    // Filtering Logic
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            // Date Filter
            if (dateRange?.from) {
                const leadDate = new Date(lead.created_at || lead.updated_at || Date.now());
                const from = startOfDay(new Date(dateRange.from));
                const to = dateRange.to ? endOfDay(new Date(dateRange.to)) : endOfDay(from);
                if (leadDate < from || leadDate > to) return false;
            }

            // Search Query
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                const matches =
                    lead.name?.toLowerCase().includes(search) ||
                    lead.email?.toLowerCase().includes(search) ||
                    lead.phone?.toLowerCase().includes(search);
                if (!matches) return false;
            }

            // Loop Filter
            if (loopFilter !== "all") {
                const source = (lead.source_loop === 'nr_wf' || lead.source_loop === 'Intro') ? 'intro' : lead.source_loop;
                if (source !== loopFilter) return false;
            }

            // Status Filter
            if (statusFilter !== "all") {
                const isReplied = (lead.replied === "Yes" || (lead.email_replied && lead.email_replied !== "No") || (lead.whatsapp_replied && lead.whatsapp_replied !== "No"));
                if (statusFilter === "replied" && !isReplied) return false;
                if (statusFilter === "sent" && isReplied) return false;
            }

            // Region Filter
            if (regionFilter !== "all") {
                const isUSA = isUSALead(lead.phone);
                if (regionFilter === "usa" && !isUSA) return false;
                if (regionFilter === "global" && isUSA) return false;
            }

            // Channel Filter
            if (channelFilter !== "all") {
                const hasEmail = lead.email && lead.email !== "No Email";
                const hasWP = !!lead.phone;
                if (channelFilter === "email" && !hasEmail) return false;
                if (channelFilter === "whatsapp" && !hasWP) return false;
            }

            return true;
        });
    }, [leads, searchQuery, loopFilter, statusFilter, regionFilter, channelFilter, dateRange]);


    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative min-h-[500px]">
            {loading && leads.length === 0 && <BennettLoader />}
            <div className="flex items-center justify-between">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Leads</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Manage and track your leads across all loops.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DateRangePicker onUpdate={(r: any) => setDateRange(r.range)} />
                    <div style={{ display: 'flex', background: 'var(--fill-tertiary)', borderRadius: 'var(--radius-md)', padding: 3, gap: 2 }}>
                        <button
                            onClick={() => setView("leads")}
                            style={{
                                padding: '5px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'default',
                                background: view === "leads" ? 'var(--bg-layer1)' : 'transparent',
                                color: view === "leads" ? 'var(--label-primary)' : 'var(--label-secondary)',
                                boxShadow: view === "leads" ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 130ms'
                            }}
                        >
                            Leads
                        </button>
                        <button
                            onClick={() => setView("templates")}
                            style={{
                                padding: '5px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'default',
                                background: view === "templates" ? 'var(--bg-layer1)' : 'transparent',
                                color: view === "templates" ? 'var(--label-primary)' : 'var(--label-secondary)',
                                boxShadow: view === "templates" ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 130ms'
                            }}
                        >
                            Templates
                        </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => view === "leads" ? refreshLeads() : fetchTemplates()} className="border-[var(--glass-border)] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] text-[var(--label-primary)] h-9">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <div style={{ background: 'var(--fill-secondary)', border: '1px solid var(--glass-border)', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, color: 'var(--label-secondary)' }}>
                        {view === "leads" ? `Total Leads: ${filteredLeads.length}` : `Templates: ${templates.length}`}
                    </div>
                </div>
            </div>

            <div className="liquid-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--separator)' }}>
                    <div className="flex items-center gap-2">
                        {view === "leads" ? <Users className="h-5 w-5 text-[var(--blue)]" /> : <AlertCircle className="h-5 w-5 text-[var(--purple)]" />}
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--label-primary)' }}>{view === "leads" ? "All Leads" : "Templates Library"}</h2>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--label-secondary)', marginTop: 2 }}>
                        {view === "leads" ? "Real-time data from your Intro and Follow-up loops." : "Manage your messaging templates."}
                    </p>
                </div>

                {view === "leads" && (
                    <div style={{ padding: '12px 14px', background: 'var(--fill-quaternary)', borderBottom: '1px solid var(--separator)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--label-tertiary)', pointerEvents: 'none' }} />
                            <Input
                                placeholder="Search by name, email, or phone..."
                                className="border-none"
                                style={{ paddingLeft: 36, height: 40, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)', fontSize: 13 }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Select value={loopFilter} onValueChange={setLoopFilter}>
                                <SelectTrigger className="border-none" style={{ width: 155, height: 40, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                                    <SelectValue placeholder="Loop Type" />
                                </SelectTrigger>
                                <SelectContent className="apple-dialog">
                                    <SelectItem value="all">All Loops</SelectItem>
                                    <SelectItem value="intro">Intro Loop</SelectItem>
                                    <SelectItem value="followup">Follow Up</SelectItem>
                                    <SelectItem value="nurture">Nurture Loop</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="border-none" style={{ width: 155, height: 40, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                                    <SelectValue placeholder="Reply Status" />
                                </SelectTrigger>
                                <SelectContent className="apple-dialog">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="replied">Replied</SelectItem>
                                    <SelectItem value="sent">Sent Only</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={regionFilter} onValueChange={setRegionFilter}>
                                <SelectTrigger className="border-none" style={{ width: 155, height: 40, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                                    <SelectValue placeholder="Region" />
                                </SelectTrigger>
                                <SelectContent className="apple-dialog">
                                    <SelectItem value="all">All Regions</SelectItem>
                                    <SelectItem value="usa">USA Leads</SelectItem>
                                    <SelectItem value="global">Global Leads</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={channelFilter} onValueChange={setChannelFilter}>
                                <SelectTrigger className="border-none" style={{ width: 155, height: 40, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', borderRadius: 'var(--radius-md)' }}>
                                    <SelectValue placeholder="Channel" />
                                </SelectTrigger>
                                <SelectContent className="apple-dialog">
                                    <SelectItem value="all">All Channels</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                </SelectContent>
                            </Select>

                            {(searchQuery || loopFilter !== "all" || statusFilter !== "all" || regionFilter !== "all" || channelFilter !== "all") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[var(--label-secondary)] hover:text-[var(--red)] h-10 px-3 hover:bg-[var(--fill-secondary)] rounded-md"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setLoopFilter("all");
                                        setStatusFilter("all");
                                        setRegionFilter("all");
                                        setChannelFilter("all");
                                    }}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <div className="p-0">
                    {view === "leads" ? (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader style={{ borderBottom: '1px solid var(--hairline)' }}>
                                        <TableRow className="bg-[var(--fill-quaternary)] border-none hover:bg-[var(--fill-quaternary)]">
                                            <TableHead className="w-[200px]" style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Name</TableHead>
                                            <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Phone</TableHead>
                                            <TableHead className="text-center" style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Channel</TableHead>
                                            <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Email</TableHead>
                                            <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Current Loop</TableHead>
                                            <TableHead style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Reply Status</TableHead>
                                            <TableHead className="w-[250px]" style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-tertiary)' }}>Progress</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading && leads.length === 0 ? (
                                            <TableRow className="border-none hover:bg-transparent">
                                                <TableCell colSpan={7} className="h-24 text-center">
                                                    <div className="flex items-center justify-center gap-2 text-[var(--label-secondary)]">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Loading leads...
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredLeads.length === 0 ? (
                                            <TableRow className="border-none hover:bg-transparent">
                                                <TableCell colSpan={7} className="h-24 text-center text-[var(--label-secondary)]">
                                                    No leads matching these filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lead, index) => {
                                                return (
                                                    <TableRow key={index} className="hover:bg-[var(--fill-quaternary)] border-b border-[var(--separator)] transition-colors">
                                                        <TableCell className="font-medium text-[var(--label-primary)]">{lead.name}</TableCell>
                                                        <TableCell className="text-[var(--label-secondary)]">{lead.phone}</TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                {lead.email && lead.email !== "No Email" && (
                                                                    <Badge variant="secondary" className="badge-blue border-none text-[12px] font-medium h-5 px-1.5 w-full justify-center">
                                                                        Email
                                                                    </Badge>
                                                                )}
                                                                {lead.phone && (
                                                                    <Badge variant="secondary" className="badge-green border-none text-[12px] font-medium h-5 px-1.5 w-full justify-center">
                                                                        WhatsApp
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className={`text-sm ${lead.email === "No Email" ? "text-[var(--label-tertiary)] italic" : "text-[var(--label-secondary)]"}`}>
                                                            {lead.email === "No Email" ? "No Email" : lead.email}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="badge-blue border-none uppercase text-[10px] font-bold tracking-wider">
                                                                {lead.source_loop === 'followup' ? 'FOLLOW UP' : lead.source_loop === 'nr_wf' || lead.source_loop === 'Intro' ? 'INTRO' : (lead.display_loop || lead.current_loop || lead.source_loop || "").toUpperCase()}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={(lead.replied === "Yes" || (lead.email_replied && lead.email_replied !== "No") || (lead.whatsapp_replied && lead.whatsapp_replied !== "No")) ? "default" : "secondary"}
                                                                className={(lead.replied === "Yes" || (lead.email_replied && lead.email_replied !== "No") || (lead.whatsapp_replied && lead.whatsapp_replied !== "No")) ? "badge-green border-none shadow-none font-bold capitalize" : "capitalize text-[var(--label-secondary)] bg-[var(--fill-secondary)] border-[var(--glass-border)]"}>
                                                                {(lead.email_replied && lead.email_replied !== "No") ? "Replied" : (lead.whatsapp_replied && lead.whatsapp_replied !== "No") ? "Replied" : lead.replied === "No" ? "Sent" : lead.replied}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <ProgressBreakdown lead={lead} />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <PaginationFooter
                                totalItems={filteredLeads.length}
                                currentPage={currentPage}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    ) : (
                        <div className="p-6 space-y-6">
                            {/* Template Type Toggles */}
                            <div className="flex justify-center">
                                <div className="bg-[var(--fill-tertiary)] p-1 rounded-lg inline-flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setTemplateFilter("email")}
                                        className={`text-xs h-8 px-4 rounded-md transition-all ${templateFilter === "email" ? "bg-[var(--bg-layer1)] text-[var(--label-primary)] shadow-sm font-semibold" : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"}`}
                                    >
                                        Email Templates
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setTemplateFilter("whatsapp")}
                                        className={`text-xs h-8 px-4 rounded-md transition-all ${templateFilter === "whatsapp" ? "bg-[var(--bg-layer1)] text-[var(--label-primary)] shadow-sm font-semibold" : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"}`}
                                    >
                                        WhatsApp Templates
                                    </Button>
                                </div>
                            </div>

                            {loading && templates.length === 0 ? (
                                <div className="flex items-center justify-center h-24 text-[var(--label-secondary)] gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading templates...
                                </div>
                            ) : templates.filter(t => t.type === templateFilter).length === 0 ? (
                                <div className="text-center text-[var(--label-secondary)] py-10">No {templateFilter} templates found.</div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
                                        {templates
                                            .filter(t => t.type === templateFilter)
                                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                            .map((template: any, idx) => (
                                                <div key={template.id || idx} className="liquid-card border-none overflow-hidden" style={{ padding: 0 }}>
                                                    <div style={{ background: 'var(--fill-quaternary)', borderBottom: '1px solid var(--separator)', padding: '12px 16px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-md ${template.type === 'email' ? 'badge-blue' : 'badge-green'}`}>
                                                                {template.type === 'email' ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                                                            </div>
                                                            <div className="font-semibold text-[var(--label-primary)]">
                                                                {template.name || `Template ${idx + 1}`}
                                                            </div>
                                                        </div>
                                                        {template.category && (
                                                            <Badge variant="secondary" className="text-xs bg-[var(--fill-secondary)] border border-[var(--glass-border)] text-[var(--label-secondary)] shadow-none">
                                                                {template.category}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="p-6 bg-transparent">
                                                        <div className="whitespace-pre-wrap text-[var(--label-secondary)] font-sans leading-relaxed">
                                                            {typeof template.body === 'string' ? template.body :
                                                                typeof template.components === 'object' ? JSON.stringify(template.components, null, 2) :
                                                                    JSON.stringify(template, null, 2)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                    <PaginationFooter
                                        totalItems={templates.filter(t => t.type === templateFilter).length}
                                        currentPage={currentPage}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setCurrentPage}
                                    />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PaginationFooter({ totalItems, currentPage, itemsPerPage, onPageChange }: any) {
    if (totalItems <= itemsPerPage) return null;

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="px-6 py-4 border-t border-[var(--separator)] bg-[var(--fill-quaternary)] flex items-center justify-between">
            <p className="text-sm text-[var(--label-secondary)]">
                Showing <span className="font-bold text-[var(--label-primary)]">{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)}</span> of {totalItems} items
            </p>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-[var(--glass-border)] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] text-[var(--label-primary)]"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;

                        const isActive = currentPage === pageNum;

                        return (
                            <Button
                                key={pageNum}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                className={`h-8 w-8 p-0 text-xs ${isActive ? "bg-[var(--blue)] text-white hover:bg-[var(--blue)]/90" : "border-[var(--glass-border)] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] text-[var(--label-primary)]"}`}
                                onClick={() => onPageChange(pageNum)}
                            >
                                {pageNum}
                            </Button>
                        );
                    })}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-[var(--glass-border)] bg-[var(--fill-tertiary)] hover:bg-[var(--fill-secondary)] text-[var(--label-primary)]"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
