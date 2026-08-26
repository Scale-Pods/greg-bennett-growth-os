"use client";

import { use, useMemo } from "react";
import { CallDetailsCard, useCallDetails } from "@/components/voice/call-details-modal";
import { BennettLoader } from "@/components/bennett-loader";

export default function SharedCallPage({ params }: { params: Promise<{ id: string; phone: string }> }) {
    const { id } = use(params);
    const call = useMemo(() => ({ id }), [id]);
    const details = useCallDetails(call, true);

    if (details.notFound) {
        return (
            <div className="min-h-screen ambient-bg text-[var(--label-primary)] relative flex items-center justify-center">
                <div className="liquid-card" style={{ padding: '32px 40px', textAlign: 'center', zIndex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--label-primary)', margin: 0 }}>Call not found</p>
                    <p style={{ fontSize: 12, color: 'var(--label-tertiary)', marginTop: 6 }}>This link may be invalid or the recording is no longer available.</p>
                </div>
            </div>
        );
    }

    if (details.loading || !details.displayCall || !details.displayCall.id) {
        return (
            <div className="min-h-screen ambient-bg text-[var(--label-primary)] relative flex items-center justify-center">
                <BennettLoader />
            </div>
        );
    }

    return (
        <div className="min-h-screen ambient-bg text-[var(--label-primary)] relative flex items-center justify-center" style={{ padding: 20 }}>
            <div
                className="glass-modal-shell !p-5"
                style={{
                    display: 'flex', flexDirection: 'column',
                    maxHeight: '90vh', height: '90vh',
                    width: '95vw', maxWidth: 950,
                    overflow: 'hidden',
                    gap: 0,
                    zIndex: 1,
                }}
            >
                <CallDetailsCard {...details} />
            </div>
        </div>
    );
}
