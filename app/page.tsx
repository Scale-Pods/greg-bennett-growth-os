"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Mail, MessageCircle, Mic, Sun, Moon, Sparkles } from "lucide-react";
import { AuthModal } from "@/components/auth/auth-modal";

export default function LandingPage() {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [dark, setDark] = useState(true);

    const toggleTheme = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
    };

    return (
        <div className="min-h-screen overflow-hidden ambient-bg text-[var(--label-primary)] relative">

            {/* Floating orbs */}
            <div
                className="pointer-events-none fixed top-[12%] left-[8%] w-72 h-72 rounded-full opacity-60"
                style={{ background: 'var(--mesh-1)', filter: 'blur(80px)', animation: 'float-orb 14s ease-in-out infinite' }}
                aria-hidden
            />
            <div
                className="pointer-events-none fixed top-[55%] right-[5%] w-96 h-96 rounded-full opacity-50"
                style={{ background: 'var(--mesh-2)', filter: 'blur(100px)', animation: 'float-orb 18s ease-in-out infinite reverse' }}
                aria-hidden
            />

            {/* Header */}
            <header className="fixed top-0 w-full z-50 glass-header">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center rounded-xl glass-surface px-3 py-1.5 h-10">
                            <div className="relative w-[110px] h-[24px]">
                                <Image src="/bennett-logo.png" alt="Bennett Growth OS" fill className="object-contain theme-logo" priority />
                            </div>
                        </div>
                        <div className="hidden sm:block w-px h-5 bg-[var(--hairline)]" />
                        <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[var(--label-tertiary)]">
                            Powered by
                            <Image src="/scalepods-logo.avif" alt="ScalePods" width={60} height={16} className="inline-block opacity-80" />
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={toggleTheme} className="apple-btn-ghost p-2.5 rounded-xl" aria-label="Toggle theme">
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button onClick={() => setIsAuthModalOpen(true)} className="hidden sm:inline-flex apple-btn-ghost text-sm px-4 py-2 rounded-xl">
                            Sign In
                        </button>
                        <button onClick={() => setIsAuthModalOpen(true)} className="apple-btn-primary text-sm px-5 py-2.5 rounded-xl">
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main className="relative z-10 pt-36 sm:pt-44 pb-24 sm:pb-28 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full glass-surface text-[11px] font-bold uppercase tracking-widest text-[var(--teal)]">
                        <Sparkles size={13} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] animate-pulse-live" />
                        Business Automation Platform
                    </div>

                    <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.08] mb-6">
                        Automate Your<br />
                        <span className="bg-gradient-to-r from-[var(--teal)] via-[var(--blue)] to-[var(--copper)] bg-clip-text text-transparent">
                            Business Growth
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg leading-relaxed text-[var(--label-secondary)] max-w-xl mx-auto mb-10 font-medium">
                        A complete suite of intelligent tools to capture leads and automate follow-ups.
                        Manage every channel from one powerful dashboard.
                    </p>

                    <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="inline-flex items-center gap-2.5 apple-btn-primary text-base px-7 py-3.5 rounded-2xl"
                    >
                        Get Started Now
                        <ArrowRight size={18} />
                    </button>
                </div>

                {/* Feature Cards */}
                <div className="max-w-5xl mx-auto mt-20 sm:mt-28 grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                        {
                            icon: <Mail size={20} />,
                            color: 'var(--indigo)',
                            title: 'Email Marketing',
                            description: 'Send bulk campaigns, track opens and clicks, and verify bounce rates. Integrate with Gmail for high-volume outreach with precision analytics.',
                        },
                        {
                            icon: <MessageCircle size={20} />,
                            color: 'var(--green)',
                            title: 'WhatsApp CRM',
                            description: 'Engage leads instantly with broadcast messages and organised chat lists. Track delivery, manage customer details, and automate replies 24/7.',
                        },
                        {
                            icon: <Mic size={20} />,
                            color: 'var(--copper)',
                            title: 'AI Voice Agents',
                            description: 'Deploy human-like AI assistants for inbound support and outbound sales. Auto-schedule meetings, verify leads, and analyse calls with sentiment.',
                        },
                    ].map((card, i) => (
                        <div key={i} className="liquid-card group">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 glass-surface"
                                style={{ color: card.color }}
                            >
                                {card.icon}
                            </div>
                            <h3 className="font-display text-lg font-bold tracking-tight mb-2.5">{card.title}</h3>
                            <p className="text-sm leading-relaxed text-[var(--label-secondary)] font-medium">{card.description}</p>
                        </div>
                    ))}
                </div>

                {/* Stats */}
                <div className="max-w-4xl mx-auto mt-14 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { value: '3 Channels', label: 'Email · WhatsApp · Voice' },
                        { value: 'Real-time', label: 'Live metrics dashboard' },
                        { value: 'AI-Powered', label: 'Intelligent automation' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center py-6 liquid-card-sm">
                            <div className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--label-primary)] mb-1.5">
                                {stat.value}
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-[var(--label-secondary)]">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </main>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} defaultMode="login" />
        </div>
    );
}
