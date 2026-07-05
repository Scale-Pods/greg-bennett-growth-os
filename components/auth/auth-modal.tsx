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

                <div className="relative glass-modal-shell">
                    {/* Top accent line */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--teal)]/50 to-transparent" />

                    {/* Ambient glow */}
                    <div
                        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full opacity-60"
                        style={{ background: 'var(--mesh-1)', filter: 'blur(48px)' }}
                        aria-hidden
                    />

                    <div className="relative p-8 pt-10">
                        <div className="flex justify-center mb-8">
                            <div className="relative flex items-center justify-center rounded-xl glass-surface px-3 py-1.5 h-9">
                                <div className="relative w-[110px] h-[24px]">
                                    <Image src="/bennett-logo.png" alt="Bennett Growth OS Logo" fill className="object-contain theme-logo" priority />
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
