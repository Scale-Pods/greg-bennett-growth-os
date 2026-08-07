interface TwilioCallRecord {
    to: string;
    from: string;
    startTime: number; // epoch ms
    price: number; // absolute USD cost (Twilio returns it negative)
}

/** Fetches Twilio Call records in the given range, paginating through all pages. */
async function fetchTwilioCalls(from: Date, to: Date): Promise<TwilioCallRecord[]> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) return [];

    const auth = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const records: TwilioCallRecord[] = [];

    let url =
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json` +
        `?StartTime%3E=${encodeURIComponent(from.toISOString())}` +
        `&StartTime%3C=${encodeURIComponent(to.toISOString())}` +
        `&PageSize=200`;

    // Cap pagination to avoid unbounded fetches on huge ranges.
    for (let page = 0; page < 25 && url; page++) {
        const res = await fetch(url, { headers: { Authorization: auth } });
        if (!res.ok) break;
        const data = await res.json();

        for (const call of data.calls || []) {
            const price = call.price !== null && call.price !== undefined ? Math.abs(parseFloat(call.price)) : 0;
            const startTime = call.start_time ? new Date(call.start_time).getTime() : NaN;
            if (!call.to || isNaN(startTime)) continue;
            records.push({ to: normalizePhone(call.to), from: normalizePhone(call.from || ''), startTime, price });
        }

        const nextPage = data.next_page_uri;
        url = nextPage ? `https://api.twilio.com${nextPage}` : '';
    }

    return records;
}

function normalizePhone(raw: string): string {
    return String(raw || '').replace(/\D/g, '');
}

const MATCH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Builds a lookup that, given a phone number + call start time, returns the closest
 *  matching Twilio call's real price within a 5-minute window. */
export function buildTwilioCostLookup(records: TwilioCallRecord[]) {
    const byPhone = new Map<string, TwilioCallRecord[]>();
    for (const r of records) {
        const list = byPhone.get(r.to) || [];
        list.push(r);
        byPhone.set(r.to, list);
    }

    return function lookup(phone: string, startedAt: string | null): number | null {
        if (!phone || !startedAt) return null;
        const cleaned = normalizePhone(phone);
        const candidates = byPhone.get(cleaned);
        if (!candidates || candidates.length === 0) return null;

        const callTime = new Date(startedAt).getTime();
        if (isNaN(callTime)) return null;

        let best: TwilioCallRecord | null = null;
        let bestDiff = Infinity;
        for (const c of candidates) {
            const diff = Math.abs(c.startTime - callTime);
            if (diff < bestDiff) {
                bestDiff = diff;
                best = c;
            }
        }

        if (!best || bestDiff > MATCH_WINDOW_MS) return null;
        return best.price;
    };
}

export async function getTwilioCostLookup(from: Date, to: Date) {
    const records = await fetchTwilioCalls(from, to);
    return buildTwilioCostLookup(records);
}
