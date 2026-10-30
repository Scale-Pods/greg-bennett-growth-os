-- ============================================================================
-- RPCs for the "platinum" Supabase project
-- Businesses covered: investor, coaching
-- Tables used:
--   investor: investor_funnel_ai_agent_outreach, investor_funnel_master_leads,
--             vapi_call_logs_investor, instantly_lead_replies,
--             instantly_campaign_analytics
--   coaching: coaching_ai_agent_outreach, coaching_master_leads,
--             vapi_call_logs_coaching, instantly_lead_replies_coaching,
--             instantly_campaign_analytics_coaching
-- All functions are READ-ONLY (SELECT-only bodies, SECURITY INVOKER, STABLE,
-- no writes). Paste this whole file into the platinum project's SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. safe_ts(text) -> timestamptz
--    Many outreach text columns (Email_1_Sent_At, Voice_1_Date, etc.) hold
--    garbage/partial values (e.g. a bare ".000" fragment) or prefixed text
--    (e.g. "Yes 2026-10-14T..."). A raw ::timestamptz cast throws and aborts
--    the whole RPC call on any one bad row. This extracts the first valid
--    ISO-8601-ish substring and casts only that, inside its own exception
--    handler, returning NULL for anything unparseable.
-- ----------------------------------------------------------------------------
create or replace function public.safe_ts(p_value text)
returns timestamptz
language plpgsql
immutable
security invoker
set search_path = public
as $$
declare
  v_match text;
begin
  if p_value is null or btrim(p_value) = '' then
    return null;
  end if;

  v_match := substring(p_value from '([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?([+-][0-9]{2}:[0-9]{2}|Z)?)');

  if v_match is null then
    return null;
  end if;

  return v_match::timestamptz;
exception
  when others then
    return null;
end;
$$;

