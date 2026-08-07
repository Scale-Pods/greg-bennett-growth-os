"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Mic, ExternalLink, Copy, Eye, EyeOff, Wallet, Phone, BarChart3, Smartphone } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useData } from "@/context/DataContext";

export default function CredentialsPage() {
    const { twilioBalance } = useData();

    const [vapiUsed, setVapiUsed] = useState<number | null>(null);
    useEffect(() => {
        fetch('/api/vapi/cost')
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data) setVapiUsed(data.totalUsed); })
            .catch(() => {});
    }, []);

    const senderEmails = [
        "bennettrealtysolutionsInvestor@gmail.com",
        "bennettrealtysolutionslearning@gmail.com",
        "BRSBiglife@gmail.com",
        "bennettrealtysolutions@gmail.com",
        "bennettbootcamps@gmail.com",
    ];
    const provisionedNumbers = [
        "16292911631",
        "12239011899",
        "13392554793",
        "19516442013",
        "19516443561",
        "18574039803",
    ];
    const loading = false;
    const router = useRouter();

    return (
        <div className="space-y-5 pb-8 max-w-5xl mx-auto">
            <div className="grid gap-4 md:grid-cols-2">
                {/* Email Section */}
                <CredentialSection
                    title="Email Integration"
                    description="Active sender accounts."
                    icon={Mail}
                    className="md:col-span-2"
                >
                    <div className="grid gap-3 md:grid-cols-3">
                        {loading ? (
                            <div className="md:col-span-2 text-sm animate-pulse" style={{ color: 'var(--label-tertiary)' }}>Detecting active email accounts...</div>
                        ) : senderEmails.length > 0 ? (
                            senderEmails.map((email, idx) => (
                                <ReadOnlyField key={idx} label={`Project Email ${idx + 1}`} value={email} />
                            ))
                        ) : (
                            <ReadOnlyField label="Connected Email" value="No active emails detected" />
                        )}
                    </div>
                </CredentialSection>

                {/* Provisioned Numbers Section */}
                <CredentialSection
                    title="Provisioned Phone Numbers"
                    description="Active telephony lines for Voice outreach."
                    icon={Phone}
                    className="md:col-span-2"
                >
                    <div className="grid gap-3 md:grid-cols-3">
                        {provisionedNumbers.map((num, idx) => (
                            <ReadOnlyField key={num} label={`Line ${idx + 1}`} value={`+${num}`} />
                        ))}
                    </div>
                </CredentialSection>

                {/* Voice Section */}
                <CredentialSection
                    title="Voice Agent (Vapi)"
                    description="AI Voice configuration and wallet balances."
                    icon={Mic}
                    className="md:col-span-2"
                    action={
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="border-[var(--glass-border)] text-[var(--blue)] hover:bg-[var(--fill-secondary)] text-xs h-8 px-3" onClick={() => router.push('/dashboard/voice/logs')}>
                                <BarChart3 className="h-3.5 w-3.5" />
                                Cost Analysis
                            </Button>
                            <Button size="sm" className="bg-[var(--blue)] hover:opacity-90 text-white gap-1.5 text-xs h-8 px-3" onClick={() => window.open('https://dashboard.vapi.ai/login', '_blank')}>
                                <Wallet className="h-3.5 w-3.5" />
                                Vapi Wallet
                            </Button>
                        </div>
                    }
                >
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--fill-quaternary)', border: '1px solid var(--glass-border)' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md" style={{ background: 'var(--fill-secondary)', border: '1px solid var(--glass-border)' }}>
                                <Mic className="h-4 w-4" style={{ color: 'var(--blue)' }} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--label-primary)' }}>Vapi Credits Used</p>
                                <span className="inline-block mt-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(10,132,255,0.10)', color: 'var(--blue)', border: '1px solid rgba(10,132,255,0.20)' }}>
                                    Total Lifetime Consumption
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--label-tertiary)' }}>Used</p>
                            <p className="text-xl font-bold" style={{ color: 'var(--blue)' }}>
                                {vapiUsed !== null ? `$${vapiUsed.toFixed(2)}` : '---'}
                            </p>
                        </div>
                    </div>
                </CredentialSection>

                {/* Twilio Section */}
                <CredentialSection
                    title="Twilio Telephony"
                    description="Real-time balance and usage records."
                    icon={Smartphone}
                    className="md:col-span-2"
                    action={
                        <Button size="sm" className="bg-[var(--red)] hover:opacity-90 text-white gap-1.5 text-xs h-8 px-3" onClick={() => window.open('https://console.twilio.com', '_blank')}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Twilio Console
                        </Button>
                    }
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--fill-quaternary)', border: '1px solid var(--glass-border)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-md" style={{ background: 'var(--fill-secondary)', border: '1px solid var(--glass-border)' }}>
                                    <Smartphone className="h-4 w-4" style={{ color: 'var(--red)' }} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--label-primary)' }}>Twilio Account</p>
                                    <p className="text-xs font-mono" style={{ color: 'var(--label-tertiary)' }}>{twilioBalance?.account_sid || '---'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--label-tertiary)' }}>Available Balance</p>
                                <p className="text-xl font-bold" style={{ color: 'var(--red)' }}>
                                    {twilioBalance?.balance !== undefined ? `$${twilioBalance.balance.toFixed(2)}` : '---'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl text-center" style={{ background: 'var(--fill-quaternary)', border: '1px solid var(--glass-border)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--label-tertiary)' }}>Total Recharge</p>
                                <p className="text-base font-bold mt-0.5" style={{ color: 'var(--label-primary)' }}>
                                    {twilioBalance?.total_recharge !== undefined ? `$${twilioBalance.total_recharge.toFixed(2)}` : '---'}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl text-center" style={{ background: 'var(--fill-quaternary)', border: '1px solid var(--glass-border)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--label-tertiary)' }}>Used</p>
                                <p className="text-base font-bold mt-0.5" style={{ color: 'var(--label-secondary)' }}>
                                    {twilioBalance?.used !== undefined ? `$${twilioBalance.used.toFixed(2)}` : '---'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CredentialSection>
            </div>
        </div>
    );
}

