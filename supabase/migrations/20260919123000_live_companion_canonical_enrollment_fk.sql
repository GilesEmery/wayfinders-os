-- Live Companion rows are immutable delivery history. Their Course Version is
-- the Version on which the interaction occurred, while the canonical Course
-- enrollment is durable and may publish-forward to a newer Version.
--
-- Keep enrollment ownership enforced here. The existing
-- enforce_companion_live_group_context() constraint triggers continue to
-- require the enrollment's current Version and active Cohort membership when
-- participant-authored rows are inserted or updated.

do $validation$
begin
  if exists (
    select 1
    from public.companion_chat_messages message
    left join public.experience_enrollments enrollment
      on enrollment.id = message.author_enrollment_id
     and enrollment.participant_id = message.author_participant_id
    where enrollment.id is null
  ) then
    raise foreign_key_violation using
      message = 'Companion Chat history contains an invalid canonical enrollment owner.';
  end if;

  if exists (
    select 1
    from public.companion_call_sessions session
    left join public.experience_enrollments enrollment
      on enrollment.id = session.started_by_enrollment_id
     and enrollment.participant_id = session.started_by_participant_id
    where session.started_by_enrollment_id is not null
      and enrollment.id is null
  ) then
    raise foreign_key_violation using
      message = 'Companion Call history contains an invalid canonical enrollment owner.';
  end if;
end;
$validation$;

alter table public.companion_chat_messages
  drop constraint companion_chat_messages_author_enrollment_fk,
  add constraint companion_chat_messages_author_enrollment_fk
    foreign key (author_enrollment_id, author_participant_id)
    references public.experience_enrollments(id, participant_id)
    on delete restrict;

alter table public.companion_call_sessions
  drop constraint companion_call_sessions_starter_enrollment_fk,
  add constraint companion_call_sessions_starter_enrollment_fk
    foreign key (started_by_enrollment_id, started_by_participant_id)
    references public.experience_enrollments(id, participant_id)
    on delete restrict;

create index companion_chat_messages_enrollment_idx
  on public.companion_chat_messages (author_enrollment_id);

create index companion_call_sessions_enrollment_idx
  on public.companion_call_sessions (started_by_enrollment_id)
  where started_by_enrollment_id is not null;

comment on constraint companion_chat_messages_author_enrollment_fk
  on public.companion_chat_messages is
  'Preserves canonical enrollment authorship without tying historical Chat rows to the enrollment current Version.';

comment on constraint companion_call_sessions_starter_enrollment_fk
  on public.companion_call_sessions is
  'Preserves canonical enrollment authorship without tying historical Call rows to the enrollment current Version.';
