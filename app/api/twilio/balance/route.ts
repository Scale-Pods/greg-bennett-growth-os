import { NextResponse } from 'next/server';

export async function GET() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        return NextResponse.json({ error: 'Twilio credentials missing' }, { status: 400 });
    }

    try {
        const [balRes, usageRes] = await Promise.all([
            fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`, {
                headers: { Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64') }
            }),
            fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Usage/Records/AllTime.json?Category=totalprice`, {
                headers: { Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64') }
            })
        ]);

        if (!balRes.ok) {
            const errorData = await balRes.text();
            console.error('Twilio Balance API Error:', errorData);
            return NextResponse.json({ error: 'Failed to fetch Twilio balance' }, { status: balRes.status });
        }

        const data = await balRes.json();

        let used = 0;
        let usageError = false;
        if (usageRes.ok) {
            const usageData = await usageRes.json();
            used = Math.abs(parseFloat(usageData.usage_records?.[0]?.price || '0'));
        } else {
            usageError = true;
            console.error('Twilio Usage API Error:', await usageRes.text());
        }

        const balance = parseFloat(data.balance);

        return NextResponse.json({
            balance,
            used,
            // Approximation: assumes nothing besides usage has affected the balance
            // (e.g. free trial credit, manual adjustments aren't accounted for).
            total_recharge: balance + used,
            currency: data.currency,
            account_sid: data.account_sid,
            ...(usageError ? { usageWarning: 'Usage total unavailable — showing balance only.' } : {}),
        });
    } catch (error) {
        console.error('Twilio Balance Fetch Exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
