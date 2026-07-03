"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCheck, Clock, XCircle, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import React, { useState, useEffect } from "react";
import { consolidateLeads } from "@/lib/leads-utils";
import { BennettLoader } from "@/components/bennett-loader";
import { useData } from "@/context/DataContext";

export default function WhatsappSentPage() {
    const { leads: allLeads, loadingLeads, dateRange, setDateRange } = useData();
    const [messages, setMessages] = useState<any[]>([]);
    const loading = loadingLeads;
    const [searchQuery, setSearchQuery] = useState("");
    const [stats, setStats] = useState({
        total: 0,
        delivered: 0,
        read: 0,
        failed: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            if (loadingLeads) return;
            try {
                // We still fetch templates as they're small and not in global context yet
                const templatesRes = await fetch('/api/templates');
                const templates = templatesRes.ok ? await templatesRes.json() : [];

                const waMessages: any[] = [];
                let deliveredCount = 0;
                let readCount = 0;

                // Apply Date Filtering
                const leads = allLeads.filter((lead: any) => {
                    if (!dateRange?.from) return true;
                    if (!lead.created_at) return false;

                    const leadDate = new Date(lead.created_at);
                    const from = new Date(dateRange.from);
                    from.setHours(0, 0, 0, 0);
                    const to = dateRange.to ? new Date(dateRange.to) : from;
                    to.setHours(23, 59, 59, 999);

                    return leadDate >= from && leadDate <= to;
                });

                leads.forEach((l: any) => {
                    const lead = l as any;
                    const stages = lead.stages_passed || [];
                    stages.forEach((stage: string) => {
                        if (stage.toLowerCase().includes("whatsapp")) {
                            // Find matching template if any
                            const template = templates.find((t: any) =>
                                t.type === 'whatsapp' && (t.name === stage || stage.includes(t.name))
                            );

                            const hasReplied = lead.whatsapp_replied && lead.whatsapp_replied !== "No" && lead.whatsapp_replied !== "none";

                            waMessages.push({
                                id: `${lead.id}-${stage}-${Math.random()}`,
                                recipient: lead.phone || lead.name || "Unknown",
                                message: template ? template.body : `WhatsApp Message: ${stage}`,
                                status: hasReplied ? "Read" : "Delivered",
                                time: lead.created_at ? new Date(lead.created_at).toLocaleTimeString() : "Unknown",
                                rawDate: lead.created_at
                            });

                            if (hasReplied) readCount++;
                            deliveredCount++;
                        }
                    });
                });

                setMessages(waMessages);
                setStats({
                    total: waMessages.length,
                    delivered: deliveredCount,
                    read: readCount,
                    failed: 0
                });
            } catch (e) {
                console.error("WhatsApp sent processing error", e);
            }
        };
        fetchData();
    }, [dateRange, allLeads, loadingLeads]);

    const filteredMessages = messages.filter(msg =>
        msg.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <BennettLoader />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--label-primary)' }}>Total Sent Messages</h1>
                    <p style={{ color: 'var(--label-secondary)' }}>History of all outbound WhatsApp communications</p>
                </div>
                <DateRangePicker value={dateRange as any} onUpdate={r => setDateRange(r.range)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Sent" value={loading ? "..." : stats.total.toLocaleString()} icon={<Send className="h-4 w-4" />} color="var(--blue)" bg="rgba(99,102,241,0.12)" />
                <StatCard title="Delivered" value={loading ? "..." : stats.delivered.toLocaleString()} icon={<CheckCheck className="h-4 w-4" />} color="var(--green)" bg="rgba(34,197,94,0.12)" />
                <StatCard title="Read" value={loading ? "..." : stats.read.toLocaleString()} icon={<CheckCheck className="h-4 w-4 text-blue-500" />} color="var(--purple)" bg="rgba(167,139,250,0.12)" />
                <StatCard title="Failed" value={loading ? "..." : stats.failed.toLocaleString()} icon={<XCircle className="h-4 w-4" />} color="var(--red)" bg="rgba(239,68,68,0.12)" />
            </div>

            <Card style={{ background: 'var(--bg-layer1)', border: '0.5px solid var(--glass-border)' }}>
                <CardHeader style={{ borderBottom: '0.5px solid var(--glass-border)' }} className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-lg" style={{ color: 'var(--label-primary)' }}>Message History</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            className="pl-10 h-9"
                            style={{ background: 'var(--fill-secondary)', color: 'var(--label-primary)', border: '0.5px solid var(--glass-border)' }}
                            placeholder="Search recipients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0 relative min-h-[300px]">
                    <div className="divide-y divide-slate-100" style={{ borderColor: 'var(--glass-border)' }}>
                        {loading ? (
                            <BennettLoader />
                        ) : filteredMessages.length > 0 ? (
                            filteredMessages.map((msg) => (
                                <div key={msg.id} className="p-4 hover:bg-[var(--fill-primary)] transition-colors flex items-start justify-between" style={{ borderBottom: '0.5px solid var(--glass-border)' }}>
                                    <div className="space-y-1">
                                        <p className="font-bold" style={{ color: 'var(--label-primary)' }}>{msg.recipient}</p>
                                        <p className="text-sm" style={{ color: 'var(--label-secondary)' }}>{msg.message}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--label-tertiary)' }}>{msg.time}</span>
                                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${msg.status === 'Read' ? 'text-blue-500' :
                                                msg.status === 'Delivered' ? 'text-emerald-500' :
                                                    msg.status === 'Failed' ? 'text-rose-500' : 'text-slate-400'
                                                }`}>
                                                {(msg.status === 'Read' || msg.status === 'Delivered') && <CheckCheck className="h-3 w-3" />}
                                                {msg.status === 'Sent' && <Clock className="h-3 w-3" />}
                                                {msg.status === 'Failed' && <XCircle className="h-3 w-3" />}
                                                {msg.status}
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" style={{ color: 'var(--label-secondary)' }}>Details</Button>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center" style={{ color: 'var(--label-tertiary)' }}>
                                No messages found.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ title, value, icon, color, bg }: any) {
    return (
        <Card style={{ background: 'var(--bg-layer1)', border: '0.5px solid var(--glass-border)' }}>
            <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg flex items-center justify-center" style={{ background: bg, color: color }}>{icon}</div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--label-secondary)' }}>{title}</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--label-primary)' }}>{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
