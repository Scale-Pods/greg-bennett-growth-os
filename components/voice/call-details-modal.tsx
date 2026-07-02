"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Play, Pause, Volume2, VolumeX, Phone, Clock, FileText, RotateCcw, RotateCw, Download, Copy, Check } from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";

interface CallDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    call: any;
}

export function CallDetailsModal({ open, onOpenChange, call }: CallDetailsModalProps) {
    const [fullCall, setFullCall] = useState<any>(null);
    const [transcriptCopied, setTranscriptCopied] = useState(false);

    const displayCall = fullCall || call || {};
    const audioUrl = displayCall.audio_url || displayCall.recordingUrl || null;

    useEffect(() => {
        if (open && call?.id) {
            setFullCall(call);
            fetch(`/api/calls/${call.id}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data) setFullCall(data); })
                .catch(err => console.error("Error fetching details", err));
        }
    }, [open, call]);

    const getMessages = (data: any) => {
        if (!data) return [];
        let rawMessages: any[] = [];
        if (Array.isArray(data.transcript) && data.transcript.length > 0) {
            rawMessages = data.transcript;
        } else if (Array.isArray(data.messages)) {
            rawMessages = data.messages;
        } else if (data.analysis && Array.isArray(data.analysis.transcript)) {
            rawMessages = data.analysis.transcript;
        } else if (typeof data.transcript === 'string' && data.transcript.trim()) {
            const text = data.transcript;
            const parts: string[] = text.split(/(?=(?:AI|User|Assistant|Agent|Bot|Guest|Customer|Caller|System):)/i);
            if (parts.length > 1) {
                const turns: any[] = [];
                for (const part of parts) {
                    const trimmed = part.trim();
                    if (!trimmed) continue;
                    const markerMatch = trimmed.match(/^(AI|User|Assistant|Agent|Bot|Guest|Customer|Caller|System):\s*([\s\S]*)/i);
                    if (markerMatch) {
                        const roleLabel = markerMatch[1].toLowerCase();
                        const role = (roleLabel === 'ai' || roleLabel === 'assistant' || roleLabel === 'agent' || roleLabel === 'bot') ? 'assistant' : 'user';
                        turns.push({ role, message: markerMatch[2].trim() });
                    } else {
                        turns.push({ role: 'assistant', message: trimmed });
                    }
                }
                return turns;
            }
            return [{ role: 'assistant', message: text }];
        }
        return rawMessages.map((msg: any) => ({
            role: msg.role === 'agent' ? 'assistant' : (msg.role || 'user'),
            message: msg.message || msg.content || msg.text || '',
            startTime: msg.startTime ?? msg.start_time ?? msg.time ?? msg.timestamp
        }));
    };

    const messages = getMessages(displayCall);
    const getDurationData = (data: any) => {
        let seconds = 0;
        if (typeof data.durationSeconds === 'number' && data.durationSeconds > 0) seconds = data.durationSeconds;
        else if (typeof data.call_duration_secs === 'number' && data.call_duration_secs > 0) seconds = data.call_duration_secs;
        else if (data.analysis?.call_duration_secs) seconds = data.analysis.call_duration_secs;
        else if (typeof data.duration === 'number') seconds = data.duration;
        else if (typeof data.duration_seconds === 'number') seconds = data.duration_seconds;
        if (seconds === 0) {
            const rawDur = data.durationSeconds || data.duration || data.duration_seconds || data.call_duration_secs;
            if (rawDur && !isNaN(Number(rawDur))) seconds = Number(rawDur);
        }
        if (seconds === 0 && data.endedAt && data.startedAt) {
            const start = new Date(data.startedAt).getTime();
            const end = new Date(data.endedAt).getTime();
            if (!isNaN(start) && !isNaN(end)) seconds = (end - start) / 1000;
        }
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(Math.max(0, seconds % 60));
        return { formatted: `${min}m ${sec}s`, seconds };
    };

    const { formatted: durationDisplay, seconds: durationSeconds } = getDurationData(displayCall);

    const startedAtDisplay = displayCall.metadata?.start_time_unix_secs
        ? new Date(displayCall.metadata.start_time_unix_secs * 1000).toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })
        : (displayCall.startedAt ? new Date(displayCall.startedAt).toLocaleString() : (displayCall.date || 'N/A'));

    const rawDynamicVars = displayCall.conversation_initiation_client_data?.dynamic_variables || {};
    const rawType = displayCall.type || displayCall.metadata?.type || rawDynamicVars.direction || rawDynamicVars.type || "unknown";
    const isInbound = rawType === 'inbound';
    const callTypeDisplay = isInbound ? "Inbound" : "Outbound";

    const guestNumber = displayCall.customer_number || displayCall.phone || displayCall.caller_number || "Unknown";
    const assistantId = displayCall.assistantId || displayCall.assistant_id || "N/A";

    const assistantMapping: Record<string, string> = {
        '70f05e16-18f3-4f6e-964a-f47b299c6c1d': 'Bennett Growth OS (UAE - 150)',
        'd91ba874-2522-4d62-adf6-681f2a0bf4fe': 'Bennett Growth OS (UAE - 150)',
        '4a7e7a31-0bbc-4fde-831e-2489119ee226': 'Bennett Growth OS (US - 439)',
        'e66fe46b-9fe2-4628-a32b-08ced680bc04': 'Bennett Growth OS (UAE - 291)',
        '4baf3613-ba3d-4860-9ea1-62156686b6f1': 'Bennett Growth OS (UK - 309)',
        '66dff692-d2a5-47d4-bbe0-245509dc7404': 'Bennett Growth OS (US - 151)',
        'b35e3032-7865-4913-ba22-a913b5d4117b': 'US AI Bot',
        '918c25eb-9882-452e-86df-b4851d464852': 'UK AI Bot',
        '9ac979c3-a0b3-4af6-bb0d-07ddf9c0d1cd': 'UK AI Bot 2',
        '560ca61b-8cd3-4b5f-996b-2966abfa37fd': 'Secondary Leads Bot',
        '1ef6ea66-0a75-45f5-b025-1743e048dc90': 'Open House Bot'
    };
    const assistantName = displayCall.agent_name || assistantMapping[assistantId] || (assistantId !== "N/A" ? `Agent: ${assistantId.substring(0, 8)}...` : (displayCall.source === 'vapi' ? "Vapi AI Assistant" : "AI Agent"));

    const extractedGuestName = (call?.name && call.name !== "Guest" && call.name !== "Unknown")
        ? call.name
        : (displayCall.name && displayCall.name !== "Guest" && displayCall.name !== "Unknown"
            ? displayCall.name
            : (displayCall.lead?.name || displayCall.user_name || displayCall.metadata?.user_name || rawDynamicVars.user_name || displayCall.customer?.name || "Guest"));

    const handleCopyTranscript = () => {
        if (!messages || messages.length === 0) return;
        const header = `CALL TRANSCRIPT\n==========================\nDate: ${startedAtDisplay}\nDuration: ${durationDisplay}\n==========================\n\n`;
        const transcriptText = messages
            .filter((msg: any) => msg.role !== 'system')
            .map((msg: any) => {
                const role = (msg.role === 'assistant' || msg.role === 'agent' || msg.role === 'bot' || msg.role === 'model') ? 'AI' : 'User';
                const text = msg.message || msg.content || msg.text || '';
                let timePrefix = '';
                if (msg.startTime !== undefined && msg.startTime !== null) {
                    const mins = Math.floor(msg.startTime / 60);
                    const secs = Math.floor(msg.startTime % 60);
                    timePrefix = `[${mins}:${secs.toString().padStart(2, '0')}] `;
                }
                return `${timePrefix}${role}: ${text}`;
            }).join('\n\n');
        navigator.clipboard.writeText(header + transcriptText);
        setTranscriptCopied(true);
        setTimeout(() => setTranscriptCopied(false), 2000);
    };

    if (!call) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="glass-modal-shell !p-5"
                style={{
                    display: 'flex', flexDirection: 'column',
                    maxHeight: '85vh', height: '85vh',
                    width: '95vw', maxWidth: 950,
                    overflow: 'hidden',
                    gap: 0,
                }}
            >
                <DialogHeader className="sr-only"><DialogTitle>Call Detail</DialogTitle></DialogHeader>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0, paddingRight: 32 }}>
                    <div>
                        <h2 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: '-0.02em', margin: 0 }}>{extractedGuestName}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 12, color: 'var(--label-secondary)' }}>
                            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{guestNumber}</span>
                            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--label-quaternary)', display: 'inline-block' }} />
                            <span>{callTypeDisplay}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleCopyTranscript}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                            cursor: 'pointer', transition: 'all 120ms',
                            background: transcriptCopied ? 'rgba(20,184,166,0.12)' : 'var(--glass-fill)',
                            border: `1px solid ${transcriptCopied ? 'rgba(20,184,166,0.28)' : 'var(--glass-border)'}`,
                            color: transcriptCopied ? 'var(--teal)' : 'var(--label-primary)',
                        }}
                    >
                        {transcriptCopied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                        {transcriptCopied ? 'Copied' : 'Copy Transcript'}
                    </button>
                </div>

                {/* Body grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 196px', gap: 12, flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    {/* Left: transcript panel */}
                    <div className="glass-panel flex flex-col h-full min-h-0">
                        <div className="glass-panel-header">
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--label-tertiary)', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                <FileText style={{ width: 12, height: 12 }} />
                                Call Transcript
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--fill-secondary)', color: 'var(--label-secondary)', border: '1px solid var(--hairline)' }}>
                                {Array.isArray(messages) ? messages.filter((m: any) => m.role !== 'system').length : 0} Turns
                            </span>
                        </div>

                        {/* Audio player */}
                        {audioUrl && (
                            <div style={{ borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
                                <ModernAudioPlayer audioUrl={audioUrl} initialDuration={durationSeconds} />
                            </div>
                        )}

                        {/* Messages */}
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(!messages || messages.length === 0) ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--label-tertiary)', gap: 8 }}>
                                    <FileText style={{ width: 20, height: 20, opacity: 0.2 }} />
                                    <p style={{ fontSize: 12, fontWeight: 500, margin: 0 }}>No Transcript Found</p>
                                </div>
                            ) : (
                                messages.filter((m: any) => m.role !== 'system').map((msg: any, idx: number) => {
                                    const isUser = msg.role === 'user';
                                    let timeStr = '';
                                    if (msg.startTime !== undefined && msg.startTime !== null) {
                                        const m = Math.floor(msg.startTime / 60);
                                        const s = Math.floor(msg.startTime % 60);
                                        timeStr = `${m}:${s.toString().padStart(2, '0')}`;
                                    }
                                    return (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-start' : 'flex-end', width: '100%' }}>
                                            <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
                                                <div style={{ marginBottom: 3 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: isUser ? 'var(--green)' : 'var(--teal)' }}>
                                                        {isUser ? 'User' : 'Agent'}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'var(--label-primary)', margin: 0 }}>
                                                    {msg.message || msg.content || msg.text || ''}
                                                </p>
                                            </div>
                                            {timeStr && (
                                                <span style={{ fontSize: 10, color: 'var(--label-tertiary)', marginTop: 3, paddingLeft: 2, paddingRight: 2 }}>
                                                    {timeStr}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', height: '100%', paddingRight: 2, paddingBottom: 8 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--label-tertiary)', margin: 0 }}>Call Stats</p>
                        <StatBox label="Duration" value={durationDisplay} icon={Clock} color="var(--teal)" />
                        {(displayCall.metadata?.charging?.call_charge > 0) && (
                            <StatBox label="Call Cost" value={`${displayCall.metadata.charging.call_charge} cr`} icon={Phone} color="var(--orange)" />
                        )}

                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--label-tertiary)', margin: '8px 0 0' }}>Call Info</p>
                        <div className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                                <span style={{ fontSize: 10, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Date & Time</span>
                                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-primary)', margin: '2px 0 0' }}>{startedAtDisplay}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 10, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Customer</span>
                                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-primary)', margin: '2px 0 0' }}>{extractedGuestName}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 10, color: 'var(--label-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Agent</span>
                                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-primary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assistantName}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
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
                <span style={{ fontSize: 17, fontWeight: 600, color, lineHeight: 1.1, marginTop: 1 }}>{value}</span>
            </div>
        </div>
    );
}

function ModernAudioPlayer({ audioUrl, initialDuration = 0 }: { audioUrl: string; initialDuration?: number }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const seekRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration);
    const volumeRef = useRef(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isStalled, setIsStalled] = useState(false);
    const [speed, setSpeed] = useState(1);
    const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const proxyUrl = audioUrl?.startsWith('http') ? `/api/audio-proxy?url=${encodeURIComponent(audioUrl)}` : audioUrl;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `recording-${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { window.URL.revokeObjectURL(url); document.body.removeChild(a); setIsDownloading(false); }, 100);
        } catch {
            window.open(audioUrl, '_blank');
            setIsDownloading(false);
        }
    };

    const formatTime = (secs: number) => {
        if (!isFinite(secs) || isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) audio.pause();
        else audio.play().catch(() => {});
    }, [isPlaying]);

    const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        const bar = seekRef.current;
        if (!audio || !bar || !isFinite(duration) || duration <= 0) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = ratio * duration;
        if (isFinite(newTime)) { audio.currentTime = newTime; setCurrentTime(newTime); }
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isMuted) { audio.volume = volumeRef.current || 1; audio.muted = false; setIsMuted(false); }
        else { audio.muted = true; setIsMuted(true); }
    };

    const skip = (secs: number) => {
        const audio = audioRef.current;
        if (!audio || !isFinite(duration) || duration <= 0) return;
        const newTime = Math.max(0, Math.min(duration, audio.currentTime + secs));
        if (isFinite(newTime)) { audio.currentTime = newTime; setCurrentTime(newTime); }
    };

    const changeSpeed = () => {
        const audio = audioRef.current;
        if (!audio) return;
        const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
        audio.playbackRate = next;
        setSpeed(next);
    };

    useEffect(() => { if (initialDuration > 0 && duration === 0) setDuration(initialDuration); }, [initialDuration, duration]);

    useEffect(() => {
        if (audioRef.current && audioUrl) { audioRef.current.load(); setIsPlaying(false); setCurrentTime(0); setIsLoading(true); }
    }, [audioUrl]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const setFiniteDuration = () => { if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration); setIsLoading(false); setIsStalled(false); };
        const onTimeUpdate = () => { if (!isDragging) setCurrentTime(audio.currentTime); };
        const onPlay = () => { setIsPlaying(true); setIsStalled(false); };
        const onPause = () => setIsPlaying(false);
        const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
        const onWaiting = () => setIsStalled(true);
        const onCanPlay = () => { setIsLoading(false); setIsStalled(false); };
        audio.addEventListener('loadedmetadata', setFiniteDuration);
        audio.addEventListener('durationchange', setFiniteDuration);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('playing', onCanPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('waiting', onWaiting);
        audio.addEventListener('canplay', onCanPlay);
        return () => {
            audio.removeEventListener('loadedmetadata', setFiniteDuration);
            audio.removeEventListener('durationchange', setFiniteDuration);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('playing', onCanPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('waiting', onWaiting);
            audio.removeEventListener('canplay', onCanPlay);
        };
    }, [isDragging]);

    const progressPct = (isFinite(duration) && duration > 0) ? (currentTime / duration) * 100 : 0;

    return (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <audio
                ref={audioRef}
                src={audioUrl?.startsWith('http') ? `/api/audio-proxy?url=${encodeURIComponent(audioUrl)}` : audioUrl}
                preload="metadata"
                style={{ display: 'none' }}
            />

            {/* Title + time */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-primary)' }}>Call Recording</span>
                <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: 'var(--label-tertiary)' }}>
                    {formatTime(currentTime)} / {(isLoading && duration === 0) ? '–:––' : formatTime(duration)}
                </span>
            </div>

            {/* Seek bar */}
            <div
                ref={seekRef}
                onClick={handleSeekClick}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                style={{ position: 'relative', height: 4, width: '100%', borderRadius: 99, background: 'var(--fill-secondary)', cursor: 'pointer' }}
            >
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 99, background: 'var(--teal)', width: `${progressPct}%`, transition: isDragging ? 'none' : 'width 75ms linear' }} />
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#fff', border: '2px solid var(--teal)', left: `calc(${progressPct}% - 5px)`, boxShadow: '0 2px 8px rgba(20,184,166,0.35)' }} />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Play/Pause */}
                    <button
                        onClick={togglePlay}
                        style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), #0d9488)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                        {isStalled ? (
                            <svg className="animate-spin" style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none">
                                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        ) : isPlaying ? (
                            <Pause style={{ width: 12, height: 12 }} />
                        ) : (
                            <Play style={{ width: 12, height: 12, marginLeft: 1 }} />
                        )}
                    </button>
                    {/* Skip buttons */}
                    <button onClick={() => skip(-10)} title="Rewind 10s" style={{ width: 26, height: 26, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label-tertiary)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <RotateCcw style={{ width: 13, height: 13 }} />
                    </button>
                    <button onClick={() => skip(10)} title="Forward 10s" style={{ width: 26, height: 26, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label-tertiary)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <RotateCw style={{ width: 13, height: 13 }} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Speed */}
                    <button onClick={changeSpeed} style={{ fontSize: 11, fontWeight: 600, color: 'var(--label-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--label-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--label-tertiary)')}>
                        {speed}x
                    </button>
                    {/* Divider */}
                    <div style={{ width: 1, height: 12, background: 'var(--hairline)' }} />
                    {/* Mute */}
                    <button onClick={toggleMute} style={{ width: 26, height: 26, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label-tertiary)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {isMuted ? <VolumeX style={{ width: 13, height: 13 }} /> : <Volume2 style={{ width: 13, height: 13 }} />}
                    </button>
                    {/* Download */}
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: 'rgba(20,184,166,0.12)', color: 'var(--teal)',
                            border: '1px solid rgba(20,184,166,0.22)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20,184,166,0.20)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(20,184,166,0.12)')}
                    >
                        {isDownloading ? (
                            <svg className="animate-spin" style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none">
                                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        ) : <Download style={{ width: 11, height: 11 }} />}
                        DL
                    </button>
                </div>
            </div>
        </div>
    );
}
