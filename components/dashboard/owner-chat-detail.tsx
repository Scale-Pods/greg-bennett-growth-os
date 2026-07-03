"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    RefreshCw,
    MessageSquare,
    User,
    Bot,
    Link as LinkIcon,
    Check,
    Languages
} from "lucide-react";

interface OwnerChatDetailProps {
    owner: any;
    onClose?: () => void;
}

export function OwnerChatDetail({ owner, onClose }: OwnerChatDetailProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);
    const [isTranslated, setIsTranslated] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({});

    const handleTranslate = async () => {
        if (isTranslated) {
            setIsTranslated(false);
            return;
        }

        if (Object.keys(translatedMessages).length > 0) {
            setIsTranslated(true);
            return;
        }

        setIsTranslating(true);
        try {
            const textsToTranslate = messages.map(m => m.content);
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: textsToTranslate })
            });

            if (response.ok) {
                const data = await response.json();
                const translations = data.translatedTexts || [];
                const newTranslations: Record<number, string> = {};
                messages.forEach((m, i) => {
                    if (translations[i]) newTranslations[i] = translations[i];
                });
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
        if (!owner) return;
        const baseUrl = window.location.origin;
        // Use ID for stable routing, fallback to phone
        const phone = owner.contactNo || owner.Phone || owner.phone || "";
        const shareId = owner.id ? `owner-${owner.id}` : phone;
        const shareUrl = `${baseUrl}/chat/${encodeURIComponent(shareId)}`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(err => {
                console.error("Failed to copy link:", err);
            });
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error("Fallback copy failed:", err);
            }
            document.body.removeChild(textArea);
        }
    };

    useEffect(() => {
        if (!owner) return;

        const timeline: any[] = [];
        let seq = 1;

        const parseOwnerMsg = (raw: any, label: string, type: 'bot' | 'user', sequence: number) => {
            if (!raw || !String(raw).trim()) return null;
            const content = String(raw).trim();

            // Check for ISO timestamps
            const isoRegex = /\n{1,2}(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+)$/;
            const isoMatch = content.match(isoRegex);
            if (isoMatch) {
                return {
                    type,
                    content: content.replace(isoRegex, '').trim(),
                    label,
                    date: isoMatch[1],
                    sequence
                };
            }

            // Check for "YYYY-MM-DD HH:MM:SS" on the last line
            const lines = content.split('\n');
            const lastLine = lines[lines.length - 1].trim();
            const spaceDateRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
            if (lines.length > 1 && spaceDateRegex.test(lastLine)) {
                return {
                    type,
                    content: lines.slice(0, -1).join('\n').trim() || 'Message Received',
                    label,
                    date: lastLine,
                    sequence
                };
            }

            return { type, content, label, date: null, sequence };
        };

        // Flow: Whatsapp_1 (bot) → User_Replied_1 → Bot_Replied_1 → User_Replied_2 → Bot_Replied_2 ...

        // 1. Initial outreach from bot
        const wp1 = owner["Whatsapp_1"];
        const wp1Msg = parseOwnerMsg(wp1, "Whatsapp_1", "bot", seq++);
        if (wp1Msg) {
            // Attach status
            (wp1Msg as any).tsStatus = owner["Whatsapp_1_status"] || null;
            // If no date in content, use the Whatsapp_1_Date column
            if (!wp1Msg.date && owner["Whatsapp_1_Date"]) {
                wp1Msg.date = owner["Whatsapp_1_Date"];
            }
            timeline.push(wp1Msg);
        }

        // 1b. Check for retry_1
        const retry1 = owner["retry_1"];
        const retry1Msg = parseOwnerMsg(retry1, "Retry 1", "bot", seq++);
        if (retry1Msg) {
            timeline.push(retry1Msg);
        }

        // 2. Paired rounds: User_Replied_i then Bot_Replied_i (up to 10)
        for (let i = 1; i <= 10; i++) {
            const userReply = owner[`User_Replied_${i}`];
            const userMsg = parseOwnerMsg(userReply, `User_Replied_${i}`, "user", seq++);
            if (userMsg) timeline.push(userMsg);

            const botReply = owner[`Bot_Replied_${i}`];
            const botMsg = parseOwnerMsg(botReply, `Bot_Replied_${i}`, "bot", seq++);
            if (botMsg) {
                (botMsg as any).tsStatus = owner[`Bot_Replied_Status_${i}`] || null;
                timeline.push(botMsg);
            }
        }

        setMessages(timeline);
    }, [owner]);

    if (!owner) {
        return (
            <div className="h-[500px] flex flex-col items-center justify-center space-y-4 text-slate-400">
                <MessageSquare className="h-12 w-12 opacity-20" />
                <p className="font-medium">Generated lead not found</p>
                {onClose && <Button variant="outline" onClick={onClose}>Close</Button>}
            </div>
        );
    }

    return (
        <div className="glass-modal-shell flex flex-col h-full overflow-hidden max-h-[85vh] p-5">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 mb-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{owner.Name || owner.name || "Generated Lead"}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{owner.contactNo || owner.Phone || owner.phone || "—"}</span>
                        <span>•</span>
                        <span className="text-amber-600 font-bold">Generated Lead Outreach</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isTranslating}
                        className={`gap-2 text-[10px] font-bold uppercase transition-all ${isTranslated ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-900'}`}
                        onClick={handleTranslate}
                    >
                        {isTranslating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                        {isTranslated ? 'Original' : 'Translate'}
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className={`gap-2 text-[10px] font-bold uppercase transition-all shadow-md ${copied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        onClick={handleCopyLink}
                    >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Share Link'}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 196px', gap: 12, flex: 1, overflow: 'hidden', minHeight: 0 }}>
                {/* Chat timeline */}
                <div className="glass-panel flex flex-col h-full min-h-0">
                    <div className="glass-panel-header">
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--label-tertiary)', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            <MessageSquare style={{ width: 12, height: 12 }} />
                            Conversation Timeline
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--fill-secondary)', color: 'var(--label-secondary)', border: '1px solid var(--hairline)' }}>
                            {messages.length} Messages
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                                <MessageSquare className="h-10 w-10 opacity-20" />
                                <p className="text-sm">No WhatsApp messages found for this lead.</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                let tsPill: React.ReactNode = null;
                                if (msg.type === 'bot' && (msg as any).tsStatus) {
                                    const raw = String((msg as any).tsStatus);
                                    const label = raw.split(' - ')[0].trim();
                                    const formatted = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
                                    let cls = 'bg-emerald-500/30 text-emerald-100';
                                    if (formatted.includes('Read')) cls = 'bg-blue-400/40 text-blue-100';
                                    if (formatted.includes('Failed')) cls = 'bg-red-400/40 text-red-100';
                                    if (formatted.includes('Sent')) cls = 'bg-white/20 text-emerald-50';
                                    tsPill = (
                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cls}`}>
                                            {formatted}
                                        </span>
                                    );
                                }

                                return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.type === 'user' ? 'flex-start' : 'flex-end', width: '100%' }}>
                                        <div className={`chat-bubble ${msg.type === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
                                            <div style={{ marginBottom: 3, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: msg.type === 'user' ? 'var(--green)' : 'var(--teal)' }}>
                                                    {msg.label}
                                                </span>
                                                {tsPill}
                                            </div>
                                            <p style={{ fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'var(--label-primary)', margin: 0 }}>
                                                {isTranslated && translatedMessages[idx] ? (
                                                    <span className="relative">
                                                        <span className="block mb-1 text-[10px] uppercase font-bold opacity-50">English Translation:</span>
                                                        {translatedMessages[idx]}
                                                    </span>
                                                ) : msg.content}
                                            </p>
                                        </div>
                                        {msg.date && (
                                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                                {formatOriginalDate(msg.date)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', height: '100%', paddingRight: 2, paddingBottom: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--label-tertiary)', margin: 0 }}>Engagement</p>
                    <StatBox label="Total Messages" value={messages.length} icon={MessageSquare} color="var(--teal)" />
                    <StatBox label="Incoming" value={messages.filter(m => m.type === 'user').length} icon={User} color="var(--green)" />
                    <StatBox label="Outgoing" value={messages.filter(m => m.type === 'bot').length} icon={Bot} color="var(--purple)" />

                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--label-tertiary)', margin: '8px 0 0' }}>Lead Info</p>
                    <div className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                            <span style={{ fontSize: 10, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Contact Info</span>
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-primary)', margin: '2px 0 0', fontFamily: 'ui-monospace, monospace' }}>{owner.contactNo || owner.Phone || owner.phone || "—"}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: 10, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Source Table</span>
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)', margin: '2px 0 0' }}>generated_leads_outreach</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, icon: Icon, color = "var(--teal)" }: any) {
    return (
        <div className="glass-stat-box">
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

function formatOriginalDate(dateString: string) {
    if (!dateString) return "";
    
    const match = String(dateString).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!match) return String(dateString);

    const [, , month, day, hourStr, minute] = match;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[parseInt(month, 10) - 1];

    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    
    const paddedHour = hour < 10 ? '0' + hour : hour.toString();
    const dayNumber = parseInt(day, 10);

    return `${monthName} ${dayNumber}, ${paddedHour}:${minute} ${ampm}`;
}
