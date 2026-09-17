-- Enable the registered native resource Block types. Draft Blocks may be
-- created before a Resource is attached; application publish validation owns
-- completeness checks for participant-visible media.
alter table public.content_blocks
  drop constraint if exists content_blocks_block_type_check;

alter table public.content_blocks
  add constraint content_blocks_block_type_check
  check (block_type in (
    'heading', 'rich_text', 'video', 'image', 'pdf_reader', 'document', 'download', 'external_link',
    'scripture', 'quote', 'callout', 'reflection', 'journal', 'discussion_prompt',
    'practice', 'assignment', 'quiz', 'check_in', 'worksheet', 'checklist',
    'resource', 'button', 'embed', 'action_step', 'ranking', 'card_selection',
    'structured_response', 'custom_component', 'system_component'
  ));