grant execute on function public.safe_ts(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1. get_email_overview(from, to)
--    byAgent has both 'investor' and 'coaching'; totals/trend are the sum
--    across both businesses.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with events as (
    select 'investor'::text as agent,
      public.safe_ts("Email_1_Sent_At") as e1_ts,
      public.safe_ts("Email_2_Sent_At") as e2_ts,
      public.safe_ts("Email_Reply_Track") as reply_ts
    from investor_funnel_ai_agent_outreach
    union all
    select 'coaching'::text as agent,
      public.safe_ts("Email_1_Sent_At") as e1_ts,
      public.safe_ts("Email_2_Sent_At") as e2_ts,
      public.safe_ts("Email_Reply_Track") as reply_ts
    from coaching_ai_agent_outreach
  ),
  sent_events as (
    select agent, e1_ts as ts from events where e1_ts between p_from and p_to
    union all
    select agent, e2_ts as ts from events where e2_ts between p_from and p_to
  ),
  reply_events as (
    select agent, reply_ts as ts from events where reply_ts between p_from and p_to
  ),
  unsub as (
    select 'investor'::text as agent, count(*) as n
    from investor_funnel_ai_agent_outreach
    where email_unsubscribed is not null and email_unsubscribed <> ''
      and lower(email_unsubscribed) <> 'no' and lower(email_unsubscribed) <> 'null'
    union all
    select 'coaching'::text as agent, count(*) as n
    from coaching_ai_agent_outreach
    where email_unsubscribed is not null and email_unsubscribed <> ''
      and lower(email_unsubscribed) <> 'no' and lower(email_unsubscribed) <> 'null'
  ),
  by_agent as (
    select
      e.agent as key,
      (select count(*) from sent_events s where s.agent = e.agent) as emails_sent,
      (select count(*) from reply_events r where r.agent = e.agent) as replies,
      (select n from unsub u where u.agent = e.agent) as unsubscribed
    from (select distinct agent from events) e
  ),
  trend as (
    select to_char(ts, 'YYYY-MM-DD') as date, count(*) as emails_sent, 0 as replies
    from sent_events
    group by 1
    union all
    select to_char(ts, 'YYYY-MM-DD') as date, 0 as emails_sent, count(*) as replies
    from reply_events
    group by 1
  ),
  trend_merged as (
    select date, sum(emails_sent) as emails_sent, sum(replies) as replies
    from trend
    group by date
    order by date
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', p_from, 'to', p_to),
    'totals', jsonb_build_object(
      'emailsSent', (select coalesce(sum(emails_sent), 0) from by_agent),
      'replies', (select coalesce(sum(replies), 0) from by_agent),
      'replyRate', case when (select coalesce(sum(emails_sent), 0) from by_agent) > 0
                   then round(((select sum(replies) from by_agent)::numeric / (select sum(emails_sent) from by_agent)) * 100, 2)
                   else 0 end,
      'unsubscribed', (select coalesce(sum(unsubscribed), 0) from by_agent)
    ),
    'byAgent', jsonb_build_object(
      'investor', (select jsonb_build_object(
        'emailsSent', emails_sent, 'replies', replies,
        'replyRate', case when emails_sent > 0 then round((replies::numeric / emails_sent) * 100, 2) else 0 end,
        'unsubscribed', unsubscribed
      ) from by_agent where key = 'investor'),
      'coaching', (select jsonb_build_object(
        'emailsSent', emails_sent, 'replies', replies,
        'replyRate', case when emails_sent > 0 then round((replies::numeric / emails_sent) * 100, 2) else 0 end,
        'unsubscribed', unsubscribed
      ) from by_agent where key = 'coaching')
    ),
    'trend', coalesce((select jsonb_agg(jsonb_build_object('date', date, 'emailsSent', emails_sent, 'replies', replies) order by date) from trend_merged), '[]'::jsonb)
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. get_email_replies(from, to)
--    Union of both replies tables, each joined to its OWN outreach table.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_replies(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with combined as (
    select r.*, 'investor'::text as agent,
      l.id as lead_id, coalesce(l.full_name, l."First_Name") as lead_name,
      l."Personal_Email" as lead_email, l."Lead_Classification" as lead_classification
    from instantly_lead_replies r
    left join investor_funnel_ai_agent_outreach l
      on lower(trim(l."Personal_Email")) = lower(trim(r.lead_email_id))
    where r.reply_timestamp between p_from and p_to
    union all
    select r.*, 'coaching'::text as agent,
      l.id as lead_id, coalesce(l.full_name, l."First_Name") as lead_name,
      l."Personal_Email" as lead_email, l."Lead_Classification" as lead_classification
    from instantly_lead_replies_coaching r
    left join coaching_ai_agent_outreach l
      on lower(trim(l."Personal_Email")) = lower(trim(r.lead_email_id))
    where r.reply_timestamp between p_from and p_to
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'messageId', message_id, 'agent', agent, 'threadId', thread_id, 'campaignId', campaign_id,
    'senderEmailId', sender_email_id, 'leadEmailId', lead_email_id, 'replySubject', reply_subject,
    'emailBodySent', emailbody_sent, 'cleanReplyText', clean_reply_text, 'replyTimestamp', reply_timestamp,
    'aiInterestScore', ai_interest_score, 'sentiment', sentiment, 'sentimentReason', sentiment_reason,
    'createdAt', created_at,
    'lead', jsonb_build_object('id', lead_id, 'name', lead_name, 'email', lead_email, 'leadClassification', lead_classification)
  ) order by reply_timestamp desc), '[]'::jsonb)
  from combined;
$$;

-- ----------------------------------------------------------------------------
-- 3. get_email_reply_by_token(token)
--    Tries investor's replies table first, then coaching's.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_reply_by_token(p_token text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with investor_match as (
    (select * from instantly_lead_replies where message_id = p_token)
    union all
    (select * from instantly_lead_replies where message_id <> p_token and thread_id = p_token
     order by reply_timestamp desc
     limit 1)
  ),
  coaching_match as (
    (select * from instantly_lead_replies_coaching where message_id = p_token)
    union all
    (select * from instantly_lead_replies_coaching where message_id <> p_token and thread_id = p_token
     order by reply_timestamp desc
     limit 1)
  ),
  picked as (
    (select *, 'investor'::text as agent from investor_match limit 1)
    union all
    (select *, 'coaching'::text as agent from coaching_match
     where not exists (select 1 from investor_match)
     limit 1)
  )
  select case (select agent from picked)
    when 'investor' then
      jsonb_build_object(
        'messageId', (select message_id from picked),
        'agent', (select agent from picked),
        'threadId', (select thread_id from picked),
        'campaignId', (select campaign_id from picked),
        'senderEmailId', (select sender_email_id from picked),
        'leadEmailId', (select lead_email_id from picked),
        'replySubject', (select reply_subject from picked),
        'emailBodySent', (select emailbody_sent from picked),
        'cleanReplyText', (select clean_reply_text from picked),
        'replyTimestamp', (select reply_timestamp from picked),
        'aiInterestScore', (select ai_interest_score from picked),
        'sentiment', (select sentiment from picked),
        'sentimentReason', (select sentiment_reason from picked),
        'createdAt', (select created_at from picked),
        'lead', (
          select jsonb_build_object('id', l.id, 'name', coalesce(l.full_name, l."First_Name"), 'email', l."Personal_Email", 'leadClassification', l."Lead_Classification")
          from investor_funnel_ai_agent_outreach l
          where l."Personal_Email" ilike (select lead_email_id from picked)
          limit 1
        )
      )
    when 'coaching' then
      jsonb_build_object(
        'messageId', (select message_id from picked),
        'agent', (select agent from picked),
        'threadId', (select thread_id from picked),
        'campaignId', (select campaign_id from picked),
        'senderEmailId', (select sender_email_id from picked),
        'leadEmailId', (select lead_email_id from picked),
        'replySubject', (select reply_subject from picked),
        'emailBodySent', (select emailbody_sent from picked),
        'cleanReplyText', (select clean_reply_text from picked),
        'replyTimestamp', (select reply_timestamp from picked),
        'aiInterestScore', (select ai_interest_score from picked),
        'sentiment', (select sentiment from picked),
        'sentimentReason', (select sentiment_reason from picked),
        'createdAt', (select created_at from picked),
        'lead', (
          select jsonb_build_object('id', l.id, 'name', coalesce(l.full_name, l."First_Name"), 'email', l."Personal_Email", 'leadClassification', l."Lead_Classification")
          from coaching_ai_agent_outreach l
          where l."Personal_Email" ilike (select lead_email_id from picked)
          limit 1
        )
      )
    else null
  end;
$$;

-- ----------------------------------------------------------------------------
-- 4. get_email_sent(from, to)
--    Returns { investor: {...}, coaching: {...} }, same per-step logic as
--    01_realty.sql's single-agent version.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_sent(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with investor_steps as (
    select id, full_name, "First_Name", "Personal_Email", "Lead_Classification",
      1 as step, "Email_1" as body, "Email_1_Status" as status, public.safe_ts("Email_1_Sent_At") as sent_at
    from investor_funnel_ai_agent_outreach
    where public.safe_ts("Email_1_Sent_At") between p_from and p_to
    union all
    select id, full_name, "First_Name", "Personal_Email", "Lead_Classification",
      2 as step, "Email_2" as body, "Email_2_Status" as status, public.safe_ts("Email_2_Sent_At") as sent_at
    from investor_funnel_ai_agent_outreach
    where public.safe_ts("Email_2_Sent_At") between p_from and p_to
  ),
  coaching_steps as (
    select id, full_name, "First_Name", "Personal_Email", "Lead_Classification",
      1 as step, "Email_1" as body, "Email_1_Status" as status, public.safe_ts("Email_1_Sent_At") as sent_at
    from coaching_ai_agent_outreach
    where public.safe_ts("Email_1_Sent_At") between p_from and p_to
    union all
    select id, full_name, "First_Name", "Personal_Email", "Lead_Classification",
      2 as step, "Email_2" as body, "Email_2_Status" as status, public.safe_ts("Email_2_Sent_At") as sent_at
    from coaching_ai_agent_outreach
    where public.safe_ts("Email_2_Sent_At") between p_from and p_to
  )
  select jsonb_build_object(
    'investor', jsonb_build_object(
      'agent', 'investor',
      'sentEmails', coalesce((select jsonb_agg(jsonb_build_object(
        'lead', jsonb_build_object('id', id, 'agent', 'investor', 'name', coalesce(full_name, "First_Name"), 'email', "Personal_Email", 'leadClassification', "Lead_Classification"),
        'step', step, 'body', body, 'status', status, 'sentAt', sent_at
      ) order by sent_at desc) from investor_steps), '[]'::jsonb)
    ),
    'coaching', jsonb_build_object(
      'agent', 'coaching',
      'sentEmails', coalesce((select jsonb_agg(jsonb_build_object(
        'lead', jsonb_build_object('id', id, 'agent', 'coaching', 'name', coalesce(full_name, "First_Name"), 'email', "Personal_Email", 'leadClassification', "Lead_Classification"),
        'step', step, 'body', body, 'status', status, 'sentAt', sent_at
      ) order by sent_at desc) from coaching_steps), '[]'::jsonb)
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 5. get_email_unsubscribed()
--    Union across both outreach tables, all-time, each tagged with its agent.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_unsubscribed()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with combined as (
    select id, 'investor'::text as agent, coalesce(full_name, "First_Name") as name, "Personal_Email" as email,
      "Lead_Classification" as lead_classification, "Lead_Classification_Reason" as lead_classification_reason, created_at
    from investor_funnel_ai_agent_outreach
    where email_unsubscribed is not null and email_unsubscribed <> ''
      and lower(email_unsubscribed) <> 'no' and lower(email_unsubscribed) <> 'null'
    union all
    select id, 'coaching'::text as agent, coalesce(full_name, "First_Name") as name, "Personal_Email" as email,
      "Lead_Classification" as lead_classification, "Lead_Classification_Reason" as lead_classification_reason, created_at
    from coaching_ai_agent_outreach
    where email_unsubscribed is not null and email_unsubscribed <> ''
      and lower(email_unsubscribed) <> 'no' and lower(email_unsubscribed) <> 'null'
  )
  select jsonb_build_object(
    'leads', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'agent', agent, 'name', name, 'email', email,
      'leadClassification', lead_classification, 'leadClassificationReason', lead_classification_reason,
      'emailUnsubscribed', true, 'createdAt', created_at
    ) order by created_at desc), '[]'::jsonb)
  )
  from combined;
