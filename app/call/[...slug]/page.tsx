"use client";

import { use, useMemo } from "react";
import { CallDetailsCard, useCallDetails } from "@/components/voice/call-details-modal";
import { BennettLoader } from "@/components/bennett-loader";

function NotFound() {
    return (
        <div className="min-h-screen ambient-bg text-[var(--label-primary)] relative flex items-center justify-center">
            <div className="liquid-card" style={{ padding: '32px 40px', textAlign: 'center', zIndex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--label-primary)', margin: 0 }}>Call not found</p>
                <p style={{ fontSize: 12, color: 'var(--label-tertiary)', marginTop: 6 }}>This link may be invalid.</p>
            </div>
        </div>
    );
}

function Loading() {
    return (
        <div className="min-h-screen ambient-bg text-[var(--label-primary)] relative flex items-center justify-center">
            <BennettLoader />
        </div>
    );
}

function CallShell({ details }: { details: ReturnType<typeof useCallDetails> }) {
    if (details.notFound) return <NotFound />;
    if (details.loading || !details.displayCall || !details.displayCall.id) return <Loading />;

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

/** Old links: /call/{masterLeadId} - resolved via the by-lead -> VAPI/call-log chain. */
function LegacyCallPage({ id }: { id: string }) {
    const call = useMemo(() => ({ masterLeadId: id }), [id]);
    const details = useCallDetails(call, true, `/api/calls/by-lead/${encodeURIComponent(id)}`);
    return <CallShell details={details} />;
}

/** New links: /call/{phone}/{outreachRowId} - resolved directly from the outreach
 *  table row, which never gets pruned (unlike VAPI call data/recordings). */
function OutreachCallPage({ phone, id }: { phone: string; id: string }) {
    const call = useMemo(() => ({ id }), [id]);
    const details = useCallDetails(call, true, `/api/calls/by-outreach/${encodeURIComponent(phone)}/${encodeURIComponent(id)}`);
    return <CallShell details={details} />;
}

export default function SharedCallPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = use(params);

    if (slug.length === 2) {
        return <OutreachCallPage phone={slug[0]} id={slug[1]} />;
    }
    if (slug.length === 1) {
        return <LegacyCallPage id={slug[0]} />;
    }
    return <NotFound />;
}
