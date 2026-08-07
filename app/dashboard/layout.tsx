"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Mail, MessageCircle, Mic, Settings,
    LogOut, ChevronDown, Wallet, BarChart2, Users, Send,
    Key, ExternalLink, Inbox, AlertCircle, UserMinus,
    MessageSquare, Phone, Activity, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataProvider, useData } from "@/context/DataContext";
import { logout } from "@/app/actions/auth";
import { DateRangePicker } from "@/components/ui/date-range-picker";

const dashboardConfig: Record<string, { label: string; color: string; icon: any; items: { title: string; href: string; icon: any }[] }> = {
    master: {
        label: "Master",
        color: "var(--blue)",
        icon: LayoutDashboard,
        items: [
            { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { title: "Leads", href: "/dashboard/leads", icon: Users },
            { title: "Inbound Leads", href: "/dashboard/inbound-leads", icon: Inbox },
            { title: "Credentials", href: "/dashboard/credentials", icon: Key },
        ],
    },
    email: {
        label: "Email",
        color: "var(--blue)",
        icon: Mail,
        items: [
            { title: "Email Dashboard", href: "/dashboard/email", icon: LayoutDashboard },
            { title: "Sent", href: "/dashboard/email/sent", icon: Send },
            { title: "Received", href: "/dashboard/email/received", icon: Inbox },
            { title: "Bounces", href: "/dashboard/email/bounces", icon: AlertCircle },
            { title: "Unsubscribed", href: "/dashboard/email/unsubscribed", icon: UserMinus },
            { title: "Analytics", href: "/dashboard/email/analytics", icon: BarChart2 },
        ],
    },
    voice: {
        label: "Voice",
        color: "var(--orange)",
        icon: Mic,
        items: [
            { title: "Voice Dashboard", href: "/dashboard/voice", icon: LayoutDashboard },
            { title: "Call Logs", href: "/dashboard/voice/logs", icon: Phone },
            { title: "Analytics", href: "/dashboard/voice/analytics", icon: BarChart2 },
            { title: "Calculator", href: "/dashboard/voice/calculator", icon: Activity },
        ],
    },
};

const mainApps = ['master', 'email', 'voice'];

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
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [walletModal, setWalletModal] = useState<{ isOpen: boolean; type: 'vapi' | 'twilio' }>({
        isOpen: false, type: 'vapi',
    });
    const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
    const [vapiUsed, setVapiUsed] = useState<number | null>(null);

    const { calls, voiceBalance, twilioBalance, loadingBalances, loadingCalls, dateRange, setDateRange } = useData();

    useEffect(() => {
        fetch('/api/vapi/cost')
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data) setVapiUsed(data.totalUsed); })
            .catch(() => {});
    }, []);

    const walletBars = [
        { type: 'vapi' as const, label: 'Vapi', icon: <Mic size={12} />, color: 'var(--blue)', amount: vapiUsed },
        { type: 'twilio' as const, label: 'Twilio', icon: <MessageCircle size={12} />, color: 'var(--red)', amount: typeof twilioBalance?.balance === 'number' ? twilioBalance.balance : null },
    ];

    let currentContext = "master";
    if (pathname.startsWith("/dashboard/email")) currentContext = "email";
    else if (pathname.startsWith("/dashboard/voice")) currentContext = "voice";

    const activeConfig = dashboardConfig[currentContext];

    const currentPageTitle = pathname === "/dashboard"
        ? "Dashboard"
        : (activeConfig.items.find((item) => item.href === pathname)?.title || activeConfig.label);

    const sidebarWidth = sidebarExpanded ? 260 : 80;

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-app)' }}>
            {/* Sidebar */}
            <aside
                style={{
                    width: sidebarWidth,
                    flexShrink: 0,
                    zIndex: 50,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                }}
                className="app-sidebar"
                onMouseEnter={() => setSidebarExpanded(true)}
                onMouseLeave={() => setSidebarExpanded(false)}
            >
                {/* Logo Area */}
                <div style={{ height: 72, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: sidebarExpanded ? 160 : 40, height: sidebarExpanded ? 40 : 40, transition: 'all 0.3s ease', overflow: 'hidden', flexShrink: 0 }}>
                        {sidebarExpanded ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: '8px', padding: '4px 8px' }}>
                                <Image src="/bennett-logo.png" alt="Bennett Growth OS" fill className="object-contain object-center" priority style={{ filter: 'brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(185deg) brightness(1.1) drop-shadow(0 0 6px rgba(59,130,246,0.4))' }} />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl" style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--label-primary)' }}>B</div>
                        )}
                    </div>
                </div>

                {/* Channel Dropdown */}
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column' }}>
                    {sidebarExpanded ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div className="nav-section-label" style={{ padding: '8px 8px 4px' }}>Channels</div>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <button
                                    onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                                        background: 'var(--fill-tertiary)',
                                        color: 'var(--label-primary)',
                                        cursor: 'default',
                                        border: 'none',
                                        fontSize: 13, fontWeight: 500,
                                        transition: 'background 130ms',
                                    }}
                                    className="hover:bg-[var(--fill-secondary)]"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {(() => {
                                            const app = dashboardConfig[currentContext];
                                            const Icon = app.icon;
                                            return <Icon size={16} style={{ color: app.color, flexShrink: 0 }} />;
                                        })()}
                                        <span>{dashboardConfig[currentContext].label}</span>
                                    </div>
                                    <ChevronDown size={13} style={{
                                        transform: isChannelDropdownOpen ? 'rotate(180deg)' : 'none',
                                        transition: 'transform 0.2s ease',
                                        color: 'var(--label-secondary)'
                                    }} />
                                </button>

                                {isChannelDropdownOpen && (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                                        zIndex: 100,
                                        background: 'var(--glass-fill)',
                                        backdropFilter: 'blur(60px) saturate(180%)',
                                        borderRadius: 'var(--radius-xl)',
                                        padding: '6px',
                                        boxShadow: 'var(--glass-shadow)',
                                        outline: '1px solid var(--glass-border)',
                                        outlineOffset: -1,
                                        display: 'flex', flexDirection: 'column', gap: 2
                                    }}>
                                        {mainApps.filter(appKey => appKey !== currentContext).map(appKey => {
                                            const app = dashboardConfig[appKey];
                                            const Icon = app.icon;
                                            return (
                                                <Link
                                                    key={appKey}
                                                    href={appKey === 'master' ? '/dashboard' : `/dashboard/${appKey}`}
                                                    onClick={() => setIsChannelDropdownOpen(false)}
                                                    className="nav-item"
                                                >
                                                    <Icon size={16} style={{ color: app.color, flexShrink: 0 }} />
                                                    <span>{app.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setSidebarExpanded(true)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                                background: 'var(--fill-tertiary)',
                                border: 'none',
                                color: 'var(--label-primary)',
                                cursor: 'default',
                                margin: '0 auto',
                                transition: 'background 130ms',
                            }}
                            className="hover:bg-[var(--fill-secondary)]"
                        >
                            {(() => {
                                const app = dashboardConfig[currentContext];
                                const Icon = app.icon;
                                return <Icon size={18} style={{ color: app.color, flexShrink: 0 }} />;
                            })()}
                        </button>
                    )}
                </div>

                {/* Divider */}
                <div style={{ margin: '4px 16px', height: 1, background: 'var(--separator)' }} />

                {/* Sub Navigation */}
                <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
                    {sidebarExpanded && (
                        <div className="nav-section-label" style={{ color: activeConfig.color, padding: '8px 8px 4px' }}>
                            {activeConfig.label}
                        </div>
                    )}
                    
                    {activeConfig.items.map((item) => {
                        const isActive = pathname === item.href;
                        const NavIcon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={isActive ? 'nav-item active' : 'nav-item'}
                                style={{ justifyContent: sidebarExpanded ? 'flex-start' : 'center' }}
                            >
                                <NavIcon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                                <span style={{ 
                                    opacity: sidebarExpanded ? 1 : 0, 
                                    width: sidebarExpanded ? 'auto' : 0, 
                                    overflow: 'hidden', 
                                    transition: 'opacity 0.2s ease, width 0.2s ease',
                                }}>
                                    {item.title}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--separator)' }}>
                    {currentContext === 'master' && sidebarExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {walletBars.map(bar => {
                                const pct = bar.amount !== null ? Math.min(100, Math.max(4, (bar.amount / 100) * 100)) : 0;
                                return (
                                    <button
                                        key={bar.type}
                                        onClick={() => setWalletModal({ isOpen: true, type: bar.type })}
                                        className="wallet-bar"
                                        title={`View ${bar.label} wallet`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--label-secondary)' }}>
                                                <span style={{ color: bar.color }}>{bar.icon}</span>
                                                {bar.label}
                                            </span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--label-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                                {bar.amount !== null ? `$${bar.amount.toFixed(2)}` : '—'}
                                            </span>
                                        </div>
                                        <div style={{ height: 4, borderRadius: 2, background: 'var(--fill-tertiary)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: bar.color, transition: 'width 300ms ease' }} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {currentContext === 'master' && !sidebarExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            {walletBars.map(bar => (
                                <button
                                    key={bar.type}
                                    onClick={() => setWalletModal({ isOpen: true, type: bar.type })}
                                    className="wallet-chip"
                                    title={`${bar.label}: ${bar.amount !== null ? `$${bar.amount.toFixed(2)}` : '—'}`}
                                >
                                    <span style={{ color: bar.color }}>{bar.icon}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={async () => { await logout(); router.push('/'); router.refresh(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 12px', borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,69,58,0.12)',
                            border: 'none',
                            cursor: 'default',
                            color: 'var(--red)',
                            justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                            transition: 'background 130ms',
                            fontSize: 13, fontWeight: 500,
                        }}
                        className="hover:bg-[rgba(255,69,58,0.2)]"
                    >
                        <LogOut size={15} style={{ flexShrink: 0 }} />
                        <span style={{ 
                            opacity: sidebarExpanded ? 1 : 0, width: sidebarExpanded ? 'auto' : 0, 
                            overflow: 'hidden', whiteSpace: 'nowrap', transition: 'all 0.2s ease'
                        }}>
                            Sign Out
                        </span>
                    </button>
                </div>
            </aside>

            {/* MAIN AREA */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                    {children}
                </main>
            </div>

            {/* Wallet Modal */}
            <SidebarWalletModal
                isOpen={walletModal.isOpen}
                type={walletModal.type}
                onClose={() => setWalletModal(m => ({ ...m, isOpen: false }))}
                twilioBalance={twilioBalance}
                vapiUsed={vapiUsed}
            />
        </div>
    );
}

function SidebarWalletModal({ isOpen, onClose, type, twilioBalance, vapiUsed }: any) {
    const vapiAgentUsed = vapiUsed ?? 0;

    const titles: Record<string, string> = {
        vapi: 'Vapi Wallet', twilio: 'Twilio Account',
    };
    const accentColors: Record<string, string> = {
        vapi: 'var(--blue)', twilio: 'var(--red)',
    };
    const accent = accentColors[type] || 'var(--blue)';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={`app-dialog sm:max-w-[400px]`}>
                <DialogHeader>
                    <DialogTitle style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.022em' }}>
                        {titles[type]}
                    </DialogTitle>
                </DialogHeader>
                <div style={{ paddingTop: 8 }}>
                    {type === 'vapi' && (
                        <div style={{ background: 'rgba(10,132,255,0.10)', borderRadius: 16, padding: '28px 24px', textAlign: 'center', outline: '1px solid rgba(10,132,255,0.12)', outlineOffset: -1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--label-secondary)', marginBottom: 8 }}>Vapi Credits Used</div>
                            <div style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em', color: accent, fontVariantNumeric: 'tabular-nums' }}>${vapiAgentUsed.toFixed(2)}</div>
                        </div>
                    )}
                    {type === 'twilio' && (
                        <div style={{ background: 'rgba(255,69,58,0.08)', borderRadius: 16, padding: '24px', textAlign: 'center', outline: '1px solid rgba(255,69,58,0.12)', outlineOffset: -1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--label-secondary)', marginBottom: 8 }}>Remaining Balance</div>
                            <div style={{ fontSize: 40, fontWeight: 300, letterSpacing: '-0.03em', color: accent, fontVariantNumeric: 'tabular-nums' }}>
                                {typeof twilioBalance?.balance === 'number' ? `$${twilioBalance.balance.toFixed(2)}` : '—'}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