$$;

-- ----------------------------------------------------------------------------
-- 6. get_email_bounced()
--    Same pattern as get_email_unsubscribed, filtered on email_bounced.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_bounced()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with combined as (
    select id, 'investor'::text as agent, coalesce(full_name, "First_Name") as name, "Personal_Email" as email,
      "Lead_Classification" as lead_classification, "Lead_Classification_Reason" as lead_classification_reason, created_at
    from investor_funnel_ai_agent_outreach
    where email_bounced is not null and email_bounced <> ''
      and lower(email_bounced) <> 'no' and lower(email_bounced) <> 'null'
    union all
    select id, 'coaching'::text as agent, coalesce(full_name, "First_Name") as name, "Personal_Email" as email,
      "Lead_Classification" as lead_classification, "Lead_Classification_Reason" as lead_classification_reason, created_at
    from coaching_ai_agent_outreach
    where email_bounced is not null and email_bounced <> ''
      and lower(email_bounced) <> 'no' and lower(email_bounced) <> 'null'
  )
  select jsonb_build_object(
    'leads', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'agent', agent, 'name', name, 'email', email,
      'leadClassification', lead_classification, 'leadClassificationReason', lead_classification_reason,
      'emailBounced', true, 'createdAt', created_at
    ) order by created_at desc), '[]'::jsonb)
  )
  from combined;
$$;

