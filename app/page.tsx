"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Mail, MessageCircle, Mic, Sun, Moon } from "lucide-react";
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
        <div className="min-h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--label-primary)]">

            {/* ── Header ── */}
            <header className="fixed top-0 w-full z-50 glass-header">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center rounded-lg bg-white px-3 py-1 shadow-sm border border-[var(--hairline)] h-9">
                            <div className="relative w-[110px] h-[24px]">
                                <Image src="/bennett-logo.png" alt="Bennett Growth OS" fill className="object-contain" priority />
                            </div>
                        </div>
                        <div className="hidden sm:block w-px h-5 bg-[var(--hairline)]" />
                        <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-[var(--label-tertiary)]">
                            Powered by{' '}
                            <Image src="/scalepods-logo.avif" alt="ScalePods" width={60} height={16} className="inline-block align-middle" />
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="apple-btn-ghost p-2 rounded-lg"
                            aria-label="Toggle theme"
                        >
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="hidden sm:inline-flex apple-btn-ghost text-sm px-3 py-2 rounded-lg"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="apple-btn-primary text-sm px-4 py-2 rounded-lg"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Hero ── */}
            <main className="pt-32 sm:pt-40 pb-20 sm:pb-24 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto text-center">
                    {/* Pill */}
                    <div className="inline-flex items-center gap-2 mb-6 sm:mb-8 px-3 py-1.5 rounded-full bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)] text-[11px] font-semibold uppercase tracking-wider text-[var(--blue)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue)] animate-pulse-live" />
                        Business Automation Platform
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-5 sm:mb-6">
                        Automate Your<br />
                        <span className="text-[var(--blue)]">Business Growth</span>
                    </h1>

                    {/* Sub */}
                    <p className="text-base sm:text-lg leading-relaxed text-[var(--label-secondary)] max-w-xl mx-auto mb-8 sm:mb-10">
                        A complete suite of intelligent tools to capture leads and automate follow-ups.
                        Manage every channel from one powerful dashboard.
                    </p>

                    {/* CTA */}
                    <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="inline-flex items-center gap-2 apple-btn-primary text-base px-6 py-3 rounded-xl shadow-md"
                    >
                        Get Started Now
                        <ArrowRight size={18} />
                    </button>
                </div>

                {/* ── Feature Cards ── */}
                <div className="max-w-5xl mx-auto mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                    {[
                        {
                            icon: <Mail size={20} />,
                            color: '#4F46E5',
                            title: 'Email Marketing',
                            description: 'Send bulk campaigns, track opens and clicks, and verify bounce rates. Integrate with Gmail for high-volume outreach with precision analytics.',
                        },
                        {
                            icon: <MessageCircle size={20} />,
                            color: '#10B981',
                            title: 'WhatsApp CRM',
                            description: 'Engage leads instantly with broadcast messages and organised chat lists. Track delivery, manage customer details, and automate replies 24/7.',
                        },
                        {
                            icon: <Mic size={20} />,
                            color: '#F59E0B',
                            title: 'AI Voice Agents',
                            description: 'Deploy human-like AI assistants for inbound support and outbound sales. Auto-schedule meetings, verify leads, and analyse calls with sentiment.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            className="liquid-card group cursor-default"
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                                style={{ background: `${card.color}12`, color: card.color }}
                            >
                                {card.icon}
                            </div>

                            <h3 className="text-base font-semibold tracking-tight mb-2">
                                {card.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-[var(--label-secondary)]">
                                {card.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ── Stats Strip ── */}
                <div className="max-w-4xl mx-auto mt-12 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    {[
                        { value: '3 Channels', label: 'Email · WhatsApp · Voice' },
                        { value: 'Real-time', label: 'Live metrics dashboard' },
                        { value: 'AI-Powered', label: 'Intelligent automation' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center py-5 sm:py-6 liquid-card-sm">
                            <div className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--label-primary)] mb-1">
                                {stat.value}
                            </div>
                            <div className="text-xs sm:text-sm font-medium text-[var(--label-secondary)]">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* ── Auth Modal ── */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                defaultMode="login"
            />
        </div>
    );
}
