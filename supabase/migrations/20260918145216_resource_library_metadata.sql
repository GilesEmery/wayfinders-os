-- Platform Resource Library metadata and optional Course organization.
--
-- File type remains represented by resources.resource_type plus mime_type.
-- Category is deliberately separate human-managed organizational metadata.
-- Explicit Course associations supplement, but never replace, usage derived
-- from content blocks, Companion modules, and version configuration.

alter table public.resources
  add column resource_category text not null default 'other',
  add constraint resources_resource_category_check check (resource_category in (
    'logo', 'image', 'template', 'worksheet', 'guide',
    'document', 'pdf_reading', 'branding', 'other'
  ));

update public.resources
set resource_category = case
  when lower(coalesce(title, '') || ' ' || coalesce(original_filename, '')) like '%logo%'
    then 'logo'
  when resource_type = 'image' then 'image'
  when resource_type = 'worksheet' then 'worksheet'
  when resource_type = 'guide' then 'guide'
  when resource_type = 'pdf' then 'pdf_reading'
  when resource_type in ('download', 'article') then 'document'
  else 'other'
end;

comment on column public.resources.resource_category is
  'Human-managed Resource Library classification, independent from the physical file type and MIME type.';

create index resources_library_browse_idx
  on public.resources (status, created_at desc);

create index resources_library_category_idx
  on public.resources (resource_category, created_at desc);

create table public.resource_experience_associations (
  resource_id uuid not null references public.resources(id) on delete restrict,
  experience_id uuid not null references public.experiences(id) on delete restrict,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (resource_id, experience_id)
);

comment on table public.resource_experience_associations is
  'Optional Resource Library organization by Course/Experience. Actual usage remains derived from canonical content, Companion, theme, and Course configuration references.';

create index resource_experience_associations_experience_idx
  on public.resource_experience_associations (experience_id, resource_id);

alter table public.resource_experience_associations enable row level security;

revoke all on table public.resource_experience_associations
  from anon, authenticated;
grant all on table public.resource_experience_associations
  to service_role;