-- ----------------------------------------------------------------------------
-- 7. get_campaign_analytics()
--    byAgent with 'investor' and 'coaching' keys from their own analytics
--    tables; grandTotals summed across both.
-- ----------------------------------------------------------------------------
create or replace function public.get_campaign_analytics()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with investor_norm as (
    select campaign_id, campaign_name, campaign_status,
      (lower(coalesce(campaign_is_evergreen, '')) = 'true') as is_evergreen,
      coalesce(leads_count, '0')::numeric as leads_count, coalesce(contacted_count, '0')::numeric as contacted_count,
      coalesce(emails_sent_count, '0')::numeric as emails_sent_count, coalesce(new_leads_contacted_count, '0')::numeric as new_leads_contacted_count,
      coalesce(open_count, '0')::numeric as open_count, coalesce(open_count_unique, '0')::numeric as open_count_unique,
      coalesce(reply_count, '0')::numeric as reply_count, coalesce(reply_count_unique, '0')::numeric as reply_count_unique,
      coalesce(reply_count_automatic, '0')::numeric as reply_count_automatic, coalesce(reply_count_automatic_unique, '0')::numeric as reply_count_automatic_unique,
      coalesce(link_click_count, '0')::numeric as link_click_count, coalesce(link_click_count_unique, '0')::numeric as link_click_count_unique,
      coalesce(bounced_count, '0')::numeric as bounced_count, coalesce(unsubscribed_count, '0')::numeric as unsubscribed_count,
      coalesce(completed_count, '0')::numeric as completed_count, coalesce(total_opportunities, '0')::numeric as total_opportunities,
      coalesce(total_opportunity_value, '0')::numeric as total_opportunity_value, updated_at, report_date
    from instantly_campaign_analytics
  ),
  coaching_norm as (
    select campaign_id, campaign_name, campaign_status,
      (lower(coalesce(campaign_is_evergreen, '')) = 'true') as is_evergreen,
      coalesce(leads_count, '0')::numeric as leads_count, coalesce(contacted_count, '0')::numeric as contacted_count,
      coalesce(emails_sent_count, '0')::numeric as emails_sent_count, coalesce(new_leads_contacted_count, '0')::numeric as new_leads_contacted_count,
      coalesce(open_count, '0')::numeric as open_count, coalesce(open_count_unique, '0')::numeric as open_count_unique,
      coalesce(reply_count, '0')::numeric as reply_count, coalesce(reply_count_unique, '0')::numeric as reply_count_unique,
      coalesce(reply_count_automatic, '0')::numeric as reply_count_automatic, coalesce(reply_count_automatic_unique, '0')::numeric as reply_count_automatic_unique,
      coalesce(link_click_count, '0')::numeric as link_click_count, coalesce(link_click_count_unique, '0')::numeric as link_click_count_unique,
      coalesce(bounced_count, '0')::numeric as bounced_count, coalesce(unsubscribed_count, '0')::numeric as unsubscribed_count,
      coalesce(completed_count, '0')::numeric as completed_count, coalesce(total_opportunities, '0')::numeric as total_opportunities,
      coalesce(total_opportunity_value, '0')::numeric as total_opportunity_value, updated_at, report_date
    from instantly_campaign_analytics_coaching
  ),
  all_norm as (
    select * from investor_norm union all select * from coaching_norm
  ),
  totals as (
    select
      sum(leads_count) as leads_count, sum(contacted_count) as contacted_count, sum(emails_sent_count) as emails_sent_count,
      sum(new_leads_contacted_count) as new_leads_contacted_count, sum(open_count) as open_count, sum(open_count_unique) as open_count_unique,
      sum(reply_count) as reply_count, sum(reply_count_unique) as reply_count_unique,
      sum(reply_count_automatic) as reply_count_automatic, sum(reply_count_automatic_unique) as reply_count_automatic_unique,
      sum(link_click_count) as link_click_count, sum(link_click_count_unique) as link_click_count_unique,
      sum(bounced_count) as bounced_count, sum(unsubscribed_count) as unsubscribed_count, sum(completed_count) as completed_count,
      sum(total_opportunities) as total_opportunities, sum(total_opportunity_value) as total_opportunity_value
    from all_norm
  )
  select jsonb_build_object(
    'byAgent', jsonb_build_object(
      'investor', jsonb_build_object(
        'campaigns', coalesce((select jsonb_agg(jsonb_build_object(
          'campaignId', campaign_id, 'agent', 'investor', 'campaignName', campaign_name, 'campaignStatus', campaign_status, 'isEvergreen', is_evergreen,
          'leadsCount', leads_count, 'contactedCount', contacted_count, 'emailsSentCount', emails_sent_count,
          'newLeadsContactedCount', new_leads_contacted_count, 'openCount', open_count, 'openCountUnique', open_count_unique,
          'replyCount', reply_count, 'replyCountUnique', reply_count_unique, 'replyCountAutomatic', reply_count_automatic,
          'replyCountAutomaticUnique', reply_count_automatic_unique, 'linkClickCount', link_click_count, 'linkClickCountUnique', link_click_count_unique,
          'bouncedCount', bounced_count, 'unsubscribedCount', unsubscribed_count, 'completedCount', completed_count,
          'totalOpportunities', total_opportunities, 'totalOpportunityValue', total_opportunity_value, 'updatedAt', updated_at, 'reportDate', report_date
        )) from investor_norm), '[]'::jsonb),
        'totals', (select jsonb_build_object(
          'leadsCount', sum(leads_count), 'contactedCount', sum(contacted_count), 'emailsSentCount', sum(emails_sent_count),
          'newLeadsContactedCount', sum(new_leads_contacted_count), 'openCount', sum(open_count), 'openCountUnique', sum(open_count_unique),
          'replyCount', sum(reply_count), 'replyCountUnique', sum(reply_count_unique), 'replyCountAutomatic', sum(reply_count_automatic),
          'replyCountAutomaticUnique', sum(reply_count_automatic_unique), 'linkClickCount', sum(link_click_count), 'linkClickCountUnique', sum(link_click_count_unique),
          'bouncedCount', sum(bounced_count), 'unsubscribedCount', sum(unsubscribed_count), 'completedCount', sum(completed_count),
          'totalOpportunities', sum(total_opportunities), 'totalOpportunityValue', sum(total_opportunity_value)
        ) from investor_norm)
      ),
      'coaching', jsonb_build_object(
        'campaigns', coalesce((select jsonb_agg(jsonb_build_object(
          'campaignId', campaign_id, 'agent', 'coaching', 'campaignName', campaign_name, 'campaignStatus', campaign_status, 'isEvergreen', is_evergreen,
          'leadsCount', leads_count, 'contactedCount', contacted_count, 'emailsSentCount', emails_sent_count,
          'newLeadsContactedCount', new_leads_contacted_count, 'openCount', open_count, 'openCountUnique', open_count_unique,
          'replyCount', reply_count, 'replyCountUnique', reply_count_unique, 'replyCountAutomatic', reply_count_automatic,
          'replyCountAutomaticUnique', reply_count_automatic_unique, 'linkClickCount', link_click_count, 'linkClickCountUnique', link_click_count_unique,
          'bouncedCount', bounced_count, 'unsubscribedCount', unsubscribed_count, 'completedCount', completed_count,
          'totalOpportunities', total_opportunities, 'totalOpportunityValue', total_opportunity_value, 'updatedAt', updated_at, 'reportDate', report_date
        )) from coaching_norm), '[]'::jsonb),
        'totals', (select jsonb_build_object(
          'leadsCount', sum(leads_count), 'contactedCount', sum(contacted_count), 'emailsSentCount', sum(emails_sent_count),
          'newLeadsContactedCount', sum(new_leads_contacted_count), 'openCount', sum(open_count), 'openCountUnique', sum(open_count_unique),
          'replyCount', sum(reply_count), 'replyCountUnique', sum(reply_count_unique), 'replyCountAutomatic', sum(reply_count_automatic),
          'replyCountAutomaticUnique', sum(reply_count_automatic_unique), 'linkClickCount', sum(link_click_count), 'linkClickCountUnique', sum(link_click_count_unique),
          'bouncedCount', sum(bounced_count), 'unsubscribedCount', sum(unsubscribed_count), 'completedCount', sum(completed_count),
          'totalOpportunities', sum(total_opportunities), 'totalOpportunityValue', sum(total_opportunity_value)
        ) from coaching_norm)
      )
    ),
    'grandTotals', (select jsonb_build_object(
      'leadsCount', leads_count, 'contactedCount', contacted_count, 'emailsSentCount', emails_sent_count,
      'newLeadsContactedCount', new_leads_contacted_count, 'openCount', open_count, 'openCountUnique', open_count_unique,
      'replyCount', reply_count, 'replyCountUnique', reply_count_unique, 'replyCountAutomatic', reply_count_automatic,
      'replyCountAutomaticUnique', reply_count_automatic_unique, 'linkClickCount', link_click_count, 'linkClickCountUnique', link_click_count_unique,
      'bouncedCount', bounced_count, 'unsubscribedCount', unsubscribed_count, 'completedCount', completed_count,
      'totalOpportunities', total_opportunities, 'totalOpportunityValue', total_opportunity_value
    ) from totals)
  );
