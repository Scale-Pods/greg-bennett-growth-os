-- ============================================================================
-- RPCs for the "Realty" Supabase project
-- Business covered: recruiting
-- Tables used: recruiting_ai_agent_outreach, master_leads, vapi_call_logs_brs,
--              instantly_lead_replies, instantly_campaign_analytics
-- All functions are READ-ONLY (SELECT-only bodies, SECURITY INVOKER, STABLE,
-- no writes). Paste this whole file into the Realty project's SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. safe_ts(text) -> timestamptz
--    Many outreach text columns (Email_1_Sent_At, Voice_1_Date, etc.) hold
--    garbage/partial values (e.g. a bare ".000" fragment) or prefixed text
--    (e.g. "Yes 2026-10-14T..."). A raw ::timestamptz cast throws and aborts
--    the whole RPC call on any one bad row. This extracts the first valid
--    ISO-8601-ish substring and casts only that, inside its own exception
--    handler, returning NULL for anything unparseable (mirrors the old app's
--    extractDate()/try-catch-safe Date parsing in lib/leads-utils.ts).
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
--    Mirrors /api/email/overview: emails sent / replies / reply rate / trend,
--    scoped by Email_1_Sent_At / Email_2_Sent_At / Email_Reply_Track event
--    timestamps falling in [p_from, p_to]. Unsubscribed is all-time.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with events as (
    select
      'recruiting'::text as agent,
      e1_ts, e2_ts, reply_ts
    from (
      select
        public.safe_ts("Email_1_Sent_At") as e1_ts,
        public.safe_ts("Email_2_Sent_At") as e2_ts,
        public.safe_ts("Email_Reply_Track") as reply_ts
      from recruiting_ai_agent_outreach
    ) x
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
    select count(*) as n
    from recruiting_ai_agent_outreach
    where email_unsubscribed is not null
      and email_unsubscribed <> ''
      and lower(email_unsubscribed) <> 'no'
      and lower(email_unsubscribed) <> 'null'
  ),
  by_agent as (
    select
      'recruiting' as key,
      (select count(*) from sent_events) as emails_sent,
      (select count(*) from reply_events) as replies,
      (select n from unsub) as unsubscribed
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
      'emailsSent', (select emails_sent from by_agent),
      'replies', (select replies from by_agent),
      'replyRate', case when (select emails_sent from by_agent) > 0
                   then round(((select replies from by_agent)::numeric / (select emails_sent from by_agent)) * 100, 2)
                   else 0 end,
      'unsubscribed', (select unsubscribed from by_agent)
    ),
    'byAgent', jsonb_build_object(
      'recruiting', jsonb_build_object(
        'emailsSent', (select emails_sent from by_agent),
        'replies', (select replies from by_agent),
        'replyRate', case when (select emails_sent from by_agent) > 0
                     then round(((select replies from by_agent)::numeric / (select emails_sent from by_agent)) * 100, 2)
                     else 0 end,
        'unsubscribed', (select unsubscribed from by_agent)
      )
    ),
    'trend', coalesce((select jsonb_agg(jsonb_build_object('date', date, 'emailsSent', emails_sent, 'replies', replies) order by date) from trend_merged), '[]'::jsonb)
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. get_email_replies(from, to)
--    Mirrors /api/email/replies for the recruiting agent. Joins each reply to
--    its lead by lead_email_id (case-insensitive) for display purposes.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_replies(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'messageId', r.message_id,
    'agent', 'recruiting',
    'threadId', r.thread_id,
    'campaignId', r.campaign_id,
    'senderEmailId', r.sender_email_id,
    'leadEmailId', r.lead_email_id,
    'replySubject', r.reply_subject,
    'emailBodySent', r.emailbody_sent,
    'cleanReplyText', r.clean_reply_text,
    'replyTimestamp', r.reply_timestamp,
    'aiInterestScore', r.ai_interest_score,
    'sentiment', r.sentiment,
    'sentimentReason', r.sentiment_reason,
    'createdAt', r.created_at,
    'lead', jsonb_build_object(
      'id', l.id,
      'name', coalesce(l.full_name, l."First_Name"),
      'email', l."Personal_Email",
      'leadClassification', l."Lead_Classification"
    )
  ) order by r.reply_timestamp desc), '[]'::jsonb)
  from instantly_lead_replies r
  left join recruiting_ai_agent_outreach l
    on lower(trim(l."Personal_Email")) = lower(trim(r.lead_email_id))
  where r.reply_timestamp between p_from and p_to;