function CredentialSection({ title, description, icon: Icon, children, action, className }: any) {
    return (
        <div className={`liquid-card overflow-hidden ${className || ""}`} style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--separator)' }}>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--fill-tertiary)' }}>
                            <Icon className="h-4 w-4" style={{ color: 'var(--label-secondary)' }} />
                        </div>
                        <div className="min-w-0">
                            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--label-primary)' }}>{title}</h2>
                            <p style={{ fontSize: 11, color: 'var(--label-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</p>
                        </div>
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            </div>
            <div style={{ padding: 14 }}>
                {children}
            </div>
        </div>
    );
}

function ReadOnlyField({ label, value, isPassword }: { label: string, value: string, isPassword?: boolean }) {
    const [show, setShow] = useState(false);

    const displayValue = isPassword && !show
        ? "••••••••••••••••••••••••"
        : value;

    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--label-tertiary)' }}>{label}</p>
            <div className="relative group">
                <div className="flex items-center w-full rounded-md px-2.5 py-1.5 text-xs" style={{ border: '1px solid var(--glass-border)', background: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}>
                    <span className={`flex-1 truncate ${isPassword && !show ? 'font-mono tracking-widest' : ''}`}>
                        {displayValue}
                    </span>
                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isPassword && (
                            <button onClick={() => setShow(!show)} className="h-5 w-5 flex items-center justify-center" style={{ color: 'var(--label-tertiary)' }}>
                                {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                        )}
                        <button onClick={() => navigator.clipboard.writeText(value)} className="h-5 w-5 flex items-center justify-center" style={{ color: 'var(--label-tertiary)' }}>
                            <Copy className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
