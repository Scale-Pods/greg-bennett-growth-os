"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Loader2, Play, CheckCircle2, AlertCircle, ArrowLeft,
    Plus, X, MapPin, Users, Zap, Home, Building2,
} from "lucide-react";

type Source = "apollo" | "google_maps" | "zillow" | "realtor_redfin" | null;

const LISTING_TYPES = [
    { value: "sold", label: "Sold" },
    { value: "for_sale", label: "For Sale" },
    { value: "for_rent", label: "For Rent" },
    { value: "pending", label: "Pending" },
];

const inputStyle: React.CSSProperties = {
    height: 40,
    background: "var(--fill-tertiary)",
    border: "1px solid var(--glass-border)",
    color: "var(--label-primary)",
    borderRadius: "var(--radius-md)",
    fontSize: 13,
};

const labelClass = "text-[10px] font-bold text-[var(--label-tertiary)] uppercase tracking-wider";

const SOURCE_CARDS = [
    {
        id: "apollo" as const,
        title: "Apollo.io B2B",
        subtitle: "Professional B2B contacts database",
        icon: Users,
        accent: "#6366F1",
        accentBg: "rgba(92,107,192,0.1)",
        accentBorder: "rgba(92,107,192,0.2)",
        badge: "B2B",
    },
    {
        id: "google_maps" as const,
        title: "Google Maps",
        subtitle: "Local business listings & contacts",
        icon: MapPin,
        accent: "#0F9D58",
        accentBg: "rgba(15,157,88,0.1)",
        accentBorder: "rgba(15,157,88,0.2)",
        badge: "Local",
    },
    {
        id: "zillow" as const,
        title: "Zillow",
        subtitle: "Real estate homeowner leads",
        icon: Home,
        accent: "#F59E0B",
        accentBg: "rgba(245,158,11,0.1)",
        accentBorder: "rgba(245,158,11,0.2)",
        badge: "B2C",
    },
    {
        id: "realtor_redfin" as const,
        title: "Realtor / Redfin",
        subtitle: "Dual-source property leads",
        icon: Building2,
        accent: "#EF4444",
        accentBg: "rgba(239,68,68,0.1)",
        accentBorder: "rgba(239,68,68,0.2)",
        badge: "B2C",
    },
];

