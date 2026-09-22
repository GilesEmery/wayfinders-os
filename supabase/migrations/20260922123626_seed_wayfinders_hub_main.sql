-- GPT / agent rules for this seed:
-- 1. Hub membership is relational context, not an authorization grant.
-- 2. participant_preferences.default_hub_id only selects the participant's
--    primary UI context; it never grants membership or permissions.
-- 3. Only an active Hub whose membership_mode is 'open' may be joined from a
--    public /<hub-slug> entry path or through participant self-service.
-- 4. Hub Leader authority continues to require a separately validated
--    platform_role_assignments row. Never infer authority from this seed or
--    from hub_memberships.membership_role alone.
-- 5. Standard PurposeOS account creation may add a participant to this Hub,
--    but must not overwrite an existing default Hub preference.

insert into public.hubs (
  slug,
  name,
  description,
  status,
  membership_mode,
  location
)
values (
  'wayfinders-hub-main',
  'Wayfinders Hub Main',
  'The shared Wayfinders Hub for participants who join PurposeOS through the standard entry point.',
  'active',
  'open',
  '{}'::jsonb
)
on conflict (slug) do nothing;
