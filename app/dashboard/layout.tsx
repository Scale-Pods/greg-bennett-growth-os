"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Mail, MessageCircle, Mic, Settings,
    LogOut, ChevronDown, Wallet, BarChart2, Users, Send,
    Key, ExternalLink, Sun, Moon, Inbox, AlertCircle, UserMinus,
    MessageSquare, Phone, Activity, Globe
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataProvider, useData } from "@/context/DataContext";
import { MaqsamBalanceDetail } from "@/components/dashboard/maqsam-balance-detail";
import { logout } from "@/app/actions/auth";

const dashboardConfig: Record<string, { label: string; color: string; icon: any; items: { title: string; href: string; icon: any }[] }> = {
    master: {
        label: "Master",
        color: "var(--blue)",
        icon: LayoutDashboard,
        items: [
            { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { title: "Leads", href: "/dashboard/leads", icon: Users },
            { title: "Scrapers", href: "/dashboard/scrappers", icon: Globe },
            { title: "Credentials", href: "/dashboard/credentials", icon: Key },
        ],
    },
    email: {
        label: "Email",
        color: "#8B5CF6",
        icon: Mail,
        items: [
            { title: "Dashboard", href: "/dashboard/email", icon: LayoutDashboard },
            { title: "Sent", href: "/dashboard/email/sent", icon: Send },
            { title: "Received", href: "/dashboard/email/received", icon: Inbox },
            { title: "Bounces", href: "/dashboard/email/bounces", icon: AlertCircle },
            { title: "Unsubscribed", href: "/dashboard/email/unsubscribed", icon: UserMinus },
            { title: "Analytics", href: "/dashboard/email/analytics", icon: BarChart2 },
        ],
    },
    whatsapp: {
        label: "WhatsApp",
        color: "#10B981",
        icon: MessageCircle,
        items: [
            { title: "Dashboard", href: "/dashboard/whatsapp", icon: LayoutDashboard },
            { title: "Chat", href: "/dashboard/whatsapp/chat", icon: MessageSquare },
            { title: "Leads", href: "/dashboard/whatsapp/leads", icon: Users },
            { title: "Analytics", href: "/dashboard/whatsapp/analytics", icon: BarChart2 },
        ],
    },
    sms: {
        label: "SMS",
        color: "#D6336C",
        icon: MessageSquare,
        items: [
            { title: "Dashboard", href: "/dashboard/sms", icon: LayoutDashboard },
            { title: "Chat", href: "/dashboard/sms/chat", icon: MessageSquare },
            { title: "Leads", href: "/dashboard/sms/leads", icon: Users },
            { title: "Analytics", href: "/dashboard/sms/analytics", icon: BarChart2 },
        ],
    },
    voice: {
        label: "Voice",
        color: "#06B6D4",
        icon: Mic,
        items: [
            { title: "Dashboard", href: "/dashboard/voice", icon: LayoutDashboard },
            { title: "Call Logs", href: "/dashboard/voice/logs", icon: Phone },
            { title: "Analytics", href: "/dashboard/voice/analytics", icon: BarChart2 },
            { title: "Calculator", href: "/dashboard/voice/calculator", icon: Activity },
        ],
    },
};

const mainApps = ['master', 'email', 'whatsapp', 'sms', 'voice'];



export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DataProvider>
            <DashboardContent>{children}</DashboardContent>
        </DataProvider>
    );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [dark, setDark] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [walletModal, setWalletModal] = useState<{ isOpen: boolean; type: 'vapi' | 'maqsam' | 'twilio' }>({
        isOpen: false, type: 'vapi',
    });
    const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);

    const isExpanded = isHovered;

    useEffect(() => {
        if (!isExpanded) {
            setIsChannelDropdownOpen(false);
        }
    }, [isExpanded]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
    }, [dark]);

    const { calls, voiceBalance, maqsamBalance, twilioBalance, loadingBalances, loadingCalls } = useData();

    const walletChips = [
        { type: 'vapi' as const, icon: <Mic size={13} />, color: '#0A84FF' },
        { type: 'twilio' as const, icon: <MessageCircle size={13} />, color: '#FF453A' },
        { type: 'maqsam' as const, icon: <Wallet size={13} />, color: '#40CBE0' },
    ];

    const maqsamUsedCost = useMemo(() => {
        if (!calls || !Array.isArray(calls)) return 0;
        return calls.filter((c: any) => {
            const isMaqsam = c.source === 'maqsam';
            const provisionedNum = String(c.phoneNumber || "");
            const isSpecificNum = provisionedNum.replace(/\D/g, '') === '97148714150';
            const phoneStr = String(c.phone || c.customer_number || "");
            const isUAE = phoneStr.startsWith('+971') || phoneStr.startsWith('971');
            return isMaqsam || isUAE || isSpecificNum;
        }).reduce((acc: number, call: any) => acc + (call.breakdown?.telephony || call.costValue || 0), 0);
    }, [calls]);

    let currentContext = "master";
    if (pathname.startsWith("/dashboard/email")) currentContext = "email";
    else if (pathname.startsWith("/dashboard/whatsapp")) currentContext = "whatsapp";
    else if (pathname.startsWith("/dashboard/sms")) currentContext = "sms";
    else if (pathname.startsWith("/dashboard/voice")) currentContext = "voice";

    const activeConfig = dashboardConfig[currentContext];



    const currentPageTitle = pathname === "/dashboard"
        ? "Dashboard"
        : (activeConfig.items.find((item) => item.href === pathname)?.title || activeConfig.label);

    return (
        <div className="flex h-screen overflow-hidden ambient-bg">
            
            {/* Sidebar Placeholder to push content */}
            <div style={{ width: '80px', flexShrink: 0, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="hidden md:block" />

            {/* Floating Universal Sidebar */}
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: isExpanded ? 260 : 80,
                    zIndex: 50,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
                    boxShadow: isExpanded ? '10px 0 30px rgba(0,0,0,0.5)' : '1px 0 0 var(--glass-border)',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column'
                }}
                className="apple-sidebar"
            >
                {/* Logo Area */}
                <div style={{ height: 90, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
                    <div style={{ position: 'relative', width: isExpanded ? 190 : 48, height: isExpanded ? 52 : 48, transition: 'all 0.3s ease', overflow: 'hidden' }}>
                        {isExpanded ? (
                            <Image src="/bennett-logo.png" alt="Bennett Growth OS" fill className="object-contain object-center" style={dark ? { filter: 'brightness(1.8) contrast(1.1)' } : undefined} priority />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-[var(--blue)]/10 text-[var(--blue)] flex items-center justify-center font-bold text-2xl border border-[var(--blue)]/20">B</div>
                        )}
                    </div>
                </div>

                {/* Dropdown for Main Apps to Save Space */}
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column' }}>
                    {isExpanded ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div className="text-[10px] font-bold text-[var(--label-tertiary)] uppercase tracking-widest px-2 mb-1">Channels</div>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <button
                                    onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        width: '100%', padding: '10px 12px', borderRadius: '12px',
                                        background: 'var(--fill-secondary)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--label-primary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    className="hover:bg-[var(--fill-tertiary)]"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {(() => {
                                            const app = dashboardConfig[currentContext];
                                            const Icon = app.icon;
                                            return <Icon size={18} style={{ color: app.color, flexShrink: 0 }} />;
                                        })()}
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                                            {dashboardConfig[currentContext].label}
                                        </span>
                                    </div>
                                    <ChevronDown size={14} style={{ 
                                        transform: isChannelDropdownOpen ? 'rotate(180deg)' : 'none',
                                        transition: 'transform 0.2s ease',
                                        color: 'var(--label-tertiary)'
                                    }} />
                                </button>

                                {isChannelDropdownOpen && (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                                        zIndex: 100, background: 'var(--bg-layer2)',
                                        backdropFilter: 'blur(35px) saturate(190%)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px', padding: '6px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                                        display: 'flex', flexDirection: 'column', gap: 4
                                    }}>
                                        {mainApps.filter(appKey => appKey !== currentContext).map(appKey => {
                                            const app = dashboardConfig[appKey];
                                            const Icon = app.icon;
                                            return (
                                                <Link
                                                    key={appKey}
                                                    href={appKey === 'master' ? '/dashboard' : `/dashboard/${appKey}`}
                                                    onClick={() => setIsChannelDropdownOpen(false)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        padding: '8px 10px', borderRadius: '8px',
                                                        color: 'var(--label-secondary)',
                                                        textDecoration: 'none',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    className="hover:bg-[var(--fill-tertiary)] hover:text-[var(--label-primary)]"
                                                >
                                                    <Icon size={16} style={{ color: app.color, flexShrink: 0 }} />
                                                    <span style={{ fontWeight: 500, fontSize: 13 }}>
                                                        {app.label}
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsHovered(true)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '48px', height: '48px', borderRadius: '12px',
                                background: 'var(--fill-secondary)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--label-primary)',
                                cursor: 'pointer',
                                margin: '0 auto'
                            }}
                        >
                            {(() => {
                                const app = dashboardConfig[currentContext];
                                const Icon = app.icon;
                                return <Icon size={20} style={{ color: app.color, flexShrink: 0 }} />;
                            })()}
                        </button>
                    )}
                </div>

                {/* Divider */}
                <div style={{ margin: '8px 16px', height: 1, background: 'var(--hairline)' }} />

                {/* Sub Navigation with Transition */}
                <nav style={{ flex: 1, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }} className="custom-scrollbar">
                    {isExpanded && (
                        <div style={{ color: activeConfig.color, transition: 'color 0.3s ease' }} className="text-[10px] font-bold uppercase tracking-widest px-2 mb-2">
                            {activeConfig.label} Options
                        </div>
                    )}
                    
                    {activeConfig.items.map((item) => {
                        const isActive = pathname === item.href;
                        const NavIcon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 12px', borderRadius: '12px',
                                    background: isActive ? 'var(--fill-secondary)' : 'transparent',
                                    color: isActive ? 'var(--label-primary)' : 'var(--label-secondary)',
                                    transition: 'all 0.2s ease',
                                    textDecoration: 'none',
                                    justifyContent: isExpanded ? 'flex-start' : 'center'
                                }}
                                className="hover:bg-[var(--fill-tertiary)]"
                            >
                                <NavIcon size={18} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                                <span style={{ 
                                    opacity: isExpanded ? 1 : 0, 
                                    width: isExpanded ? 'auto' : 0, 
                                    overflow: 'hidden', 
                                    fontWeight: 500, 
                                    fontSize: 13,
                                    transition: 'opacity 0.3s ease, width 0.3s ease',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {item.title}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Actions (Sign Out & Theme) */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--hairline)', background: 'var(--bg-layer1)' }}>
                    {currentContext === 'master' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, justifyContent: isExpanded ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
                            {walletChips.map(chip => (
                                <button
                                    key={chip.type}
                                    onClick={() => setWalletModal({ isOpen: true, type: chip.type })}
                                    className="wallet-chip"
                                    title={`View ${chip.type} wallet`}
                                >
                                    <span style={{ color: chip.color }}>{chip.icon}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => setDark(d => !d)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', borderRadius: '12px',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--label-secondary)',
                            justifyContent: isExpanded ? 'flex-start' : 'center',
                            transition: 'all 0.2s ease',
                        }}
                        className="hover:bg-[var(--fill-tertiary)] hover:text-[var(--label-primary)]"
                    >
                        {dark ? <Sun size={18} style={{ flexShrink: 0 }} /> : <Moon size={18} style={{ flexShrink: 0 }} />}
                        <span style={{ 
                            opacity: isExpanded ? 1 : 0, width: isExpanded ? 'auto' : 0, 
                            overflow: 'hidden', fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', transition: 'all 0.3s ease'
                        }}>
                            {dark ? 'Light Mode' : 'Dark Mode'}
                        </span>
                    </button>

                    <button
                        onClick={async () => { await logout(); router.push('/'); router.refresh(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', borderRadius: '12px',
                            background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)', 
                            cursor: 'pointer', color: '#EF4444',
                            justifyContent: isExpanded ? 'flex-start' : 'center',
                            transition: 'all 0.2s ease',
                        }}
                        className="hover:bg-red-500/20 hover:text-red-400"
                    >
                        <LogOut size={18} style={{ flexShrink: 0 }} />
                        <span style={{ 
                            opacity: isExpanded ? 1 : 0, width: isExpanded ? 'auto' : 0, 
                            overflow: 'hidden', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', transition: 'all 0.3s ease'
                        }}>
                            Sign Out
                        </span>
                    </button>
                    {isExpanded && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '10px', color: 'var(--label-quaternary)', marginTop: 8, letterSpacing: '0.05em' }}>
                            <span>Powered by</span>
                            <Image src="/scalepods-logo.avif" alt="ScalePods" width={60} height={16} style={{ filter: 'brightness(0.9) opacity(0.8)' }} />
                        </div>
                    )}
                </div>
            </aside>

            {/* ══ MAIN AREA ══ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                <main style={{ flex: 1, overflowY: 'auto', padding: 24 }} className="custom-scrollbar">
                    {children}
                </main>
            </div>

            {/* Wallet Modal */}
            <SidebarWalletModal
                isOpen={walletModal.isOpen}
                type={walletModal.type}
                onClose={() => setWalletModal(m => ({ ...m, isOpen: false }))}
                maqsamBalance={maqsamBalance}
                twilioBalance={twilioBalance}
                calls={calls}
            />
        </div>
    );
}

function SidebarWalletModal({ isOpen, onClose, type, maqsamBalance, twilioBalance, calls }: any) {
    const vapiAgentUsed = useMemo(() => {
        if (!calls || !Array.isArray(calls)) return 0;
        return calls.filter((c: any) => c.source === 'vapi').reduce((acc: number, call: any) => acc + (call.breakdown?.agent || 0), 0);
    }, [calls]);

    const titles: Record<string, string> = {
        vapi: 'Vapi Wallet',
        maqsam: 'Maqsam Telephony', twilio: 'Twilio Account',
    };
    const accentColors: Record<string, string> = {
        vapi: '#0A84FF', maqsam: '#40CBE0', twilio: '#FF453A',
    };
    const accent = accentColors[type] || '#0A84FF';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={type === 'maqsam' ? "sm:max-w-[550px]" : "sm:max-w-[400px]"}>
                <DialogHeader>
                    <DialogTitle style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--label-primary)' }}>
                        {titles[type]}
                    </DialogTitle>
                </DialogHeader>
                <div style={{ paddingTop: 8 }}>
                    {type === 'vapi' && (
                        <div style={{ background: `${accent}0F`, borderRadius: 16, padding: '28px 24px', textAlign: 'center', outline: `1px solid ${accent}22`, outlineOffset: -1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--label-tertiary)', marginBottom: 8 }}>Vapi Credits Used</div>
                            <div style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em', color: accent, fontVariantNumeric: 'tabular-nums' }}>${vapiAgentUsed.toFixed(2)}</div>
                        </div>
                    )}
                    {type === 'twilio' && (
                        <div style={{ background: `${accent}0F`, borderRadius: 16, padding: '24px', textAlign: 'center', outline: `1px solid ${accent}22`, outlineOffset: -1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--label-tertiary)', marginBottom: 8 }}>Remaining Balance</div>
                            <div style={{ fontSize: 40, fontWeight: 300, letterSpacing: '-0.03em', color: accent, fontVariantNumeric: 'tabular-nums' }}>
                                {typeof twilioBalance?.balance === 'number' ? `$${twilioBalance.balance.toFixed(2)}` : '—'}
                            </div>
                        </div>
                    )}
                    {type === 'maqsam' && (
                        <MaqsamBalanceDetail initialBalance={maqsamBalance} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
