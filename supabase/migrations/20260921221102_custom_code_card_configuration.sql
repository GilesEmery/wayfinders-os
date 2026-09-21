-- Custom-code Experiences do not have a canonical Published Version, so their
-- participant-facing card presentation is owned by the Experience itself.

alter table public.experiences
  add column card_configuration jsonb not null default '{}'::jsonb;

alter table public.experiences
  add constraint experiences_card_configuration_object_check
  check (jsonb_typeof(card_configuration) = 'object');

comment on column public.experiences.card_configuration is
  'Participant Course Card presentation for custom-code Experiences. Builder and hybrid Experiences remain Version-owned.';