$$;

-- ----------------------------------------------------------------------------
-- 3. get_email_reply_by_token(token)
--    Mirrors /api/email/replies/by-id/[token]: exact message_id match first,
--    else latest row sharing that thread_id.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_reply_by_token(p_token text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with matched as (
    select * from instantly_lead_replies where message_id = p_token
    union all
    select * from instantly_lead_replies
    where message_id <> p_token and thread_id = p_token
    order by reply_timestamp desc
    limit 1
  ),
  picked as (
    select * from matched limit 1
  )
  select case when exists (select 1 from picked) then
    jsonb_build_object(
      'messageId', (select message_id from picked),
      'agent', 'recruiting',
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
        from recruiting_ai_agent_outreach l
        where l."Personal_Email" ilike (select lead_email_id from picked)
        limit 1
      )
    )
  else null end;
$$;

-- ----------------------------------------------------------------------------
-- 4. get_email_sent(from, to)
--    Mirrors /api/email/sent for recruiting: one row per Email_1/Email_2 step
--    whose own sentAt falls in range.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_sent(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with steps as (
    select
      id, full_name, "First_Name", "Personal_Email", "Lead_Classification",
      1 as step, "Email_1" as body, "Email_1_Status" as status, public.safe_ts("Email_1_Sent_At") as sent_at
    from recruiting_ai_agent_outreach
    where public.safe_ts("Email_1_Sent_At") between p_from and p_to
    union all
    select
      id, full_name, "First_Name", "Personal_Email", "Lead_Classification",
      2 as step, "Email_2" as body, "Email_2_Status" as status, public.safe_ts("Email_2_Sent_At") as sent_at
    from recruiting_ai_agent_outreach
    where public.safe_ts("Email_2_Sent_At") between p_from and p_to
  )
  select jsonb_build_object(
    'agent', 'recruiting',
    'sentEmails', coalesce(jsonb_agg(jsonb_build_object(
      'lead', jsonb_build_object('id', id, 'agent', 'recruiting', 'name', coalesce(full_name, "First_Name"), 'email', "Personal_Email", 'leadClassification', "Lead_Classification"),
      'step', step,
      'body', body,
      'status', status,
      'sentAt', sent_at
    ) order by sent_at desc), '[]'::jsonb)
  )
  from steps;
$$;

-- ----------------------------------------------------------------------------
-- 5. get_email_unsubscribed()
--    All-time, no date filter (mirrors current route behavior).
-- ----------------------------------------------------------------------------
create or replace function public.get_email_unsubscribed()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'leads', coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'agent', 'recruiting',
      'name', coalesce(full_name, "First_Name"),
      'email', "Personal_Email",
      'leadClassification', "Lead_Classification",
      'leadClassificationReason', "Lead_Classification_Reason",
      'emailUnsubscribed', true,
      'createdAt', created_at
    ) order by created_at desc), '[]'::jsonb)
  )
  from recruiting_ai_agent_outreach
  where email_unsubscribed is not null
    and email_unsubscribed <> ''
    and lower(email_unsubscribed) <> 'no'
    and lower(email_unsubscribed) <> 'null';
$$;

-- ----------------------------------------------------------------------------
-- 6. get_email_bounced()
--    All-time, no date filter (mirrors current route behavior).
-- ----------------------------------------------------------------------------
create or replace function public.get_email_bounced()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'leads', coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'agent', 'recruiting',
      'name', coalesce(full_name, "First_Name"),
      'email', "Personal_Email",
      'leadClassification', "Lead_Classification",
      'leadClassificationReason', "Lead_Classification_Reason",
      'emailBounced', true,
      'createdAt', created_at
    ) order by created_at desc), '[]'::jsonb)
  )
  from recruiting_ai_agent_outreach
  where email_bounced is not null
    and email_bounced <> ''
    and lower(email_bounced) <> 'no'
    and lower(email_bounced) <> 'null';
$$;