$$;

-- ----------------------------------------------------------------------------
-- 8. get_voice_metrics(from, to)
--    Combines both call-log tables; byAgent/rateByAgent each have 2 entries.
--    Sentiment resolution joins each business's calls only to its own
--    outreach table.
-- ----------------------------------------------------------------------------
create or replace function public.get_voice_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with investor_calls as (
    select c.id, c.started_at, c.duration_seconds, c.cost_usd, c.status, c.lead_id, 'investor'::text as agent,
      (c.duration_seconds > 18) as picked_up,
      (c.status in ('customer-ended-call', 'assistant-ended-call')) as is_completed
    from vapi_call_logs_investor c
    where c.started_at between p_from and p_to
  ),
  coaching_calls as (
    select c.id, c.started_at, c.duration_seconds, c.cost_usd, c.status, c.lead_id, 'coaching'::text as agent,
      (c.duration_seconds > 18) as picked_up,
      (c.status in ('customer-ended-call', 'assistant-ended-call')) as is_completed
    from vapi_call_logs_coaching c
    where c.started_at between p_from and p_to
  ),
  investor_outreach as (
    select id, public.safe_ts("Voice_1_Date") as v1_date, voice1_sentiment, public.safe_ts("Voice_2_Date") as v2_date, voice2_sentiment
    from investor_funnel_ai_agent_outreach
  ),
  coaching_outreach as (
    select id, public.safe_ts("Voice_1_Date") as v1_date, voice1_sentiment, public.safe_ts("Voice_2_Date") as v2_date, voice2_sentiment
    from coaching_ai_agent_outreach
  ),
  investor_sentiment as (
    select c.*,
      case
        when o.id is null then null
        when o.v1_date is not null and o.v2_date is not null then
          case when abs(extract(epoch from (c.started_at - o.v1_date))) <= abs(extract(epoch from (c.started_at - o.v2_date)))
               then o.voice1_sentiment else o.voice2_sentiment end
        when o.v1_date is not null then o.voice1_sentiment
        when o.v2_date is not null then o.voice2_sentiment
        else null
      end as resolved_sentiment
    from investor_calls c
    left join investor_outreach o on o.id::text = c.lead_id
  ),
  coaching_sentiment as (
    select c.*,
      case
        when o.id is null then null
        when o.v1_date is not null and o.v2_date is not null then
          case when abs(extract(epoch from (c.started_at - o.v1_date))) <= abs(extract(epoch from (c.started_at - o.v2_date)))
               then o.voice1_sentiment else o.voice2_sentiment end
        when o.v1_date is not null then o.voice1_sentiment
        when o.v2_date is not null then o.voice2_sentiment
        else null
      end as resolved_sentiment
    from coaching_calls c
    left join coaching_outreach o on o.id::text = c.lead_id
  ),
  all_calls as (
    select * from investor_sentiment union all select * from coaching_sentiment
  ),
  agg_total as (
    select
      count(*) as total_calls, coalesce(sum(duration_seconds), 0) as total_duration, coalesce(sum(cost_usd), 0) as total_cost
    from all_calls
  ),
  agg_by_agent as (
    select agent,
      count(*) as calls, coalesce(sum(duration_seconds), 0) as duration, coalesce(sum(cost_usd), 0) as cost,
      count(*) filter (where picked_up) as picked_up,
      count(*) filter (where is_completed) as completed,
      count(*) filter (where resolved_sentiment is not null) as positive_eligible,
      count(*) filter (where lower(trim(resolved_sentiment)) = 'positive') as positive
    from all_calls
    group by agent
  ),
  daily as (
    select to_char(started_at, 'YYYY-MM-DD') as date, count(*) as calls, coalesce(sum(cost_usd), 0) as cost
    from all_calls group by 1 order by 1
  ),
  hourly as (
    select h as hour, coalesce((select count(*) from all_calls where extract(hour from started_at at time zone 'UTC') = h), 0) as calls
    from generate_series(0, 23) h
  ),
  duration_buckets as (
    select
      case
        when duration_seconds < 30 then '0-30s'
        when duration_seconds < 60 then '30-60s'
        when duration_seconds < 180 then '1-3m'
        when duration_seconds < 300 then '3-5m'
        else '5m+'
      end as label,
      count(*) as calls
    from all_calls
    group by 1
  )
  select jsonb_build_object(
    'totalCalls', (select total_calls from agg_total),
    'totalDuration', (select total_duration from agg_total),
    'avgDuration', case when (select total_calls from agg_total) > 0 then round((select total_duration from agg_total)::numeric / (select total_calls from agg_total), 2) else 0 end,
    'totalCost', (select total_cost from agg_total),
    'avgCost', case when (select total_calls from agg_total) > 0 then round((select total_cost from agg_total)::numeric / (select total_calls from agg_total), 4) else 0 end,
    'byAgent', coalesce((select jsonb_agg(jsonb_build_object('key', agent, 'calls', calls, 'duration', duration, 'cost', cost)) from agg_by_agent), '[]'::jsonb),
    'dailyVolume', coalesce((select jsonb_agg(jsonb_build_object('date', date, 'calls', calls, 'cost', cost) order by date) from daily), '[]'::jsonb),
    'hourlyDistribution', coalesce((select jsonb_agg(jsonb_build_object('hour', hour, 'calls', calls) order by hour) from hourly), '[]'::jsonb),
    'durationBuckets', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'calls', calls)) from duration_buckets), '[]'::jsonb),
    'rateByAgent', coalesce((select jsonb_agg(jsonb_build_object(
      'key', agent, 'calls', calls, 'pickedUp', picked_up,
      'pickupRate', case when calls > 0 then round(picked_up::numeric / calls * 100, 2) else 0 end,
      'completed', completed,
      'completionRate', case when calls > 0 then round(completed::numeric / calls * 100, 2) else 0 end,
      'positive', positive, 'positiveEligible', positive_eligible,
      'positiveRate', case when positive_eligible > 0 then round(positive::numeric / positive_eligible * 100, 2) else 0 end
    )) from agg_by_agent), '[]'::jsonb)
  );
