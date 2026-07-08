'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthForms } from "./auth-forms";
import Image from "next/image";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultMode?: 'login' | 'forgot';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-none bg-transparent">
                <DialogHeader className="sr-only">
                    <DialogTitle>Authentication</DialogTitle>
                    <DialogDescription>Authenticate to access your dashboard.</DialogDescription>
                </DialogHeader>

                <div className="relative" style={{ background: 'var(--glass-fill)', backdropFilter: 'blur(60px) saturate(180%)', borderRadius: 'var(--radius-2xl)', outline: '1px solid var(--glass-border)', outlineOffset: -1, boxShadow: 'var(--glass-shadow)' }}>
                    {/* Top accent line */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--teal)]/50 to-transparent" style={{ borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0' }} />

                    {/* Ambient glow */}
                    <div
                        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full opacity-60"
                        style={{ background: 'var(--mesh-1)', filter: 'blur(48px)' }}
                        aria-hidden
                    />

                    <div className="relative p-8 pt-10">
                        <div className="flex justify-center mb-8">
                            <div className="relative flex items-center justify-center rounded-xl glass-surface px-3 py-1.5 h-9" style={{ background: 'rgba(255,255,255,0.12)' }}>
                                <div className="relative w-[110px] h-[24px]">
                                    <Image src="/bennett-logo.png" alt="Bennett Growth OS Logo" fill className="object-contain" priority style={{ filter: 'brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(185deg) brightness(1.1) drop-shadow(0 0 6px rgba(59,130,246,0.4))' }} />
                                </div>
                            </div>
                        </div>

                        <AuthForms defaultMode={defaultMode} onSuccess={onClose} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
