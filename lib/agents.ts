export interface AgentConfig {
    key: 'recruiting' | 'coaching' | 'investor' | 'biglife' | 'bootcampsNew' | 'bootcampsFollowup';
    label: string;
    color: string;
    envPrefix: 'Realty' | 'platinum' | 'wealth' | 'bootcamps';
    outreachTable: string;
    repliesTable: string;
    analyticsTable: string;
}

export const AGENTS: AgentConfig[] = [
    { key: 'recruiting', label: 'Recruiting', color: '#3b5bdb', envPrefix: 'Realty', outreachTable: 'recruiting_ai_agent_outreach', repliesTable: 'instantly_lead_replies', analyticsTable: 'instantly_campaign_analytics' },
    { key: 'investor', label: 'Investor', color: '#f59e0b', envPrefix: 'platinum', outreachTable: 'investor_funnel_ai_agent_outreach', repliesTable: 'instantly_lead_replies', analyticsTable: 'instantly_campaign_analytics' },
    { key: 'coaching', label: 'Coaching', color: '#22c55e', envPrefix: 'platinum', outreachTable: 'coaching_ai_agent_outreach', repliesTable: 'instantly_lead_replies_coaching', analyticsTable: 'instantly_campaign_analytics_coaching' },
    { key: 'biglife', label: 'BigLife', color: '#0f9d58', envPrefix: 'wealth', outreachTable: 'biglife_new_leads_outreach', repliesTable: 'instantly_lead_replies', analyticsTable: 'instantly_campaign_analytics' },
    { key: 'bootcampsNew', label: 'Bootcamps New Leads', color: '#e67e22', envPrefix: 'bootcamps', outreachTable: 'bootcamps_new_leads_outreach', repliesTable: 'instantly_lead_replies', analyticsTable: 'instantly_campaign_analytics' },
    { key: 'bootcampsFollowup', label: 'Bootcamps Follow-up', color: '#d6336c', envPrefix: 'bootcamps', outreachTable: 'bootcamps_follow_up_outreach', repliesTable: 'instantly_lead_replies_followup', analyticsTable: 'instantly_campaign_analytics_followup' },
];

export type AgentKey = AgentConfig['key'];

export function getAgent(key: string): AgentConfig | undefined {
    return AGENTS.find(a => a.key === key);
}

export const AGENT_OPTIONS = AGENTS.map(({ key, label }) => ({ key, label }));