$$;

-- ----------------------------------------------------------------------------
-- 9. get_calls(from, to)
--    Union of calls from both call-log tables, each matched to its own
--    business's outreach table by phone.
-- ----------------------------------------------------------------------------
create or replace function public.get_calls(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with investor_calls as (
    select *, 'investor'::text as agent from vapi_call_logs_investor where started_at between p_from and p_to
  ),
  coaching_calls as (
    select *, 'coaching'::text as agent from vapi_call_logs_coaching where started_at between p_from and p_to
  ),
  investor_outreach as (
    select id, created_at, master_lead_id, voice1_sentiment, call1_note, voice2_sentiment, call2_note,
      regexp_replace(coalesce(personal_phone, ''), '\D', '', 'g') as phone_digits
    from investor_funnel_ai_agent_outreach where personal_phone is not null
  ),
  coaching_outreach as (
    select id, created_at, master_lead_id, voice1_sentiment, call1_note, voice2_sentiment, call2_note,
      regexp_replace(coalesce(personal_phone, ''), '\D', '', 'g') as phone_digits
    from coaching_ai_agent_outreach where personal_phone is not null
  ),
  all_calls as (
    select *, regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') as phone_digits from investor_calls
    union all
    select *, regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') as phone_digits from coaching_calls
  ),
  ranked as (
    select
      c.id as call_id,
      o.master_lead_id, o.voice1_sentiment, o.call1_note, o.voice2_sentiment, o.call2_note,
      row_number() over (
        partition by c.id
        order by (o.voice1_sentiment is not null or o.voice2_sentiment is not null) desc, o.created_at desc
      ) as rn
    from all_calls c
    join investor_outreach o on c.agent = 'investor' and o.phone_digits = c.phone_digits and c.phone_digits <> ''
    union all
    select
      c.id as call_id,
      o.master_lead_id, o.voice1_sentiment, o.call1_note, o.voice2_sentiment, o.call2_note,
      row_number() over (
        partition by c.id
        order by (o.voice1_sentiment is not null or o.voice2_sentiment is not null) desc, o.created_at desc
      ) as rn
    from all_calls c
    join coaching_outreach o on c.agent = 'coaching' and o.phone_digits = c.phone_digits and c.phone_digits <> ''
  ),
  best_match as (
    select call_id, master_lead_id, voice1_sentiment, call1_note, voice2_sentiment, call2_note
    from ranked
    where rn = 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'agent', c.agent, 'isInbound', false, 'startedAt', c.started_at, 'durationSeconds', c.duration_seconds,
    'cost', c.cost_usd, 'totalCost', c.cost_usd, 'phone', c.customer_phone, 'name', c.customer_name, 'status', c.status,
    'voiceCallStatus', c.voice_call_status, 'source', c.source, 'summary', c.summary, 'recordingUrl', c.recording_url,
    'note', c.note, 'leadId', c.lead_id,
    'masterLeadId', m.master_lead_id, 'voice1Sentiment', m.voice1_sentiment,
    'call1Note', m.call1_note, 'voice2Sentiment', m.voice2_sentiment, 'call2Note', m.call2_note
  ) order by c.started_at desc), '[]'::jsonb)
  from all_calls c
  left join best_match m on m.call_id = c.id;
$$;

-- ----------------------------------------------------------------------------
-- 10. get_call_by_id(call_id)
--     Tries vapi_call_logs_investor first, then vapi_call_logs_coaching.
-- ----------------------------------------------------------------------------
create or replace function public.get_call_by_id(p_id text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
      'id', id, 'agent', 'investor', 'startedAt', started_at, 'durationSeconds', duration_seconds,
      'cost', cost_usd, 'phone', customer_phone, 'name', customer_name, 'status', status,
      'voiceCallStatus', voice_call_status, 'source', source, 'transcript', transcript,
      'callSummary', summary, 'recordingUrl', recording_url, 'note', note, 'leadId', lead_id
    ) from vapi_call_logs_investor where id = p_id),
    (select jsonb_build_object(
      'id', id, 'agent', 'coaching', 'startedAt', started_at, 'durationSeconds', duration_seconds,
      'cost', cost_usd, 'phone', customer_phone, 'name', customer_name, 'status', status,
      'voiceCallStatus', voice_call_status, 'source', source, 'transcript', transcript,
      'callSummary', summary, 'recordingUrl', recording_url, 'note', note, 'leadId', lead_id
    ) from vapi_call_logs_coaching where id = p_id)
  );
$$;

