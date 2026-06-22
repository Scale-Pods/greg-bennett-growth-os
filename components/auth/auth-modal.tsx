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
            <DialogContent
                className="max-w-md p-0 overflow-hidden"
                style={{
                    background: 'rgba(28,28,30,0.90)',
                    backdropFilter: 'blur(60px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(60px) saturate(180%)',
                    border: 'none',
                    borderRadius: 28,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.24), 0 32px 64px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.08)',
                    outline: '1px solid rgba(255,255,255,0.08)',
                    outlineOffset: -1,
                }}
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>Authentication</DialogTitle>
                    <DialogDescription>
                        Authenticate to access your dashboard.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative p-8 pt-10">
                    {/* Ambient top glow */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -60,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 240,
                            height: 120,
                            background: 'rgba(10,132,255,0.20)',
                            filter: 'blur(60px)',
                            borderRadius: '50%',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Logo */}
                    <div className="flex justify-center mb-8 relative">
                        <div 
                            className="relative flex items-center justify-center rounded-xl bg-white/95 px-3 py-1 shadow-sm border border-white/20 transition-all duration-200 hover:bg-white"
                            style={{ height: '36px' }}
                        >
                            <div className="relative w-[110px] h-[24px]">
                                <Image
                                    src="/bennett-logo.png"
                                    alt="Bennett Growth OS Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </div>
                    </div>

                    <AuthForms defaultMode={defaultMode} onSuccess={onClose} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