-- ----------------------------------------------------------------------------
-- 7. get_campaign_analytics()
--    Mirrors /api/email/analytics/campaigns: all campaigns + summed totals,
--    all-time, text columns cast to numeric.
-- ----------------------------------------------------------------------------
create or replace function public.get_campaign_analytics()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with norm as (
    select
      campaign_id, campaign_name, campaign_status,
      (lower(coalesce(campaign_is_evergreen, '')) = 'true') as is_evergreen,
      coalesce(leads_count, '0')::numeric as leads_count,
      coalesce(contacted_count, '0')::numeric as contacted_count,
      coalesce(emails_sent_count, '0')::numeric as emails_sent_count,
      coalesce(new_leads_contacted_count, '0')::numeric as new_leads_contacted_count,
      coalesce(open_count, '0')::numeric as open_count,
      coalesce(open_count_unique, '0')::numeric as open_count_unique,
      coalesce(reply_count, '0')::numeric as reply_count,
      coalesce(reply_count_unique, '0')::numeric as reply_count_unique,
      coalesce(reply_count_automatic, '0')::numeric as reply_count_automatic,
      coalesce(reply_count_automatic_unique, '0')::numeric as reply_count_automatic_unique,
      coalesce(link_click_count, '0')::numeric as link_click_count,
      coalesce(link_click_count_unique, '0')::numeric as link_click_count_unique,
      coalesce(bounced_count, '0')::numeric as bounced_count,
      coalesce(unsubscribed_count, '0')::numeric as unsubscribed_count,
      coalesce(completed_count, '0')::numeric as completed_count,
      coalesce(total_opportunities, '0')::numeric as total_opportunities,
      coalesce(total_opportunity_value, '0')::numeric as total_opportunity_value,
      updated_at, report_date
    from instantly_campaign_analytics
  ),
  campaigns_json as (
    select jsonb_agg(jsonb_build_object(
      'campaignId', campaign_id, 'agent', 'recruiting', 'campaignName', campaign_name,
      'campaignStatus', campaign_status, 'isEvergreen', is_evergreen,
      'leadsCount', leads_count, 'contactedCount', contacted_count, 'emailsSentCount', emails_sent_count,
      'newLeadsContactedCount', new_leads_contacted_count, 'openCount', open_count, 'openCountUnique', open_count_unique,
      'replyCount', reply_count, 'replyCountUnique', reply_count_unique,
      'replyCountAutomatic', reply_count_automatic, 'replyCountAutomaticUnique', reply_count_automatic_unique,
      'linkClickCount', link_click_count, 'linkClickCountUnique', link_click_count_unique,
      'bouncedCount', bounced_count, 'unsubscribedCount', unsubscribed_count, 'completedCount', completed_count,
      'totalOpportunities', total_opportunities, 'totalOpportunityValue', total_opportunity_value,
      'updatedAt', updated_at, 'reportDate', report_date
    )) as campaigns
    from norm
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
    from norm
  )
  select jsonb_build_object(
    'byAgent', jsonb_build_object(
      'recruiting', jsonb_build_object(
        'campaigns', coalesce((select campaigns from campaigns_json), '[]'::jsonb),
        'totals', (select jsonb_build_object(
          'leadsCount', leads_count, 'contactedCount', contacted_count, 'emailsSentCount', emails_sent_count,
          'newLeadsContactedCount', new_leads_contacted_count, 'openCount', open_count, 'openCountUnique', open_count_unique,
          'replyCount', reply_count, 'replyCountUnique', reply_count_unique,
          'replyCountAutomatic', reply_count_automatic, 'replyCountAutomaticUnique', reply_count_automatic_unique,
          'linkClickCount', link_click_count, 'linkClickCountUnique', link_click_count_unique,
          'bouncedCount', bounced_count, 'unsubscribedCount', unsubscribed_count, 'completedCount', completed_count,
          'totalOpportunities', total_opportunities, 'totalOpportunityValue', total_opportunity_value
        ) from totals)
      )
    ),
    'grandTotals', (select jsonb_build_object(
      'leadsCount', leads_count, 'contactedCount', contacted_count, 'emailsSentCount', emails_sent_count,
      'newLeadsContactedCount', new_leads_contacted_count, 'openCount', open_count, 'openCountUnique', open_count_unique,
      'replyCount', reply_count, 'replyCountUnique', reply_count_unique,
      'replyCountAutomatic', reply_count_automatic, 'replyCountAutomaticUnique', reply_count_automatic_unique,
      'linkClickCount', link_click_count, 'linkClickCountUnique', link_click_count_unique,
      'bouncedCount', bounced_count, 'unsubscribedCount', unsubscribed_count, 'completedCount', completed_count,
      'totalOpportunities', total_opportunities, 'totalOpportunityValue', total_opportunity_value
    ) from totals)
  );