-- ----------------------------------------------------------------------------
-- 11. get_call_by_master_lead(master_lead_id, agent)
--     agent disambiguates investor vs coaching (required: 'investor' or
--     'coaching'), since master_lead_id alone doesn't.
-- ----------------------------------------------------------------------------
create or replace function public.get_call_by_master_lead(p_master_lead_id uuid, p_agent text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with investor_ids as (
    select id from investor_funnel_ai_agent_outreach where master_lead_id = p_master_lead_id and p_agent = 'investor'
  ),
  coaching_ids as (
    select id from coaching_ai_agent_outreach where master_lead_id = p_master_lead_id and p_agent = 'coaching'
  )
  select coalesce(
    (select jsonb_build_object(
      'id', c.id, 'agent', 'investor', 'startedAt', c.started_at, 'durationSeconds', c.duration_seconds,
      'cost', c.cost_usd, 'phone', c.customer_phone, 'name', c.customer_name, 'status', c.status,
      'voiceCallStatus', c.voice_call_status, 'source', c.source, 'transcript', c.transcript,
      'callSummary', c.summary, 'recordingUrl', c.recording_url, 'note', c.note, 'leadId', c.lead_id
    )
    from vapi_call_logs_investor c
    where p_agent = 'investor' and c.lead_id in (select id::text from investor_ids)
    order by c.started_at desc limit 1),
    (select jsonb_build_object(
      'id', c.id, 'agent', 'coaching', 'startedAt', c.started_at, 'durationSeconds', c.duration_seconds,
      'cost', c.cost_usd, 'phone', c.customer_phone, 'name', c.customer_name, 'status', c.status,
      'voiceCallStatus', c.voice_call_status, 'source', c.source, 'transcript', c.transcript,
      'callSummary', c.summary, 'recordingUrl', c.recording_url, 'note', c.note, 'leadId', c.lead_id
    )
    from vapi_call_logs_coaching c
    where p_agent = 'coaching' and c.lead_id in (select id::text from coaching_ids)
    order by c.started_at desc limit 1)
  );
$$;

-- ----------------------------------------------------------------------------
-- 12. get_agent_metrics(from, to)
--     Keyed object with both 'investor' and 'coaching'.
-- ----------------------------------------------------------------------------
create or replace function public.get_agent_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with investor_extracted as (
    select
      public.safe_ts("Email_1_Sent_At") as e1,
      public.safe_ts("Email_2_Sent_At") as e2,
      public.safe_ts("Voice_1_Date") as v1,
      public.safe_ts("Voice_2_Date") as v2,
      public.safe_ts("Call_Reply_Track") as cr
    from investor_funnel_ai_agent_outreach
  ),
  coaching_extracted as (
    select
      public.safe_ts("Email_1_Sent_At") as e1,
      public.safe_ts("Email_2_Sent_At") as e2,
      public.safe_ts("Voice_1_Date") as v1,
      public.safe_ts("Voice_2_Date") as v2,
      public.safe_ts("Call_Reply_Track") as cr
    from coaching_ai_agent_outreach
  ),
  investor_counted as (
    select
      count(*) filter (where e1 between p_from and p_to) + count(*) filter (where e2 between p_from and p_to) as emails_sent,
      count(*) filter (where v1 between p_from and p_to) + count(*) filter (where v2 between p_from and p_to) as voice_calls,
      count(*) filter (where cr between p_from and p_to) as call_replies
    from investor_extracted
  ),
  coaching_counted as (
    select
      count(*) filter (where e1 between p_from and p_to) + count(*) filter (where e2 between p_from and p_to) as emails_sent,
      count(*) filter (where v1 between p_from and p_to) + count(*) filter (where v2 between p_from and p_to) as voice_calls,
      count(*) filter (where cr between p_from and p_to) as call_replies
    from coaching_extracted
  )
  select jsonb_build_object(
    'investor', jsonb_build_object(
      'key', 'investor',
      'totalLeads', (select count(*) from investor_funnel_master_leads),
      'emailsSent', (select emails_sent from investor_counted),
      'voiceCalls', (select voice_calls from investor_counted),
      'emailReplies', (select count(*) from instantly_lead_replies where reply_timestamp between p_from and p_to),
      'callReplies', (select call_replies from investor_counted)
    ),
    'coaching', jsonb_build_object(
      'key', 'coaching',
      'totalLeads', (select count(*) from coaching_master_leads),
      'emailsSent', (select emails_sent from coaching_counted),
      'voiceCalls', (select voice_calls from coaching_counted),
      'emailReplies', (select count(*) from instantly_lead_replies_coaching where reply_timestamp between p_from and p_to),
      'callReplies', (select call_replies from coaching_counted)
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 13. get_master_metrics(from, to)
--     Combined (not per-agent) across both master tables, matching the
--     original route's combined-only shape.
-- ----------------------------------------------------------------------------
create or replace function public.get_master_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with combined as (
    select created_at from investor_funnel_master_leads
    union all
    select created_at from coaching_master_leads
  ),
  daily as (
    select to_char(created_at, 'YYYY-MM-DD') as date, count(*) as leads
    from combined
    where created_at between p_from and p_to
    group by 1
    order by 1
  )
  select jsonb_build_object(
    'totalLeads', (select count(*) from combined),
    'leadsDaily', coalesce((select jsonb_agg(jsonb_build_object('date', date, 'leads', leads) order by date) from daily), '[]'::jsonb)
  );
$$;

-- ----------------------------------------------------------------------------
-- 14. get_master_leads(from, to)
--     Union of master leads from both tables, each tagged with its agent.
-- ----------------------------------------------------------------------------
create or replace function public.get_master_leads(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with combined as (
    select id, 'investor'::text as agent, coalesce(full_name, first_name) as name, personal_phone, personal_email,
      lead_classification, lead_classification_reason, synced_to_outreach, created_at
    from investor_funnel_master_leads
    union all
    select id, 'coaching'::text as agent, coalesce(full_name, first_name) as name, personal_phone, personal_email,
      lead_classification, lead_classification_reason, synced_to_outreach, created_at
    from coaching_master_leads
  )
  select jsonb_build_object(
    'leads', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'agent', agent, 'name', name, 'phone', personal_phone, 'email', personal_email,
      'leadClassification', lead_classification, 'leadClassificationReason', lead_classification_reason,
      'syncedToOutreach', synced_to_outreach, 'createdAt', created_at
    ) order by created_at desc), '[]'::jsonb)
  )
  from combined
  where created_at between p_from and p_to;
$$;

-- ----------------------------------------------------------------------------
-- 15. get_leads(from, to, agent)
--     agent is required ('investor' or 'coaching'), mirrors /api/leads.
-- ----------------------------------------------------------------------------
create or replace function public.get_leads(p_from timestamptz, p_to timestamptz, p_agent text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when p_agent = 'investor' then jsonb_build_object(
      'agent', 'investor',
      'leads', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'agent', 'investor', 'name', coalesce(full_name, "First_Name"),
        'phone', personal_phone, 'email', "Personal_Email",
        'leadClassification', "Lead_Classification", 'leadClassificationReason', "Lead_Classification_Reason",
        'sequenceStatus', sequence_status, 'outreachStep', outreach_step,
        'email1', jsonb_build_object('body', "Email_1", 'status', "Email_1_Status", 'sentAt', "Email_1_Sent_At"),
        'email2', jsonb_build_object('body', "Email_2", 'status', "Email_2_Status", 'sentAt', "Email_2_Sent_At"),
        'voice1', jsonb_build_object('date', "Voice_1_Date", 'status', "Voice_1_Status", 'sentiment', voice1_sentiment, 'note', call1_note),
        'voice2', jsonb_build_object('date', "Voice_2_Date", 'status', "Voice_2_Status", 'sentiment', voice2_sentiment, 'note', call2_note),
        'emailReplyTrack', "Email_Reply_Track", 'callReplyTrack', "Call_Reply_Track",
        'emailUnsubscribed', email_unsubscribed, 'emailBounced', email_bounced, 'createdAt', created_at
      ) order by created_at desc)
      from investor_funnel_ai_agent_outreach where created_at between p_from and p_to), '[]'::jsonb)
    )
    when p_agent = 'coaching' then jsonb_build_object(
      'agent', 'coaching',
      'leads', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'agent', 'coaching', 'name', coalesce(full_name, "First_Name"),
        'phone', personal_phone, 'email', "Personal_Email",
        'leadClassification', "Lead_Classification", 'leadClassificationReason', "Lead_Classification_Reason",
        'sequenceStatus', sequence_status, 'outreachStep', outreach_step,
        'email1', jsonb_build_object('body', "Email_1", 'status', "Email_1_Status", 'sentAt', "Email_1_Sent_At"),
        'email2', jsonb_build_object('body', "Email_2", 'status', "Email_2_Status", 'sentAt', "Email_2_Sent_At"),
        'voice1', jsonb_build_object('date', "Voice_1_Date", 'status', "Voice_1_Status", 'sentiment', voice1_sentiment, 'note', call1_note),
        'voice2', jsonb_build_object('date', "Voice_2_Date", 'status', "Voice_2_Status", 'sentiment', voice2_sentiment, 'note', call2_note),
        'emailReplyTrack', "Email_Reply_Track", 'callReplyTrack', "Call_Reply_Track",
        'emailUnsubscribed', email_unsubscribed, 'emailBounced', email_bounced, 'createdAt', created_at
      ) order by created_at desc)
      from coaching_ai_agent_outreach where created_at between p_from and p_to), '[]'::jsonb)
    )
    else null
  end;
