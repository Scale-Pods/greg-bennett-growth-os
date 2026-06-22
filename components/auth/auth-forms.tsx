'use client';

import { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { login, forgotPassword } from '@/app/actions/auth';

type AuthMode = 'login' | 'forgot';

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px 11px 42px',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 400,
    letterSpacing: '-0.011em',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: 'rgba(255,255,255,0.88)',
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    boxSizing: 'border-box',
};

function StyledInput({ id, name, type, placeholder, required }: {
    id: string; name: string; type: string; placeholder: string; required?: boolean;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <div style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.30)', pointerEvents: 'none', display: 'flex',
            }}>
                {type === 'email' ? <Mail size={16} /> : <Lock size={16} />}
            </div>
            <input
                id={id}
                name={name}
                type={type}
                placeholder={placeholder}
                required={required}
                onFocus={e => {
                    setFocused(true);
                    e.currentTarget.style.borderColor = '#0A84FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,132,255,0.22)';
                }}
                onBlur={e => {
                    setFocused(false);
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
                style={{
                    ...inputStyle,
                    borderColor: focused ? '#0A84FF' : 'rgba(255,255,255,0.10)',
                }}
            />
        </div>
    );
}

export function AuthForms({ defaultMode = 'login', onSuccess }: { defaultMode?: AuthMode, onSuccess?: () => void }) {
    const [mode, setMode] = useState<AuthMode>(defaultMode);
    const router = useRouter();

    const [loginState, loginAction, isLoginPending] = useActionState(login, null as any);
    const [forgotState, forgotAction, isForgotPending] = useActionState(forgotPassword, null as any);

    useEffect(() => {
        if (loginState?.success) {
            router.push('/dashboard');
            onSuccess?.();
            router.refresh();
        }
    }, [loginState, router, onSuccess]);

    const error = loginState?.error || forgotState?.error;
    const isPending = isLoginPending || isForgotPending;

    const labelStyle: React.CSSProperties = {
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.30)',
        display: 'block',
        marginBottom: 6,
    };

    if (mode === 'forgot' && forgotState?.success) {
        return (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'rgba(48,209,88,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                }}>
                    <CheckCircle2 size={26} color="#30D158" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.022em', marginBottom: 8 }}>
                    Check Your Email
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.44)', lineHeight: 1.6, marginBottom: 24 }}>
                    If an account exists for that address, you&apos;ll receive a password reset link shortly.
                </p>
                <button
                    onClick={() => setMode('login')}
                    style={{ fontSize: 13, fontWeight: 600, color: '#0A84FF', background: 'none', border: 'none', cursor: 'default' }}
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            {/* Heading */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <h2 style={{
                    fontSize: 26, fontWeight: 600, letterSpacing: '-0.022em',
                    color: 'rgba(255,255,255,0.92)', marginBottom: 6,
                }}>
                    {mode === 'login' ? 'Welcome Back' : 'Reset Password'}
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.40)', letterSpacing: '-0.011em', fontWeight: 400 }}>
                    {mode === 'login'
                        ? 'Enter your credentials to access your dashboard'
                        : 'Enter your email to receive a reset link'}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                    background: 'rgba(255,69,58,0.12)',
                    border: '1px solid rgba(255,69,58,0.22)',
                    color: '#FF453A', fontSize: 13, fontWeight: 500, textAlign: 'center',
                }}>
                    {error}
                </div>
            )}

            <form action={mode === 'login' ? loginAction : forgotAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                    <label htmlFor="email" style={labelStyle}>Email Address</label>
                    <StyledInput id="email" name="email" type="email" placeholder="name@example.com" required />
                </div>

                {mode === 'login' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <label htmlFor="password" style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                            <button
                                type="button"
                                onClick={() => setMode('forgot')}
                                style={{
                                    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.30)',
                                    background: 'none', border: 'none', cursor: 'default',
                                    letterSpacing: '0.04em', textTransform: 'uppercase',
                                    transition: 'color 130ms ease',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#0A84FF')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.30)')}
                            >
                                Forgot?
                            </button>
                        </div>
                        <StyledInput id="password" name="password" type="password" placeholder="••••••••" required />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    style={{
                        marginTop: 6,
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#ffffff',
                        background: isPending ? 'rgba(10,132,255,0.60)' : '#0A84FF',
                        border: 'none',
                        cursor: isPending ? 'not-allowed' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        letterSpacing: '-0.01em',
                        boxShadow: '0 2px 8px rgba(10,132,255,0.30)',
                        transition: 'opacity 150ms ease, transform 100ms ease',
                    }}
                    onMouseEnter={e => { if (!isPending) e.currentTarget.style.opacity = '0.88'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    onMouseDown={e => { if (!isPending) e.currentTarget.style.transform = 'scale(0.97)'; }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    {isPending ? (
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                        <>
                            {mode === 'login' ? 'Sign In' : 'Send Reset Link'}
                            <ArrowRight size={15} />
                        </>
                    )}
                </button>
            </form>

            {mode === 'forgot' && (
                <div style={{ textAlign: 'center', marginTop: 18 }}>
                    <button
                        onClick={() => setMode('login')}
                        style={{ fontSize: 13, fontWeight: 600, color: '#0A84FF', background: 'none', border: 'none', cursor: 'default' }}
                    >
                        Back to Login
                    </button>
                </div>
            )}
        </div>
    );
}