$$;

-- ----------------------------------------------------------------------------
-- 8. get_voice_metrics(from, to)
--    Mirrors /api/metrics/voice for recruiting only (this project has one
--    call-log table). Pickup = duration_seconds > 18. Completed = status in
--    ('customer-ended-call','assistant-ended-call'). Sentiment resolved by
--    nearest of Voice_1_Date/Voice_2_Date to the call's started_at.
-- ----------------------------------------------------------------------------
create or replace function public.get_voice_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with calls as (
    select
      c.id, c.started_at, c.duration_seconds, c.cost_usd, c.status, c.lead_id,
      (c.duration_seconds > 18) as picked_up,
      (c.status in ('customer-ended-call', 'assistant-ended-call')) as is_completed
    from vapi_call_logs_brs c
    where c.started_at between p_from and p_to
  ),
  outreach as (
    select id, public.safe_ts("Voice_1_Date") as v1_date, voice1_sentiment, public.safe_ts("Voice_2_Date") as v2_date, voice2_sentiment
    from recruiting_ai_agent_outreach
  ),
  calls_sentiment as (
    select
      c.*,
      case
        when o.id is null then null
        when o.v1_date is not null and o.v2_date is not null then
          case when abs(extract(epoch from (c.started_at - o.v1_date))) <= abs(extract(epoch from (c.started_at - o.v2_date)))
               then o.voice1_sentiment else o.voice2_sentiment end
        when o.v1_date is not null then o.voice1_sentiment
        when o.v2_date is not null then o.voice2_sentiment
        else null
      end as resolved_sentiment
    from calls c
    left join outreach o on o.id::text = c.lead_id
  ),
  agg as (
    select
      count(*) as total_calls,
      coalesce(sum(duration_seconds), 0) as total_duration,
      coalesce(sum(cost_usd), 0) as total_cost,
      count(*) filter (where picked_up) as picked_up,
      count(*) filter (where is_completed) as completed,
      count(*) filter (where resolved_sentiment is not null) as positive_eligible,
      count(*) filter (where lower(trim(resolved_sentiment)) = 'positive') as positive
    from calls_sentiment
  ),
  daily as (
    select to_char(started_at, 'YYYY-MM-DD') as date, count(*) as calls, coalesce(sum(cost_usd), 0) as cost
    from calls group by 1 order by 1
  ),
  hourly as (
    select h as hour, coalesce((select count(*) from calls where extract(hour from started_at at time zone 'UTC') = h), 0) as calls
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
    from calls
    group by 1
  )
  select jsonb_build_object(
    'totalCalls', (select total_calls from agg),
    'totalDuration', (select total_duration from agg),
    'avgDuration', case when (select total_calls from agg) > 0 then round((select total_duration from agg)::numeric / (select total_calls from agg), 2) else 0 end,
    'totalCost', (select total_cost from agg),
    'avgCost', case when (select total_calls from agg) > 0 then round((select total_cost from agg)::numeric / (select total_calls from agg), 4) else 0 end,
    'byAgent', jsonb_build_array(jsonb_build_object('key', 'recruiting', 'calls', (select total_calls from agg), 'duration', (select total_duration from agg), 'cost', (select total_cost from agg))),
    'dailyVolume', coalesce((select jsonb_agg(jsonb_build_object('date', date, 'calls', calls, 'cost', cost) order by date) from daily), '[]'::jsonb),
    'hourlyDistribution', coalesce((select jsonb_agg(jsonb_build_object('hour', hour, 'calls', calls) order by hour) from hourly), '[]'::jsonb),
    'durationBuckets', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'calls', calls)) from duration_buckets), '[]'::jsonb),
    'rateByAgent', jsonb_build_array(jsonb_build_object(
      'key', 'recruiting',
      'calls', (select total_calls from agg),
      'pickedUp', (select picked_up from agg),
      'pickupRate', case when (select total_calls from agg) > 0 then round((select picked_up from agg)::numeric / (select total_calls from agg) * 100, 2) else 0 end,
      'completed', (select completed from agg),
      'completionRate', case when (select total_calls from agg) > 0 then round((select completed from agg)::numeric / (select total_calls from agg) * 100, 2) else 0 end,
      'positive', (select positive from agg),
      'positiveEligible', (select positive_eligible from agg),
      'positiveRate', case when (select positive_eligible from agg) > 0 then round((select positive from agg)::numeric / (select positive_eligible from agg) * 100, 2) else 0 end
    ))
  );