$$;

-- ----------------------------------------------------------------------------
-- 16. get_vapi_cost()
--     Sum across BOTH call-log tables into one grand total.
-- ----------------------------------------------------------------------------
create or replace function public.get_vapi_cost()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object('totalUsed',
    coalesce((select sum(cost_usd) from vapi_call_logs_investor), 0) +
    coalesce((select sum(cost_usd) from vapi_call_logs_coaching), 0)
  );
$$;

-- ----------------------------------------------------------------------------
-- 19. get_outreach_match_by_phone(agent, phone)
--     Targeted single-phone outreach lookup for /api/calls/[id], avoiding a
--     full get_calls() (all-time) pull just to resolve one call. p_agent
--     selects investor vs coaching's outreach table.
-- ----------------------------------------------------------------------------
create or replace function public.get_outreach_match_by_phone(p_agent text, p_phone text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select case p_agent
    when 'investor' then (
      select jsonb_build_object(
        'masterLeadId', o.master_lead_id, 'voice1Sentiment', o.voice1_sentiment, 'call1Note', o.call1_note,
        'voice2Sentiment', o.voice2_sentiment, 'call2Note', o.call2_note
      )
      from investor_funnel_ai_agent_outreach o
      where personal_phone is not null
        and regexp_replace(personal_phone, '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
        and regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') <> ''
      order by (o.voice1_sentiment is not null or o.voice2_sentiment is not null) desc, o.created_at desc
      limit 1
    )
    when 'coaching' then (
      select jsonb_build_object(
        'masterLeadId', o.master_lead_id, 'voice1Sentiment', o.voice1_sentiment, 'call1Note', o.call1_note,
        'voice2Sentiment', o.voice2_sentiment, 'call2Note', o.call2_note
      )
      from coaching_ai_agent_outreach o
      where personal_phone is not null
        and regexp_replace(personal_phone, '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
        and regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') <> ''
      order by (o.voice1_sentiment is not null or o.voice2_sentiment is not null) desc, o.created_at desc
      limit 1
    )
    else null
  end;
$$;

-- ----------------------------------------------------------------------------
-- Grants: expose to the roles your app actually authenticates as.
-- ----------------------------------------------------------------------------
grant execute on function
  public.get_email_overview(timestamptz, timestamptz),
  public.get_email_replies(timestamptz, timestamptz),
  public.get_email_reply_by_token(text),
  public.get_email_sent(timestamptz, timestamptz),
  public.get_email_unsubscribed(),
  public.get_email_bounced(),
  public.get_campaign_analytics(),
  public.get_voice_metrics(timestamptz, timestamptz),
  public.get_calls(timestamptz, timestamptz),
  public.get_call_by_id(text),
  public.get_call_by_master_lead(uuid, text),
  public.get_agent_metrics(timestamptz, timestamptz),
  public.get_master_metrics(timestamptz, timestamptz),
  public.get_master_leads(timestamptz, timestamptz),
  public.get_leads(timestamptz, timestamptz, text),
  public.get_vapi_cost(),
  public.get_outreach_match_by_phone(text, text)
to anon, authenticated;
