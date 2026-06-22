"use client";

import { useState, useEffect } from "react";
import { RefreshCw, MessageSquare, User, Bot, Link as LinkIcon, Check, Languages } from "lucide-react";
import { ConsolidatedLead } from "@/lib/leads-utils";
import { useData } from "@/context/DataContext";

interface WhatsAppChatDetailProps {
    customerId: string;
    onClose?: () => void;
    initialLead?: ConsolidatedLead;
}

const EMPTY_LEADS: any[] = [];
const EMPTY_MESSAGES: any[] = [];

export function WhatsAppChatDetail({ customerId, onClose, initialLead }: WhatsAppChatDetailProps) {
    let dataContext: any = {};
    try {
        dataContext = useData();
    } catch (e) {
        // Fallback for public view without DataProvider
    }
    const { leads: allLeads = EMPTY_LEADS, loadingLeads = false } = dataContext;
    const [lead, setLead] = useState<ConsolidatedLead | null>(initialLead || null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);
    const [isTranslated, setIsTranslated] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({});

    const handleTranslate = async () => {
        if (isTranslated) { setIsTranslated(false); return; }
        if (Object.keys(translatedMessages).length > 0) { setIsTranslated(true); return; }
        setIsTranslating(true);
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: messages.map(m => m.content) })
            });
            if (response.ok) {
                const data = await response.json();
                const translations = data.translatedTexts || [];
                const newTranslations: Record<number, string> = {};
                messages.forEach((m, i) => { if (translations[i]) newTranslations[i] = translations[i]; });
                setTranslatedMessages(newTranslations);
                setIsTranslated(true);
            }
        } catch (error) {
            console.error("Translation failed:", error);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleCopyLink = () => {
        if (!lead) return;
        const shareUrl = `${window.location.origin}/chat/${encodeURIComponent((lead as any).id || lead.phone)}`;
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(console.error);
        } else {
            const ta = document.createElement("textarea");
            ta.value = shareUrl;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
            document.body.removeChild(ta);
        }
    };

    useEffect(() => {
        if (!initialLead && loadingLeads) { setLoading(true); return; }

        const searchVal = String(customerId).toLowerCase().trim();
        const found = initialLead || allLeads.find((l: any) => {
            if (String(l.id).toLowerCase() === searchVal) return true;
            if (l.phone) {
                const lp = String(l.phone).replace(/\D/g, '');
                const sv = searchVal.replace(/\D/g, '');
                if (sv && lp === sv) return true;
            }
            return false;
        }) || null;

        if (found) {
            const rawName = (found as any).name || (found as any)["Name"] || "";
            const isPhoneNumber = /^\+?\d[\d\s\-().]{4,}$/.test(rawName.trim());
            const normalized = {
                ...found,
                name: rawName && !isPhoneNumber ? rawName : "Unknown",
                phone: (found as any).phone || (found as any)["Phone"] || "",
                email: (found as any).email || (found as any)["Email"] || "",
                source_loop: (found as any).source_loop || "—",
            } as any;
            setLead(normalized);

            const timeline: any[] = [];
            const parseMsg = (raw: any, label: string, type: 'bot' | 'user', sequence: number) => {
                if (!raw || !String(raw).trim()) return null;
                const content = String(raw).trim();
                const isoRegex = /\n{1,2}(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+)$/;
                const isoMatch = content.match(isoRegex);
                if (isoMatch) return { type, content: content.replace(isoRegex, '').trim(), label, date: isoMatch[1], sequence };
                const lines = content.split('\n');
                const lastLine = lines[lines.length - 1].trim();
                const spaceDateRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
                if (lines.length > 1 && spaceDateRegex.test(lastLine)) {
                    const d = new Date(lastLine.replace(' ', 'T'));
                    if (!isNaN(d.getTime())) return { type, content: lines.slice(0, -1).join('\n').trim() || 'Message Received', label, date: d.toISOString(), sequence };
                }
                return { type, content, label, date: null, sequence };
            };

            const parseTsDate = (tsRaw: string | null): string | null => {
                if (!tsRaw) return null;
                const lastDash = tsRaw.lastIndexOf(' - ');
                if (lastDash === -1) return null;
                const datePart = tsRaw.slice(lastDash + 3).trim();
                const d = new Date(datePart.replace(/(^\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*/, '$3-$2-$1 ').trim());
                return isNaN(d.getTime()) ? null : d.toISOString();
            };

            const f = found as any;
            let seq = 1;
            for (let i = 1; i <= 12; i++) {
                const raw = f[`W.P_${i}`] || f.stage_data?.[`WhatsApp ${i}`];
                if (!raw) continue;
                const tsRaw: string | null = f[`W.P_${i} TS`] || null;
                const msg = parseMsg(raw, `W.P_${i}`, 'bot', seq++);
                if (msg) { (msg as any).tsStatus = tsRaw; if (!msg.date) msg.date = parseTsDate(tsRaw); timeline.push(msg); }
            }
            for (let i = 1; i <= 10; i++) {
                const rRaw = f[`W.P_Replied_${i}`] || f[`W.P_Replied ${i}`];
                const rMsg = parseMsg(rRaw, `W.P_Replied ${i}`, 'user', seq++);
                if (rMsg) timeline.push(rMsg);
                const fRaw = f[`W.P_FollowUp_${i}`] || f[`W.P_FollowUp ${i}`];
                const fTsRaw: string | null = f[`W.P_FollowUp_TS${i}`] || null;
                const fMsg = parseMsg(fRaw, `W.P_FollowUp ${i}`, 'bot', seq++);
                if (fMsg) { (fMsg as any).tsStatus = fTsRaw; if (!fMsg.date) fMsg.date = parseTsDate(fTsRaw); timeline.push(fMsg); }
            }
            setMessages(timeline);
        } else {
            setLead(null);
            setMessages(EMPTY_MESSAGES);
        }
        setLoading(false);
    }, [customerId, allLeads, loadingLeads, initialLead]);

    if (loading) {
        return (
            <div style={{ height: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--label-tertiary)' }}>
                <RefreshCw style={{ width: 20, height: 20, color: 'var(--green)' }} className="animate-spin" />
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-secondary)', margin: 0 }}>Syncing Chat History…</p>
            </div>
        );
    }

    if (!lead) {
        return (
            <div style={{ height: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--label-tertiary)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare style={{ width: 18, height: 18, opacity: 0.4 }} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--label-secondary)', margin: 0 }}>Lead Not Found</p>
                {onClose && (
                    <button onClick={onClose} style={{ marginTop: 4, padding: '6px 14px', borderRadius: 8, background: 'var(--fill-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--label-primary)', fontSize: 12, cursor: 'pointer' }}>
                        Close
                    </button>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', maxHeight: '80vh', background: 'var(--bg-layer1)', borderRadius: 14, padding: 18 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
                <div>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--label-primary)', letterSpacing: '-0.01em', margin: 0 }}>{lead.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 12, color: 'var(--label-secondary)' }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{lead.phone}</span>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--label-quaternary)', display: 'inline-block' }} />
                        <span style={{ textTransform: 'capitalize' }}>{lead.source_loop}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        disabled={isTranslating}
                        onClick={handleTranslate}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                            cursor: isTranslating ? 'not-allowed' : 'pointer', transition: 'all 120ms',
                            background: isTranslated ? 'rgba(59,91,219,0.10)' : 'var(--fill-tertiary)',
                            border: `1px solid ${isTranslated ? 'rgba(59,91,219,0.25)' : 'var(--glass-border)'}`,
                            color: isTranslated ? 'var(--blue)' : 'var(--label-primary)',
                        }}
                    >
                        {isTranslating
                            ? <RefreshCw style={{ width: 12, height: 12 }} className="animate-spin" />
                            : <Languages style={{ width: 12, height: 12 }} />}
                        {isTranslated ? 'Original' : 'Translate'}
                    </button>
                    <button
                        onClick={handleCopyLink}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                            cursor: 'pointer', transition: 'all 120ms',
                            background: copied ? 'rgba(48,209,88,0.15)' : 'var(--blue)',
                            border: `1px solid ${copied ? 'rgba(48,209,88,0.30)' : 'transparent'}`,
                            color: copied ? 'var(--green)' : '#fff',
                        }}
                    >
                        {copied ? <Check style={{ width: 12, height: 12 }} /> : <LinkIcon style={{ width: 12, height: 12 }} />}
                        {copied ? 'Copied' : 'Share Link'}
                    </button>
                </div>
            </div>

            {/* Body grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 196px', gap: 12, flex: 1, overflow: 'hidden', minHeight: 0 }}>
                {/* Timeline panel */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--fill-quaternary)', border: '1px solid var(--hairline)', borderRadius: 10, overflow: 'hidden', height: '100%', minHeight: 0 }}>
                    {/* Panel header */}
                    <div style={{ borderBottom: '1px solid var(--hairline)', padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--label-tertiary)', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            <MessageSquare style={{ width: 12, height: 12 }} />
                            Conversation
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--fill-secondary)', color: 'var(--label-secondary)', border: '1px solid var(--hairline)' }}>
                            {messages.length} msg
                        </span>
                    </div>

                    {/* Messages */}
                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {messages.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--label-tertiary)', gap: 8 }}>
                                <MessageSquare style={{ width: 20, height: 20, opacity: 0.2 }} />
                                <p style={{ fontSize: 12, fontWeight: 500, margin: 0 }}>No Messages Found</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                let tsPill = null;
                                if (msg.type === 'bot' && (msg as any).tsStatus) {
                                    const raw = String((msg as any).tsStatus);
                                    const label = raw.split(' - ')[0].trim();
                                    const formatted = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
                                    let pillBg = 'var(--fill-secondary)';
                                    let pillColor = 'var(--label-tertiary)';
                                    if (formatted.includes('Read')) { pillBg = 'rgba(59,91,219,0.10)'; pillColor = 'var(--blue)'; }
                                    if (formatted.includes('Failed')) { pillBg = 'rgba(255,69,58,0.10)'; pillColor = 'var(--red)'; }
                                    if (formatted.includes('Sent')) { pillBg = 'rgba(48,209,88,0.10)'; pillColor = 'var(--green)'; }
                                    tsPill = (
                                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, background: pillBg, color: pillColor }}>
                                            {formatted}
                                        </span>
                                    );
                                }

                                const isUser = msg.type === 'user';
                                return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-start' : 'flex-end', width: '100%' }}>
                                        <div style={{
                                            maxWidth: '85%', padding: '8px 11px',
                                            background: isUser ? 'rgba(48,209,88,0.09)' : 'var(--fill-tertiary)',
                                            border: `1px solid ${isUser ? 'rgba(48,209,88,0.18)' : 'var(--hairline)'}`,
                                            borderRadius: 10,
                                            borderTopLeftRadius: isUser ? 3 : 10,
                                            borderTopRightRadius: isUser ? 10 : 3,
                                        }}>
                                            <div style={{ marginBottom: 3 }}>
                                                <span style={{ fontSize: 10, fontWeight: 600, color: isUser ? 'var(--green)' : 'var(--blue)' }}>
                                                    {msg.label}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--label-primary)', margin: 0 }}>
                                                {isTranslated && translatedMessages[idx] ? translatedMessages[idx] : msg.content}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, paddingLeft: 2, paddingRight: 2 }}>
                                            {msg.date && (
                                                <span style={{ fontSize: 10, color: 'var(--label-tertiary)' }}>
                                                    {new Date(msg.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                            {tsPill}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', height: '100%', paddingRight: 2, paddingBottom: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--label-tertiary)', margin: 0 }}>Engagement</p>
                    <StatBox label="Total Messages" value={messages.length} icon={MessageSquare} color="var(--blue)" />
                    <StatBox label="Incoming" value={messages.filter((m: any) => m.type === 'user').length} icon={User} color="var(--green)" />
                    <StatBox label="Outgoing" value={messages.filter((m: any) => m.type === 'bot').length} icon={Bot} color="var(--purple)" />

                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--label-tertiary)', margin: '8px 0 0' }}>Lead Info</p>
                    <div style={{ background: 'var(--fill-quaternary)', border: '1px solid var(--hairline)', borderRadius: 9, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                            <span style={{ fontSize: 10, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Phone</span>
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-primary)', margin: '2px 0 0', fontFamily: 'ui-monospace, monospace' }}>{lead.phone}</p>
                        </div>
                        {(lead.email && lead.email !== '-') && (
                            <div>
                                <span style={{ fontSize: 10, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Email</span>
                                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-primary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</p>
                            </div>
                        )}
                        <div>
                            <span style={{ fontSize: 10, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Campaign</span>
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-primary)', margin: '2px 0 0', textTransform: 'capitalize' }}>{lead.source_loop}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
    return (
        <div style={{ padding: '9px 11px', borderRadius: 9, border: '1px solid var(--hairline)', background: 'var(--fill-quaternary)', display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                color,
            }}>
                <Icon style={{ width: 13, height: 13 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 10, color: 'var(--label-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--label-primary)', lineHeight: 1.1, marginTop: 1 }}>{value}</span>
            </div>
        </div>
    );
}