$$;

-- ----------------------------------------------------------------------------
-- 9. get_calls(from, to, include_telephony default false)
--    Mirrors /api/calls for recruiting: call rows joined to best-matching
--    outreach row by normalized phone (digits-only), preferring the row that
--    actually has sentiment data, tie-break newest created_at.
--    Telephony cost (Twilio) is NOT computed here (external API, not in DB) --
--    totalCost = cost_usd only; app layer should add telephony cost if needed.
-- ----------------------------------------------------------------------------
create or replace function public.get_calls(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with calls as (
    select * from vapi_call_logs_brs where started_at between p_from and p_to
  ),
  outreach as (
    select
      id, created_at, master_lead_id, voice1_sentiment, call1_note, voice2_sentiment, call2_note,
      regexp_replace(coalesce(personal_phone, ''), '\D', '', 'g') as phone_digits
    from recruiting_ai_agent_outreach
    where personal_phone is not null
  ),
  calls_phone as (
    select *, regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') as phone_digits
    from calls
  ),
  ranked as (
    select
      c.id as call_id,
      o.master_lead_id, o.voice1_sentiment, o.call1_note, o.voice2_sentiment, o.call2_note,
      row_number() over (
        partition by c.id
        order by (o.voice1_sentiment is not null or o.voice2_sentiment is not null) desc, o.created_at desc
      ) as rn
    from calls_phone c
    join outreach o on o.phone_digits = c.phone_digits and c.phone_digits <> ''
  ),
  best_match as (
    select call_id, master_lead_id, voice1_sentiment, call1_note, voice2_sentiment, call2_note
    from ranked
    where rn = 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'agent', 'recruiting',
    'isInbound', false,
    'startedAt', c.started_at,
    'durationSeconds', c.duration_seconds,
    'cost', c.cost_usd,
    'totalCost', c.cost_usd,
    'phone', c.customer_phone,
    'name', c.customer_name,
    'status', c.status,
    'voiceCallStatus', c.voice_call_status,
    'source', c.source,
    'summary', c.summary,
    'recordingUrl', c.recording_url,
    'note', c.note,
    'leadId', c.lead_id,
    'masterLeadId', m.master_lead_id,
    'voice1Sentiment', m.voice1_sentiment,
    'call1Note', m.call1_note,
    'voice2Sentiment', m.voice2_sentiment,
    'call2Note', m.call2_note
  ) order by c.started_at desc), '[]'::jsonb)
  from calls c
  left join best_match m on m.call_id = c.id;
$$;

-- ----------------------------------------------------------------------------
-- 10. get_call_by_id(call_id)
--     Mirrors the DB-fallback path of /api/calls/[id] for recruiting.
-- ----------------------------------------------------------------------------
create or replace function public.get_call_by_id(p_id text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', id, 'agent', 'recruiting', 'startedAt', started_at, 'durationSeconds', duration_seconds,
    'cost', cost_usd, 'phone', customer_phone, 'name', customer_name, 'status', status,
    'voiceCallStatus', voice_call_status, 'source', source, 'transcript', transcript,
    'callSummary', summary, 'recordingUrl', recording_url, 'note', note, 'leadId', lead_id
  )
  from vapi_call_logs_brs
  where id = p_id;
$$;