export default function ScrappersPage() {
    const [activeSource, setActiveSource] = useState<Source>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const [apolloMaxResults, setApolloMaxResults] = useState(3);
    const [mapsLocation, setMapsLocation] = useState("");
    const [mapsMaxResults, setMapsMaxResults] = useState(3);
    const [mapsTerms, setMapsTerms] = useState<string[]>([]);
    const [newTerm, setNewTerm] = useState("");
    const [zillowLocation, setZillowLocation] = useState("");
    const [zillowMaxResults, setZillowMaxResults] = useState(3);
    const [zillowListingType, setZillowListingType] = useState("sold");
    const [redfinLocation, setRedfinLocation] = useState("");
    const [redfinMaxResults, setRedfinMaxResults] = useState(3);
    const [redfinListingType, setRedfinListingType] = useState("sold");

    const activeCard = SOURCE_CARDS.find(c => c.id === activeSource);

    const handleBack = () => { setActiveSource(null); setSuccess(null); setError(null); };

    const submit = async (payload: object) => {
        setLoading(true); setSuccess(null); setError(null);
        try {
            const res = await fetch("/api/scrappers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to trigger webhook.");
            setSuccess(data);
        } catch (err: any) {
            setError(err.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const addTerm = () => {
        if (newTerm.trim()) { setMapsTerms(p => [...p, newTerm.trim()]); setNewTerm(""); }
    };

    return (
        <div className="flex flex-col h-full" style={{ gap: 16 }}>
            {/* Header */}
            <div className="flex items-center gap-3 flex-shrink-0">
                {activeSource && (
                    <button onClick={handleBack} style={{
                        width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "var(--fill-tertiary)", border: "1px solid var(--glass-border)",
                        color: "var(--label-secondary)", cursor: "pointer", flexShrink: 0,
                    }} className="hover:bg-[var(--fill-secondary)]">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                )}
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--label-primary)", letterSpacing: "var(--ls-heading)" }}>
                        {activeSource ? `${activeCard?.title} Scraper` : "Leads Scrapers"}
                    </h1>
                    <p style={{ fontSize: 12, color: "var(--label-secondary)", marginTop: 1 }}>
                        {activeSource ? "Configure parameters and trigger the extraction webhook." : "Select a data source to begin extracting leads."}
                    </p>
                </div>
            </div>

            {/* Source Selection */}
            {!activeSource && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {SOURCE_CARDS.map(card => {
                        const Icon = card.icon;
                        return (
                            <button key={card.id} onClick={() => { setActiveSource(card.id); setSuccess(null); setError(null); }}
                                className="text-left group" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                                <div className="liquid-card overflow-hidden transition-all duration-150 group-hover:scale-[1.02]"
                                    style={{ padding: 0, border: `1px solid ${card.accentBorder}` }}>
                                    <div style={{ padding: "14px 16px", background: card.accentBg, borderBottom: `1px solid ${card.accentBorder}` }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: card.accentBg, border: `1px solid ${card.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Icon className="h-4 w-4" style={{ color: card.accent }} />
                                            </div>
                                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", padding: "2px 6px", borderRadius: 20, background: card.accentBg, border: `1px solid ${card.accentBorder}`, color: card.accent, textTransform: "uppercase" }}>
                                                {card.badge}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--label-primary)" }}>{card.title}</div>
                                        <div style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 2 }}>{card.subtitle}</div>
                                    </div>
                                    <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 11, color: "var(--label-tertiary)" }}>Configure →</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: card.accent }}>
                                            <Zap className="h-3 w-3" /> Open
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Apollo Form */}
            {activeSource === "apollo" && (
                <div className="liquid-card overflow-hidden flex-1" style={{ padding: 0, border: "1px solid rgba(92,107,192,0.2)" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(92,107,192,0.15)", background: "rgba(92,107,192,0.06)" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--label-primary)" }}>Apollo.io B2B — Parameters</div>
                        <div style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 1 }}>Extract professional contacts from Apollo's 275M+ database</div>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); submit({ source: "apollo_b2b", max_results: apolloMaxResults }); }}
                        style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ maxWidth: 300 }} className="space-y-1.5">
                            <Label className={labelClass}>Max Results</Label>
                            <Input type="number" min={1} max={10000} style={inputStyle}
                                value={apolloMaxResults} onChange={(e) => setApolloMaxResults(parseInt(e.target.value) || 1)} required />
                        </div>
                        <FormAlerts error={error} success={success} label="Apollo" />
                        <div className="flex items-center gap-3">
                            <Button type="button" variant="ghost" onClick={() => { setApolloMaxResults(3); setSuccess(null); setError(null); }} disabled={loading}
                                className="text-[var(--label-secondary)] hover:text-rose-500 hover:bg-[var(--fill-secondary)] h-9 px-4 rounded-lg text-sm">Reset</Button>
                            <TriggerButton loading={loading} accent="#6366F1" label="Apollo" />
                        </div>
                    </form>
                </div>
            )}

            {/* Google Maps Form */}
            {activeSource === "google_maps" && (
                <div className="liquid-card overflow-hidden flex-1" style={{ padding: 0, border: "1px solid rgba(15,157,88,0.2)" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(15,157,88,0.15)", background: "rgba(15,157,88,0.06)" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--label-primary)" }}>Google Maps — Parameters</div>
                        <div style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 1 }}>Extract local business data from Google Maps listings</div>
                    </div>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const filtered = mapsTerms.filter(t => t.trim());
                        if (!mapsLocation.trim()) { setError("Please enter a target location."); return; }
                        if (!filtered.length) { setError("Please add at least one search term."); return; }
                        submit({ source: "google_maps_b2b", location: mapsLocation, max_results: mapsMaxResults, search_terms: filtered });
                    }} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Target Location</Label>
                                <Input placeholder="e.g. Dallas, TX" style={inputStyle} value={mapsLocation}
                                    onChange={(e) => setMapsLocation(e.target.value)} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Max Results</Label>
                                <Input type="number" min={1} max={5000} style={inputStyle} value={mapsMaxResults}
                                    onChange={(e) => setMapsMaxResults(parseInt(e.target.value) || 1)} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className={labelClass}>Search Terms</Label>
                            {mapsTerms.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {mapsTerms.map((term, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(15,157,88,0.1)", border: "1px solid rgba(15,157,88,0.25)", borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 500, color: "#0F9D58" }}>
                                            <span>{term}</span>
                                            <button type="button" onClick={() => setMapsTerms(p => p.filter((_, i) => i !== idx))}
                                                style={{ display: "flex", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", color: "#0F9D58", opacity: 0.6, padding: 0 }} className="hover:opacity-100">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Input placeholder="e.g. solar installers, roofing contractors" style={{ ...inputStyle, height: 38, flex: 1 }}
                                    value={newTerm} onChange={(e) => setNewTerm(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTerm(); } }} />
                                <button type="button" onClick={addTerm} disabled={!newTerm.trim()} style={{
                                    height: 38, padding: "0 14px", background: "rgba(15,157,88,0.12)", border: "1px solid rgba(15,157,88,0.3)",
                                    borderRadius: "var(--radius-md)", color: "#0F9D58", fontWeight: 600, fontSize: 12,
                                    display: "flex", alignItems: "center", gap: 4, cursor: newTerm.trim() ? "pointer" : "not-allowed", opacity: newTerm.trim() ? 1 : 0.5,
                                }}>
                                    <Plus className="h-3.5 w-3.5" /> Add
                                </button>
                            </div>
                        </div>
                        <FormAlerts error={error} success={success} label="Google Maps" />
                        <div className="flex items-center gap-3">
                            <Button type="button" variant="ghost" onClick={() => { setMapsLocation(""); setMapsMaxResults(3); setMapsTerms([]); setNewTerm(""); setSuccess(null); setError(null); }} disabled={loading}
                                className="text-[var(--label-secondary)] hover:text-rose-500 hover:bg-[var(--fill-secondary)] h-9 px-4 rounded-lg text-sm">Reset</Button>
                            <TriggerButton loading={loading} accent="#0F9D58" label="Maps" />
                        </div>
                    </form>
                </div>
            )}

            {/* Zillow Form */}
            {activeSource === "zillow" && (
                <div className="liquid-card overflow-hidden flex-1" style={{ padding: 0, border: "1px solid rgba(245,158,11,0.2)" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.06)" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--label-primary)" }}>Zillow — Parameters</div>
                        <div style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 1 }}>Scrape homeowner leads from Zillow property listings</div>
                    </div>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!zillowLocation.trim()) { setError("Please enter a target location."); return; }
                        submit({ source: "zillow_b2c", location: zillowLocation, max_results: zillowMaxResults, listing_type: zillowListingType });
                    }} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Location Slug</Label>
                                <Input placeholder="e.g. dallas-tx" style={inputStyle} value={zillowLocation}
                                    onChange={(e) => setZillowLocation(e.target.value)} required />
                                <p style={{ fontSize: 10, color: "var(--label-tertiary)" }}>Use hyphenated format: <code style={{ background: "var(--fill-secondary)", padding: "1px 3px", borderRadius: 3 }}>dallas-tx</code></p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Max Results</Label>
                                <Input type="number" min={1} max={5000} style={inputStyle} value={zillowMaxResults}
                                    onChange={(e) => setZillowMaxResults(parseInt(e.target.value) || 1)} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Listing Type</Label>
                                <Select value={zillowListingType} onValueChange={setZillowListingType}>
                                    <SelectTrigger className="border-none" style={{ height: 40, background: "var(--fill-tertiary)", border: "1px solid var(--glass-border)", color: "var(--label-primary)", borderRadius: "var(--radius-md)" }}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="apple-dialog">
                                        {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <FormAlerts error={error} success={success} label="Zillow" />
                        <div className="flex items-center gap-3">
                            <Button type="button" variant="ghost" onClick={() => { setZillowLocation(""); setZillowMaxResults(3); setZillowListingType("sold"); setSuccess(null); setError(null); }} disabled={loading}
                                className="text-[var(--label-secondary)] hover:text-rose-500 hover:bg-[var(--fill-secondary)] h-9 px-4 rounded-lg text-sm">Reset</Button>
                            <TriggerButton loading={loading} accent="#F59E0B" label="Zillow" />
                        </div>
                    </form>
                </div>
            )}

            {/* Realtor / Redfin Form */}
            {activeSource === "realtor_redfin" && (
                <div className="liquid-card overflow-hidden flex-1" style={{ padding: 0, border: "1px solid rgba(239,68,68,0.2)" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.06)" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--label-primary)" }}>Realtor / Redfin — Parameters</div>
                        <div style={{ fontSize: 11, color: "var(--label-secondary)", marginTop: 1 }}>Dual-source extraction from Realtor.com & Redfin listings</div>
                    </div>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!redfinLocation.trim()) { setError("Please enter a target location."); return; }
                        submit({ source: "realtor_redfin_b2c", location: redfinLocation, max_results: redfinMaxResults, listing_type: redfinListingType });
                    }} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Location Slug</Label>
                                <Input placeholder="e.g. dallas-tx" style={inputStyle} value={redfinLocation}
                                    onChange={(e) => setRedfinLocation(e.target.value)} required />
                                <p style={{ fontSize: 10, color: "var(--label-tertiary)" }}>Use hyphenated format: <code style={{ background: "var(--fill-secondary)", padding: "1px 3px", borderRadius: 3 }}>dallas-tx</code></p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Max Results</Label>
                                <Input type="number" min={1} max={5000} style={inputStyle} value={redfinMaxResults}
                                    onChange={(e) => setRedfinMaxResults(parseInt(e.target.value) || 1)} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Listing Type</Label>
                                <Select value={redfinListingType} onValueChange={setRedfinListingType}>
                                    <SelectTrigger className="border-none" style={{ height: 40, background: "var(--fill-tertiary)", border: "1px solid var(--glass-border)", color: "var(--label-primary)", borderRadius: "var(--radius-md)" }}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="apple-dialog">
                                        {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <FormAlerts error={error} success={success} label="Realtor / Redfin" />
                        <div className="flex items-center gap-3">
                            <Button type="button" variant="ghost" onClick={() => { setRedfinLocation(""); setRedfinMaxResults(3); setRedfinListingType("sold"); setSuccess(null); setError(null); }} disabled={loading}
                                className="text-[var(--label-secondary)] hover:text-rose-500 hover:bg-[var(--fill-secondary)] h-9 px-4 rounded-lg text-sm">Reset</Button>
                            <TriggerButton loading={loading} accent="#EF4444" label="Realtor / Redfin" />
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function TriggerButton({ loading, accent, label }: { loading: boolean; accent: string; label: string }) {
    return (
        <button type="submit" disabled={loading} style={{
            background: accent, color: "#fff", height: 36, padding: "0 20px", borderRadius: 8,
            fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7,
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, transition: "all 0.15s ease",
        }}>
            {loading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Running...</>
                : <><Play className="h-3.5 w-3.5" style={{ fill: "#fff" }} />Trigger {label} Webhook</>}
        </button>
    );
}

function FormAlerts({ error, success, label }: { error: string | null; success: any; label: string }) {
    if (!error && !success) return null;
    return (
        <>
            {error && (
                <Alert className="border-red-500/30 bg-red-500/10 text-red-400 py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm">Failed</AlertTitle>
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle className="text-sm">{label} Webhook Triggered</AlertTitle>
                    <AlertDescription className="text-xs">
                        <pre className="mt-1 p-2 rounded bg-[var(--fill-secondary)] border border-[var(--glass-border)] text-[var(--label-primary)] font-mono text-[10px] overflow-auto max-h-[80px]">
                            {JSON.stringify(success, null, 2)}
                        </pre>
                    </AlertDescription>
                </Alert>
            )}
        </>
    );
}
