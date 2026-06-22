"use client";

import { Phone, CheckCircle, PhoneIncoming, Crown } from "lucide-react";
import { BennettLoader } from "@/components/bennett-loader";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { useData } from "@/context/DataContext";

export default function VoiceAnalyticsPage() {
    const { voiceMetrics, loadingVoiceMetrics, allTimeVoiceCount, allTimeOwnerVoiceCount, refreshVoiceMetrics, dateRange } = useData();

    const [accountFilter, setAccountFilter] = useState("vapi");


    const loading = loadingVoiceMetrics;
    const m = voiceMetrics;

    const showNormal = accountFilter === 'vapi' || accountFilter === 'vapi-normal';
    const showOwners = accountFilter === 'vapi' || accountFilter === 'vapi-owners';

    useEffect(() => {
        if (!dateRange?.from) return;
        refreshVoiceMetrics({
            from: dateRange.from,
            to: dateRange.to || dateRange.from,
            includeElevenLabs: false,
        });
    }, [dateRange, accountFilter, refreshVoiceMetrics]);

    const volumeData = (m?.dailyVolume ?? []).map(d => ({
        name: format(new Date(d.date + 'T00:00:00'), 'MMM dd'),
        value: d.calls,
    }));

    const durationData = (m?.durationBuckets ?? []).map(b => ({
        name: b.label,
        value: b.calls,
    }));

    return (
        <div className="space-y-6 pb-10 relative min-h-[500px]">
            {loading && <BennettLoader />}

            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 'var(--ls-heading)', color: 'var(--label-primary)' }}>Voice Analytics</h1>
                    <p style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>Comprehensive insights across all voice accounts.</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <Select value={accountFilter} onValueChange={setAccountFilter}>
                        <SelectTrigger style={{ width: 190, height: 36, fontSize: 12 }}>
                            <SelectValue placeholder="Account / Provider" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="vapi">All Vapi Calls</SelectItem>
                            <SelectItem value="vapi-owners">Generated Leads</SelectItem>
                            <SelectItem value="vapi-normal">CRM Leads</SelectItem>
                        </SelectContent>
                    </Select>

                </div>
            </div>

            {/* All-Time Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                    title="Total CRM Leads Calls"
                    value={(m?.allTimeNormalCalls ?? allTimeVoiceCount).toLocaleString()}
                    change="All Time"
                    icon={<Phone style={{ width: 18, height: 18 }} />}
                    color="var(--blue)"
                />
                <StatCard
                    title="Total Generated Leads Calls"
                    value={(m?.allTimeOwnerCalls ?? allTimeOwnerVoiceCount).toLocaleString()}
                    change="All Time"
                    icon={<Crown style={{ width: 18, height: 18 }} />}
                    color="var(--orange)"
                />
            </div>

            {/* Normal Calls Funnel */}
            {showNormal && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ padding: 6, borderRadius: 'var(--radius-md)', background: 'var(--blue)' }}>
                            <PhoneIncoming style={{ width: 14, height: 14, color: '#fff' }} />
                        </div>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--label-primary)' }}>CRM Leads Analytics</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Calls in Range" value={(m?.normalCalls ?? 0).toLocaleString()} change="Selected Dates" icon={<Phone style={{ width: 18, height: 18 }} />} color="var(--blue)" />
                        <StatCard title="Call Pick-up Rate" value={`${(m?.normalPickupRate ?? 0).toFixed(1)}%`} change="Picked & duration > 18 sec" icon={<Phone style={{ width: 18, height: 18 }} />} color="var(--purple)" />
                        <StatCard title="Completion Rate" value={`${(m?.normalCompletionRate ?? 0).toFixed(1)}%`} change="Completed Conversation" icon={<CheckCircle style={{ width: 18, height: 18 }} />} color="var(--green)" />
                        <StatCard title="Positive Response" value={`${(m?.normalPositiveRate ?? 0).toFixed(1)}%`} change="Positive & Hesitant" icon={<CheckCircle style={{ width: 18, height: 18 }} />} color="var(--blue)" />
                    </div>
                </div>
            )}

            {/* Owner Calls Funnel */}
            {showOwners && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ padding: 6, borderRadius: 'var(--radius-md)', background: 'var(--orange)' }}>
                            <Crown style={{ width: 14, height: 14, color: '#fff' }} />
                        </div>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--label-primary)' }}>Generated Leads Outreach Analytics</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Calls in Range" value={(m?.ownerCalls ?? 0).toLocaleString()} change="Selected Dates" icon={<Crown style={{ width: 18, height: 18 }} />} color="var(--orange)" />
                        <StatCard title="Call Pick-up Rate" value={`${(m?.ownerPickupRate ?? 0).toFixed(1)}%`} change="Picked & duration > 18 sec" icon={<Phone style={{ width: 18, height: 18 }} />} color="var(--orange)" />
                        <StatCard title="Completion Rate" value={`${(m?.ownerCompletionRate ?? 0).toFixed(1)}%`} change="Completed Conversation" icon={<CheckCircle style={{ width: 18, height: 18 }} />} color="var(--green)" />
                        <StatCard title="Positive Response" value={`${(m?.ownerPositiveRate ?? 0).toFixed(1)}%`} change="EOI & Callback" icon={<CheckCircle style={{ width: 18, height: 18 }} />} color="var(--blue)" />
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="liquid-card" style={{ padding: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)', marginBottom: 12 }}>Call Volume Trends</p>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={volumeData.length ? volumeData : [{ name: 'No data', value: 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,127,127,0.1)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-layer1)', fontSize: 11, color: 'var(--label-primary)', boxShadow: 'var(--shadow-lg)' }} />
                                <Line type="monotone" dataKey="value" stroke="#3B5BDB" strokeWidth={2.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="liquid-card" style={{ padding: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--label-primary)', marginBottom: 12 }}>Duration Distribution</p>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={durationData.length ? durationData : [{ name: 'No data', value: 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,127,127,0.1)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--label-tertiary)' }} />
                                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-layer1)', fontSize: 11, color: 'var(--label-primary)', boxShadow: 'var(--shadow-lg)' }} cursor={{ fill: 'rgba(127,127,127,0.06)' }} />
                                <Bar dataKey="value" fill="#AF52DE" radius={[4, 4, 0, 0]} barSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, change, icon, color, isNegative }: any) {
    return (
        <div className="liquid-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</p>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: 'var(--ls-metric)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</h3>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isNegative ? 'var(--red)' : 'var(--green)' }}>
                        {change} {isNegative ? '↓' : '↑'}
                    </span>
                </div>
                {icon && (
                    <div style={{ padding: 12, borderRadius: 'var(--radius-lg)', flexShrink: 0, background: `color-mix(in srgb, ${color} 12%, transparent)`, color: color }}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