-- ----------------------------------------------------------------------------
-- 11. get_call_by_master_lead(master_lead_id)
--     Mirrors /api/calls/by-lead/[masterLeadId]: most recent call for any
--     outreach row tied to this master lead.
-- ----------------------------------------------------------------------------
create or replace function public.get_call_by_master_lead(p_master_lead_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with outreach_ids as (
    select id from recruiting_ai_agent_outreach where master_lead_id = p_master_lead_id
  )
  select jsonb_build_object(
    'id', c.id, 'agent', 'recruiting', 'startedAt', c.started_at, 'durationSeconds', c.duration_seconds,
    'cost', c.cost_usd, 'phone', c.customer_phone, 'name', c.customer_name, 'status', c.status,
    'voiceCallStatus', c.voice_call_status, 'source', c.source, 'transcript', c.transcript,
    'callSummary', c.summary, 'recordingUrl', c.recording_url, 'note', c.note, 'leadId', c.lead_id
  )
  from vapi_call_logs_brs c
  where c.lead_id in (select id::text from outreach_ids)
  order by c.started_at desc
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- 12. get_agent_metrics(from, to)
--     Mirrors /api/metrics/agents for recruiting: totalLeads (all-time count
--     on master_leads), emailsSent/voiceCalls/callReplies (date-ranged, text
--     columns regex-extracted for an ISO date), emailReplies (replies count).
-- ----------------------------------------------------------------------------
create or replace function public.get_agent_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with extracted as (
    select
      public.safe_ts("Email_1_Sent_At") as e1,
      public.safe_ts("Email_2_Sent_At") as e2,
      public.safe_ts("Voice_1_Date") as v1,
      public.safe_ts("Voice_2_Date") as v2,
      public.safe_ts("Call_Reply_Track") as cr
    from recruiting_ai_agent_outreach
  ),
  counted as (
    select
      count(*) filter (where e1 between p_from and p_to) + count(*) filter (where e2 between p_from and p_to) as emails_sent,
      count(*) filter (where v1 between p_from and p_to) + count(*) filter (where v2 between p_from and p_to) as voice_calls,
      count(*) filter (where cr between p_from and p_to) as call_replies
    from extracted
  )
  select jsonb_build_object(
    'recruiting', jsonb_build_object(
      'key', 'recruiting',
      'totalLeads', (select count(*) from master_leads),
      'emailsSent', (select emails_sent from counted),
      'voiceCalls', (select voice_calls from counted),
      'emailReplies', (select count(*) from instantly_lead_replies where reply_timestamp between p_from and p_to),
      'callReplies', (select call_replies from counted)
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 13. get_master_metrics(from, to)
--     Mirrors /api/metrics/master: all-time total count + date-ranged daily
--     trend from master_leads.created_at.
-- ----------------------------------------------------------------------------
create or replace function public.get_master_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with daily as (
    select to_char(created_at, 'YYYY-MM-DD') as date, count(*) as leads
    from master_leads
    where created_at between p_from and p_to
    group by 1
    order by 1
  )
  select jsonb_build_object(
    'totalLeads', (select count(*) from master_leads),
    'leadsDaily', coalesce((select jsonb_agg(jsonb_build_object('date', date, 'leads', leads) order by date) from daily), '[]'::jsonb)
  );
$$;

-- ----------------------------------------------------------------------------
-- 14. get_master_leads(from, to)
--     Mirrors /api/leads/master for recruiting.
-- ----------------------------------------------------------------------------
create or replace function public.get_master_leads(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'leads', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'agent', 'recruiting', 'name', coalesce(full_name, first_name),
      'phone', personal_phone, 'email', personal_email,
      'leadClassification', lead_classification, 'leadClassificationReason', lead_classification_reason,
      'syncedToOutreach', synced_to_outreach, 'createdAt', created_at
    ) order by created_at desc), '[]'::jsonb)
  )
  from master_leads
  where created_at between p_from and p_to;
$$;

