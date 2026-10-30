export interface AgentConfig {
    key: 'recruiting' | 'coaching' | 'investor' | 'biglife' | 'bigLifeNewCampaign' | 'homeSeller' | 'bootcampsFollowup' | 'bootcampsNewLeads';
    label: string;
    color: string;
    envPrefix: 'Realty' | 'platinum' | 'wealth' | 'bootcamps';
    outreachTable: string;
    repliesTable: string | null;
    analyticsTable: string | null;
    /** Whether this business is a single-agent project (Realty, biglife-style
     *  wealth default) vs one of several sharing a project, in which case its
     *  RPCs need a p_agent param (get_leads, get_call_by_master_lead). */
    rpcAgentKey: string;
}

export const AGENTS: AgentConfig[] = [
    { key: 'recruiting', label: 'Recruiting', color: '#3b5bdb', envPrefix: 'Realty', outreachTable: 'recruiting_ai_agent_outreach', repliesTable: 'instantly_lead_replies', analyticsTable: 'instantly_campaign_analytics', rpcAgentKey: 'recruiting' },
    { key: 'investor', label: 'Investor', color: '#f59e0b', envPrefix: 'platinum', outreachTable: 'investor_funnel_ai_agent_outreach', repliesTable: 'instantly_lead_replies', analyticsTable: 'instantly_campaign_analytics', rpcAgentKey: 'investor' },
    { key: 'coaching', label: 'Coaching', color: '#22c55e', envPrefix: 'platinum', outreachTable: 'coaching_ai_agent_outreach', repliesTable: 'instantly_lead_replies_coaching', analyticsTable: 'instantly_campaign_analytics_coaching', rpcAgentKey: 'coaching' },
    { key: 'biglife', label: 'BigLife', color: '#0f9d58', envPrefix: 'wealth', outreachTable: 'biglife_new_leads_outreach', repliesTable: 'instantly_lead_replies', analyticsTable: 'instantly_campaign_analytics', rpcAgentKey: 'biglife' },
    { key: 'bigLifeNewCampaign', label: 'Big Life New Campaign', color: '#0b7d47', envPrefix: 'wealth', outreachTable: 'big_life_new_campaign_outreach', repliesTable: null, analyticsTable: null, rpcAgentKey: 'bigLifeNewCampaign' },
    { key: 'homeSeller', label: 'Home Seller Leads', color: '#7048e8', envPrefix: 'wealth', outreachTable: 'home_seller_leads_outreach', repliesTable: null, analyticsTable: null, rpcAgentKey: 'homeSeller' },
    { key: 'bootcampsFollowup', label: 'Bootcamps Follow-up', color: '#d6336c', envPrefix: 'bootcamps', outreachTable: 'bootcamps_follow_up_outreach', repliesTable: 'instantly_lead_replies_followup', analyticsTable: 'instantly_campaign_analytics_followup', rpcAgentKey: 'bootcampsFollowup' },
    { key: 'bootcampsNewLeads', label: 'Bootcamps New Leads', color: '#f76707', envPrefix: 'bootcamps', outreachTable: 'bootcamps_new_leads_outreach', repliesTable: null, analyticsTable: null, rpcAgentKey: 'bootcampsNewLeads' },
];

export type AgentKey = AgentConfig['key'];

export function getAgent(key: string): AgentConfig | undefined {
    return AGENTS.find(a => a.key === key);
}

export const AGENT_OPTIONS = AGENTS.map(({ key, label }) => ({ key, label }));
