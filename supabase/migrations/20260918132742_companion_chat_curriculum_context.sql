-- Preserve the participant's Course location when a Cohort Chat message is
-- posted. The JSON snapshot is intentionally historical: stable curriculum
-- keys support grouping while title snapshots remain readable after later
-- Course edits or publication.

alter table public.companion_chat_messages
  add column curriculum_context jsonb not null default '{}'::jsonb,
  add constraint companion_chat_messages_curriculum_context_object_check
    check (jsonb_typeof(curriculum_context) = 'object');

comment on column public.companion_chat_messages.curriculum_context is
  'Historical Course-location snapshot captured at send time. Expected keys are module_key, module_title, lesson_key, lesson_title, section_key, and section_title; an empty object means no location was captured.';
