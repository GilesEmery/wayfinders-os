-- Remove unused question definitions before the section's block cascade.
-- This trigger runs in the DELETE transaction; any failure rolls everything back.
create or replace function public.cleanup_draft_section_dependencies()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.experience_versions
    where id = old.experience_version_id and status = 'draft' for update;
  if not found then
    raise exception 'Only sections in an editable draft can be deleted.';
  end if;

  -- Lock children before checking history to serialize concurrent authoring.
  perform 1 from public.content_blocks where section_id = old.id for update;
  perform 1 from public.response_definitions
    where block_id in (select id from public.content_blocks where section_id = old.id)
    for update;
  if exists (
    select 1 from public.participant_responses r
    join public.response_definitions d on d.id = r.response_definition_id
    join public.content_blocks b on b.id = d.block_id
    where b.section_id = old.id
  ) then
    raise exception 'This section has saved participant responses and cannot be deleted.';
  end if;

  delete from public.response_definitions
    where block_id in (select id from public.content_blocks where section_id = old.id);
  -- Remove links only; shared resource files remain available in the library.
  delete from public.content_block_resources
    where content_block_id in (select id from public.content_blocks where section_id = old.id);
  return old;
end;
$$;
revoke all on function public.cleanup_draft_section_dependencies() from public, anon, authenticated;
create trigger cleanup_draft_section_dependencies
before delete on public.experience_sections
for each row execute function public.cleanup_draft_section_dependencies();