-- ----------------------------------------------------------------------------
-- 15. get_leads(from, to)
--     Mirrors /api/leads for recruiting: full normalized outreach rows.
-- ----------------------------------------------------------------------------
create or replace function public.get_leads(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'agent', 'recruiting',
    'leads', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'agent', 'recruiting', 'name', coalesce(full_name, "First_Name"),
      'phone', personal_phone, 'email', "Personal_Email",
      'leadClassification', "Lead_Classification", 'leadClassificationReason', "Lead_Classification_Reason",
      'sequenceStatus', sequence_status, 'outreachStep', outreach_step,
      'email1', jsonb_build_object('body', "Email_1", 'status', "Email_1_Status", 'sentAt', "Email_1_Sent_At"),
      'email2', jsonb_build_object('body', "Email_2", 'status', "Email_2_Status", 'sentAt', "Email_2_Sent_At"),
      'voice1', jsonb_build_object('date', "Voice_1_Date", 'status', "Voice_1_Status", 'sentiment', voice1_sentiment, 'note', call1_note),
      'voice2', jsonb_build_object('date', "Voice_2_Date", 'status', "Voice_2_Status", 'sentiment', voice2_sentiment, 'note', call2_note),
      'emailReplyTrack', "Email_Reply_Track",
      'callReplyTrack', "Call_Reply_Track",
      'emailUnsubscribed', email_unsubscribed,
      'emailBounced', email_bounced,
      'createdAt', created_at
    ) order by created_at desc), '[]'::jsonb)
  )
  from recruiting_ai_agent_outreach
  where created_at between p_from and p_to;
$$;

-- ----------------------------------------------------------------------------
-- 16. get_vapi_cost()
--     Mirrors part of /api/vapi/cost scoped to this project's call table.
-- ----------------------------------------------------------------------------
create or replace function public.get_vapi_cost()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object('totalUsed', coalesce(sum(cost_usd), 0)) from vapi_call_logs_brs;
$$;

-- ----------------------------------------------------------------------------
-- 17. get_inbound_leads(from, to)
--     This project's slice of /api/inbound-leads, keyed 'realty'. App layer
--     merges with wealth's and bootcamps' own slices.
-- ----------------------------------------------------------------------------
create or replace function public.get_inbound_leads(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'realty', coalesce((
      select jsonb_agg(to_jsonb(t.*) order by t.created_at desc)
      from bennett_realty_inbound_leads t
      where t.created_at between p_from and p_to
    ), '[]'::jsonb)
  );
$$;

-- ----------------------------------------------------------------------------
-- 18. get_inbound_leads_count()
--     This project's slice of /api/metrics/inbound-leads, all-time count.
-- ----------------------------------------------------------------------------
create or replace function public.get_inbound_leads_count()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object('realtyCount', (select count(*) from bennett_realty_inbound_leads));
$$;

-- ----------------------------------------------------------------------------
-- 19. get_outreach_match_by_phone(agent, phone)
--     Targeted single-phone outreach lookup, used by /api/calls/[id] so it
--     doesn't have to pull the entire get_calls() result set (all-time, every
--     call) just to resolve one call's sentiment/masterLeadId. Same matching
--     rule as get_calls: prefer the outreach row that actually has sentiment
--     data, tie-break newest created_at. p_agent is accepted for interface
--     parity with the multi-business projects but ignored here (always
--     recruiting).
-- ----------------------------------------------------------------------------
create or replace function public.get_outreach_match_by_phone(p_agent text, p_phone text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'masterLeadId', o.master_lead_id, 'voice1Sentiment', o.voice1_sentiment, 'call1Note', o.call1_note,
    'voice2Sentiment', o.voice2_sentiment, 'call2Note', o.call2_note
  )
  from recruiting_ai_agent_outreach o
  where personal_phone is not null
    and regexp_replace(personal_phone, '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    and regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') <> ''
  order by (o.voice1_sentiment is not null or o.voice2_sentiment is not null) desc, o.created_at desc
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- Grants: expose to the roles your app actually authenticates as.
-- Adjust/remove per your security model. Safe defaults: anon + authenticated
-- can call these (they are read-only SELECT-only functions).
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
  public.get_call_by_master_lead(uuid),
  public.get_agent_metrics(timestamptz, timestamptz),
  public.get_master_metrics(timestamptz, timestamptz),
  public.get_master_leads(timestamptz, timestamptz),
  public.get_leads(timestamptz, timestamptz),
  public.get_vapi_cost(),
  public.get_inbound_leads(timestamptz, timestamptz),
  public.get_inbound_leads_count(),
  public.get_outreach_match_by_phone(text, text)
to anon, authenticated;
