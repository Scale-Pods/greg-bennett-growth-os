export interface VoiceSlot {
    slot: number;
    sentiment: string | null;
    note: string | null;
    date: string | null;
}

/** Scans an outreach row's voice{N}_sentiment / call{N}_note / Voice_{N}_Date
 *  columns (N = 1..10) and returns only the populated slots, in order. */
export function buildVoiceSlots(row: Record<string, any> | null | undefined): VoiceSlot[] {
    if (!row) return [];
    const slots: VoiceSlot[] = [];
    for (let n = 1; n <= 10; n++) {
        const sentiment = row[`voice${n}_sentiment`] ?? null;
        const note = row[`call${n}_note`] ?? null;
        if (!sentiment && !note) continue;
        slots.push({
            slot: n,
            sentiment,
            note,
            date: row[`Voice_${n}_Date`] ?? null,
        });
    }
    return slots;
}
