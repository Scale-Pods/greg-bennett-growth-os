'use client';

import { useState, useEffect, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { resetPassword } from '@/app/actions/auth';

export default function ResetPasswordPage() {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [hashError, setHashError] = useState<string | null>(null);
    const router = useRouter();

    const [state, action, isPending] = useActionState(resetPassword, null as any);

    useEffect(() => {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const type = params.get('type');
        const token = params.get('access_token');

        if (!token || type !== 'recovery') {
            setHashError('Invalid or expired reset link. Please request a new one.');
        } else {
            setAccessToken(token);
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    useEffect(() => {
        if (state?.success) {
            const t = setTimeout(() => router.push('/'), 3000);
            return () => clearTimeout(t);
        }
    }, [state, router]);

    return (
        <div className="min-h-screen ambient-bg flex items-center justify-center p-6">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-64 bg-apple-blue/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative w-full max-w-md apple-dialog !rounded-3xl overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-apple-blue/30 to-transparent" />

                <div className="p-8 pt-12 space-y-8">
                    <div className="flex justify-center">
                        <div 
                            className="relative flex items-center justify-center rounded-xl bg-white/95 px-3 py-1 shadow-sm border border-white/20 transition-all duration-200 hover:bg-white"
                            style={{ height: '36px' }}
                        >
                            <div className="relative w-[110px] h-[24px]">
                                <Image src="/bennett-logo.png" alt="Bennett Growth OS" fill className="object-contain" priority />
                            </div>
                        </div>
                    </div>

                    {hashError && (
                        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 rounded-full bg-apple-red/10 flex items-center justify-center">
                                    <XCircle className="h-8 w-8 text-apple-red" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-heading text-label mb-2">Link Invalid</h1>
                                <p className="text-label-secondary text-sm">{hashError}</p>
                            </div>
                            <Button
                                onClick={() => router.push('/')}
                                className="w-full h-11 rounded-xl gap-2"
                            >
                                Back to Login
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {!hashError && state?.success && (
                        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 rounded-full bg-apple-green/10 flex items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 text-apple-green" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-heading text-label mb-2">Password Updated</h1>
                                <p className="text-label-secondary text-sm">{state.message}</p>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 text-label-tertiary text-xs">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Redirecting to login&hellip;
                            </div>
                        </div>
                    )}

                    {!hashError && !state?.success && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="space-y-2 text-center">
                                <h1 className="text-3xl font-semibold tracking-heading text-label">Set New Password</h1>
                                <p className="text-label-secondary text-sm">Choose a strong password for your account</p>
                            </div>

                            {state?.error && (
                                <div className="p-3 text-xs font-semibold bg-apple-red/10 border border-apple-red/20 text-apple-red rounded-xl text-center">
                                    {state.error}
                                </div>
                            )}

                            <form action={action} className="space-y-4">
                                <input type="hidden" name="accessToken" value={accessToken ?? ''} />

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-label-secondary text-xs font-semibold tracking-nav-label uppercase">
                                        New Password
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-label-tertiary" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            placeholder="••••••••"
                                            required
                                            minLength={8}
                                            autoFocus
                                            className="pl-10 h-11 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-label-secondary text-xs font-semibold tracking-nav-label uppercase">
                                        Confirm Password
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-label-tertiary" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            required
                                            className="pl-10 h-11 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isPending || !accessToken}
                                    className="w-full h-11 rounded-xl gap-2"
                                >
                                    {isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            Update Password
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
