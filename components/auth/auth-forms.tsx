'use client';

import { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { login, forgotPassword } from '@/app/actions/auth';

type AuthMode = 'login' | 'forgot';

function StyledInput({ id, name, type, placeholder, required }: {
    id: string; name: string; type: string; placeholder: string; required?: boolean;
}) {
    return (
        <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--label-tertiary)] pointer-events-none flex">
                {type === 'email' ? <Mail size={16} /> : <Lock size={16} />}
            </div>
            <input
                id={id}
                name={name}
                type={type}
                placeholder={placeholder}
                required={required}
                className="auth-input"
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

    if (mode === 'forgot' && forgotState?.success) {
        return (
            <div className="text-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-[rgba(5,150,105,0.12)] border border-[rgba(5,150,105,0.22)] flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 size={26} className="text-[var(--green)]" />
                </div>
                <h2 className="font-display text-2xl font-bold text-[var(--label-primary)] mb-2">Check Your Email</h2>
                <p className="text-sm text-[var(--label-secondary)] leading-relaxed mb-6 font-medium">
                    If an account exists for that address, you&apos;ll receive a password reset link shortly.
                </p>
                <button onClick={() => setMode('login')} className="text-sm font-bold text-[var(--teal)] bg-transparent border-none cursor-pointer">
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="text-center mb-7">
                <h2 className="font-display text-[1.65rem] font-bold text-[var(--label-primary)] mb-2">
                    {mode === 'login' ? 'Welcome Back' : 'Reset Password'}
                </h2>
                <p className="text-sm text-[var(--label-secondary)] font-medium">
                    {mode === 'login'
                        ? 'Enter your credentials to access your dashboard'
                        : 'Enter your email to receive a reset link'}
                </p>
            </div>

            {error && (
                <div className="p-3 rounded-xl mb-4 text-center text-sm font-semibold bg-[rgba(220,38,38,0.10)] border border-[rgba(220,38,38,0.20)] text-[var(--red)]">
                    {error}
                </div>
            )}

            <form action={mode === 'login' ? loginAction : forgotAction} className="flex flex-col gap-4">
                <div>
                    <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-[var(--label-tertiary)] mb-1.5">
                        Email Address
                    </label>
                    <StyledInput id="email" name="email" type="email" placeholder="name@example.com" required />
                </div>

                {mode === 'login' && (
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-[var(--label-tertiary)]">
                                Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setMode('forgot')}
                                className="text-[10px] font-bold uppercase tracking-widest text-[var(--label-tertiary)] hover:text-[var(--teal)] bg-transparent border-none cursor-pointer transition-colors"
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
                    className="apple-btn apple-btn-primary w-full mt-1 py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <>
                            {mode === 'login' ? 'Sign In' : 'Send Reset Link'}
                            <ArrowRight size={15} />
                        </>
                    )}
                </button>
            </form>

            {mode === 'forgot' && (
                <div className="text-center mt-5">
                    <button onClick={() => setMode('login')} className="text-sm font-bold text-[var(--teal)] bg-transparent border-none cursor-pointer">
                        Back to Login
                    </button>
                </div>
            )}
        </div>
    );
}
