"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { normalizeLeads, NormalizedLead } from "@/lib/leads-utils";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { useRouter } from 'next/navigation';
import { logout } from '@/app/actions/auth';

export interface MasterMetrics {
    totalLeads: number;
    leadsDaily: { date: string; leads: number }[];
}

export interface VoiceMetrics {
    totalCalls: number;
    totalDuration: number;
    avgDuration: number;
    totalCost: number;
    avgCost: number;
    byAgent: { key: string; calls: number; duration: number; cost: number }[];
    dailyVolume: { date: string; calls: number; cost: number }[];
    hourlyDistribution: { hour: number; calls: number }[];
    durationBuckets: { label: string; calls: number }[];
    rateByAgent: {
        key: string;
        calls: number;
        pickedUp: number;
        pickupRate: number;
        completed: number;
        completionRate: number;
        positive: number;
        positiveEligible: number;
        positiveRate: number;
    }[];
}

interface DataContextType {
    leads: NormalizedLead[];
    calls: any[];
    allTimeVoiceCount: number;
    loadingLeads: boolean;
    loadingCalls: boolean;
    loadingBalances: boolean;
    loadingVoiceMetrics: boolean;
    loadingMasterMetrics: boolean;
    voiceMetrics: VoiceMetrics | null;
    masterMetrics: MasterMetrics | null;
    voiceBalance: any;
    twilioBalance: any;
    error: string | null;
    dateRange: { from: Date; to: Date };
    setDateRange: React.Dispatch<React.SetStateAction<any>>;
    refreshLeads: (params?: { agent?: string; from?: Date; to?: Date; force?: boolean }) => Promise<void>;
    refreshCalls: (params?: { agent?: string; from?: Date; to?: Date; provider?: string; force?: boolean }) => Promise<void>;
    refreshBalances: () => Promise<void>;
    refreshVoiceMetrics: (params?: { from?: Date; to?: Date; force?: boolean }) => Promise<void>;
    refreshMasterMetrics: (params?: { from?: Date; to?: Date; force?: boolean }) => Promise<void>;
    refreshAll: (params?: { from?: Date; to?: Date }) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 7),
        to: new Date()
    });
    const [leads, setLeads] = useState<NormalizedLead[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [allTimeVoiceCount, setAllTimeVoiceCount] = useState(0);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [loadingCalls, setLoadingCalls] = useState(true);
    const [loadingBalances, setLoadingBalances] = useState(true);
    const [loadingVoiceMetrics, setLoadingVoiceMetrics] = useState(true);
    const [loadingMasterMetrics, setLoadingMasterMetrics] = useState(true);
    const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics | null>(null);
    const [masterMetrics, setMasterMetrics] = useState<MasterMetrics | null>(null);
    const [voiceBalance, setVoiceBalance] = useState<any>(null);
    const [twilioBalance, setTwilioBalance] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Gatekeepers to prevent redundant identical calls
    const lastCallParams = useRef<string | null>(null);
    const lastVoiceMetricsParams = useRef<string | null>(null);

    const fetchLeads = useCallback(async (params?: { agent?: string; from?: Date; to?: Date; force?: boolean }) => {
        setLoadingLeads(true);
        try {
            const now = new Date();
            const fromDate = params?.from ? startOfDay(params.from) : subDays(startOfDay(now), 7);
            const toDate = params?.to ? endOfDay(params.to) : endOfDay(now);

            const query = new URLSearchParams({
                agent: params?.agent || 'recruiting',
                from: fromDate.toISOString(),
                to: toDate.toISOString()
            });

            const response = await fetch(`/api/leads?${query.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch leads');
            const data = await response.json();
            setLeads(Array.isArray(data.leads) ? data.leads : []);
        } catch (err: any) {
            console.error('DataProvider leads fetch error:', err);
            setError(err.message);
        } finally {
            setLoadingLeads(false);
        }
    }, []);

    const fetchCalls = useCallback(async (params?: { agent?: string; from?: Date; to?: Date; provider?: string; force?: boolean }) => {
        try {
            // Normalize defaults to Last 7 Days (Start of Day) to ensure stable query strings across components
            // Using full-day boundaries (12am - 12pm) ensures identical cache keys for the entire day.
            const now = new Date();
            const fromDate = params?.from ? startOfDay(params.from) : subDays(startOfDay(now), 7);
            const toDate = params?.to ? endOfDay(params.to) : endOfDay(now);
            const agent = params?.agent || 'recruiting';

            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
                console.error("Invalid dates passed to fetchCalls");
                return;
            }

            const query = new URLSearchParams({
                agent,
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
            });

            const currentQuery = query.toString();

            // Skip if requested params are identical to the last SUCCESSFUL or ONGOING load
            // But ALLOW if forced refresh or if calls array is currently empty
            if (!params?.force && lastCallParams.current === currentQuery && (calls.length > 0 || loadingCalls)) {
                return;
            }

            setLoadingCalls(true);
            lastCallParams.current = currentQuery;

            const response = await fetch(`/api/calls?${currentQuery}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) setCalls(data);
            } else {
                // If failed, clear last params to allow retry
                lastCallParams.current = null;
            }
        } catch (err: any) {
            console.error('DataProvider calls fetch error:', err);
            lastCallParams.current = null;
        } finally {
            setLoadingCalls(false);
        }
    }, []);

    const hasVoiceMetrics = useRef(false);

    const fetchVoiceMetrics = useCallback(async (params?: { from?: Date; to?: Date; force?: boolean }) => {
        try {
            const now = new Date();
            const fromDate = params?.from ? startOfDay(params.from) : subDays(startOfDay(now), 7);
            const toDate = params?.to ? endOfDay(params.to) : endOfDay(now);

            const query = new URLSearchParams({
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
            });

            const currentQuery = query.toString();
            if (!params?.force && lastVoiceMetricsParams.current === currentQuery && hasVoiceMetrics.current) {
                return;
            }

            setLoadingVoiceMetrics(true);
            lastVoiceMetricsParams.current = currentQuery;

            const response = await fetch(`/api/metrics/voice?${currentQuery}`);
            if (response.ok) {
                const data: VoiceMetrics = await response.json();
                setVoiceMetrics(data);
                hasVoiceMetrics.current = true;
                setAllTimeVoiceCount(data.totalCalls);
            } else {
                lastVoiceMetricsParams.current = null;
            }
        } catch (err: any) {
            console.error('DataProvider voice metrics fetch error:', err);
            lastVoiceMetricsParams.current = null;
        } finally {
            setLoadingVoiceMetrics(false);
        }
    }, []);

    const lastMasterMetricsParams = useRef<string | null>(null);
    const hasMasterMetrics = useRef(false);

    const fetchMasterMetrics = useCallback(async (params?: { from?: Date; to?: Date; force?: boolean }) => {
        try {
            const now = new Date();
            const fromDate = params?.from ? startOfDay(params.from) : subDays(startOfDay(now), 7);
            const toDate = params?.to ? endOfDay(params.to) : endOfDay(now);

            const query = new URLSearchParams({
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
            });

            const currentQuery = query.toString();
            if (!params?.force && lastMasterMetricsParams.current === currentQuery && hasMasterMetrics.current) {
                return;
            }

            setLoadingMasterMetrics(true);
            lastMasterMetricsParams.current = currentQuery;

            const response = await fetch(`/api/metrics/master?${currentQuery}`);
            if (response.ok) {
                const data: MasterMetrics = await response.json();
                setMasterMetrics(data);
                hasMasterMetrics.current = true;
            } else {
                lastMasterMetricsParams.current = null;
            }
        } catch (err: any) {
            console.error('DataProvider master metrics fetch error:', err);
            lastMasterMetricsParams.current = null;
        } finally {
            setLoadingMasterMetrics(false);
        }
    }, []);

    const fetchBalances = useCallback(async () => {
        try {
            const [vapiRes, twilioRes] = await Promise.all([
                fetch('/api/vapi/balance'),
                fetch('/api/twilio/balance')
            ]);
            if (vapiRes.ok) setVoiceBalance(await vapiRes.json());
            if (twilioRes.ok) setTwilioBalance(await twilioRes.json());
        } catch (err) { }
        finally { setLoadingBalances(false); }
    }, []);

    const refreshAll = useCallback(async (params?: { from?: Date; to?: Date }) => {
        await Promise.all([
            fetchLeads(params),
            fetchCalls(params),
            fetchBalances(),
            fetchVoiceMetrics(params),
            fetchMasterMetrics(params),
        ]);
    }, [fetchLeads, fetchCalls, fetchBalances, fetchVoiceMetrics, fetchMasterMetrics]);

    const router = useRouter();

    // Track whether we've already done the one-time 90-day fallback
    const didAutoExpand = useRef(false);

    // After the initial 7-day fetch completes, if we got no leads,
    // re-fetch with a 90-day window so pages always have data to show.
    useEffect(() => {
        if (loadingLeads || loadingMasterMetrics) return;
        if (didAutoExpand.current) return;
        didAutoExpand.current = true;

        if (leads.length === 0) {
            const from = subDays(startOfDay(new Date()), 90);
            const to = endOfDay(new Date());
            fetchLeads({ from, to });
        }
    }, [loadingLeads, loadingMasterMetrics, leads, fetchLeads]);

    useEffect(() => {
        if (dateRange?.from) {
            refreshAll({ from: dateRange.from, to: dateRange.to || dateRange.from });
        }
    }, [dateRange, refreshAll]);

    useEffect(() => {
        // Session Monitor: Checks every 1 minute if the session is still valid
        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/session');
                if (!res.ok) {
                    // Session expired or invalid
                    await logout();
                    router.push('/');
                    router.refresh();
                }
            } catch (err) {
                console.error("Session check failed", err);
            }
        };

        const interval = setInterval(checkSession, 60000); // Check every 60 seconds
        return () => clearInterval(interval);
    }, [router]);

    return (
        <DataContext.Provider value={{
            leads,
            calls,
            allTimeVoiceCount,
            loadingLeads,
            loadingCalls,
            loadingBalances,
            loadingVoiceMetrics,
            loadingMasterMetrics,
            voiceMetrics,
            masterMetrics,
            voiceBalance,
            twilioBalance,
            error,
            dateRange,
            setDateRange,
            refreshLeads: fetchLeads,
            refreshCalls: fetchCalls,
            refreshBalances: fetchBalances,
            refreshVoiceMetrics: fetchVoiceMetrics,
            refreshMasterMetrics: fetchMasterMetrics,
            refreshAll,
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
