"use client";

import { use, useEffect, useState } from "react";
import { format } from "date-fns";
import { BennettLoader } from "@/components/bennett-loader";
import { AgentBadge } from "@/components/agents/agent-badge";
import { SanitizedEmailBody } from "@/components/email/sanitized-email-body";
import type { NormalizedReply } from "@/lib/email-utils";

function sentimentBadgeStyle(sentiment: string | null) {
    const s = (sentiment || '').toLowerCase();
    if (s === 'positive') return { background: 'rgba(48,209,88,0.12)', color: 'var(--green)' };
    if (s === 'negative') return { background: 'rgba(255,69,58,0.10)', color: 'var(--red)' };
    if (s === 'neutral') return { background: 'var(--fill-tertiary)', color: 'var(--label-secondary)' };
    return { background: 'var(--fill-tertiary)', color: 'var(--label-tertiary)' };
}

export default function SharedReplyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [reply, setReply] = useState<NormalizedReply | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setNotFound(false);

        fetch(`/api/email/replies/by-id/${encodeURIComponent(id)}`)
            .then(res => res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`)))
            .then(data => { if (!cancelled) setReply(data.reply); })
            .catch(() => { if (!cancelled) setNotFound(true); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [id]);

    if (notFound) {
        return (
            <div className="min-h-screen ambient-bg text-[var(--label-primary)] relative flex items-center justify-center">
                <div className="liquid-card" style={{ padding: '32px 40px', textAlign: 'center', zIndex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--label-primary)', margin: 0 }}>Reply not found</p>
                    <p style={{ fontSize: 12, color: 'var(--label-tertiary)', marginTop: 6 }}>This link may be invalid or the reply is no longer available.</p>
                </div>
            </div>
        );
    }

    if (loading || !reply) {
        return (
            <div className="min-h-screen ambient-bg text-[var(--label-primary)] relative flex items-center justify-center">
                <BennettLoader />
            </div>
        );
    }

    const sentimentStyle = sentimentBadgeStyle(reply.sentiment);

    return (
        <div className="min-h-screen ambient-bg text-[var(--label-primary)] relative flex items-center justify-center" style={{ padding: 20 }}>
            <div
                className="glass-modal-shell !p-5"
                style={{
                    display: 'flex', flexDirection: 'column',
                    maxHeight: '90vh', width: '95vw', maxWidth: 720,
                    overflowY: 'auto',
                    gap: 0,
                    zIndex: 1,
                }}
            >
                <div style={{ marginBottom: 14 }}>
                    <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                        {reply.replySubject || 'Reply'}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <AgentBadge agent={reply.agent} />
                        {reply.sentiment && (
                            <span style={{
                                ...sentimentStyle,
                                display: 'inline-flex', alignItems: 'center',
                                padding: '2px 8px', borderRadius: 'var(--radius-xs)',
                                fontSize: 10, fontWeight: 700, textTransform: 'capitalize',
                            }}>
                                {reply.sentiment}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--label-tertiary)', flexWrap: 'wrap', marginBottom: 14 }}>
                    <span>{reply.lead?.name || reply.leadEmailId || 'Unknown'}</span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--label-quaternary)', display: 'inline-block' }} />
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>{reply.lead?.email || reply.leadEmailId}</span>
                    {reply.replyTimestamp && (
                        <>
                            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--label-quaternary)', display: 'inline-block' }} />
                            <span>{format(new Date(reply.replyTimestamp), 'PPp')}</span>
                        </>
                    )}
                </div>

                {reply.sentimentReason && (
                    <div className="glass-panel" style={{ padding: '10px 12px', marginBottom: 14 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                            Sentiment Reasoning
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--label-secondary)', margin: 0 }}>{reply.sentimentReason}</p>
                    </div>
                )}

                {reply.cleanReplyText && (
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                            Reply Received
                        </div>
                        <SanitizedEmailBody html={reply.cleanReplyText} alreadySanitized={false} />
                    </div>
                )}

                {reply.emailBodySent && (
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                            Original Sent Email
                        </div>
                        <SanitizedEmailBody html={reply.emailBodySent} alreadySanitized={true} />
                    </div>
                )}

                {!reply.cleanReplyText && !reply.emailBodySent && (
                    <SanitizedEmailBody html={null} fallback="No email content available." />
                )}
            </div>
        </div>
    );
}
