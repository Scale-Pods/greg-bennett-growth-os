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
                background: 'transparent',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                borderRadius: fullScreen ? 0 : 'inherit',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 400ms ease',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                {/* Spinner */}
                <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Glow */}
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(59,91,219,0.12)', filter: 'blur(16px)' }} className="animate-pulse" />
                    {/* Outer track */}
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--hairline)' }} />
                    {/* Outer spinner */}
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--blue)' }} className="animate-spin" />
                    {/* Inner track */}
                    <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid var(--hairline)' }} />
                    {/* Inner spinner reverse */}
                    <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: 'var(--blue)' }} className="animate-[spin_1.5s_linear_infinite_reverse]" />
                </div>

                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--label-primary)', letterSpacing: '-0.02em' }}>Bennett</span>
                    <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--label-secondary)', letterSpacing: '-0.01em' }}>Growth OS</span>
                </div>

                {/* Dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 14, opacity: 0.6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--blue)' }} className="animate-bounce" />
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--blue)', animationDelay: '150ms' }} className="animate-bounce" />
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--blue)', animationDelay: '300ms' }} className="animate-bounce" />
                </div>
            </div>
        </div>
    );
};

export default BennettLoader;
