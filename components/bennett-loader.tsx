"use client";

import React, { useEffect, useState } from "react";

interface BennettLoaderProps {
    fullScreen?: boolean;
}

export const BennettLoader = ({ fullScreen = false }: BennettLoaderProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div
            style={{
                position: fullScreen ? 'fixed' : 'absolute',
                inset: 0,
                zIndex: fullScreen ? 999 : 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(8, 11, 18, 0.15)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: fullScreen ? 0 : 'inherit',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 400ms ease',
            }}
        >
            <div className="glass-surface rounded-2xl px-8 py-7 flex flex-col items-center gap-0">
                <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(20,184,166,0.15)', filter: 'blur(16px)' }} className="animate-pulse" />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--hairline)' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--teal)' }} className="animate-spin" />
                    <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: 'var(--copper)' }} className="animate-[spin_1.5s_linear_infinite_reverse]" />
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="font-display text-[15px] font-bold text-[var(--label-primary)] tracking-tight">Bennett</span>
                    <span className="text-[15px] font-semibold text-[var(--label-secondary)]">Growth OS</span>
                </div>

                <div className="flex items-center gap-1.5 mt-3 opacity-70">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--copper)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
};

export default BennettLoader;
