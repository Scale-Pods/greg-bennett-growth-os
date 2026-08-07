import { getAgent } from "@/lib/agents";

export function AgentBadge({ agent }: { agent: string }) {
    const cfg = getAgent(agent);
    if (!cfg) return <span style={{ fontSize: 11, color: 'var(--label-tertiary)' }}>—</span>;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 'var(--radius-xs)',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            background: `${cfg.color}1A`, color: cfg.color,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            {cfg.label}
        </span>
    );
}
