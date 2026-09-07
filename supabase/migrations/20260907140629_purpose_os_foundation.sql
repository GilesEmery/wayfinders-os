-- Purpose OS foundational schema.
-- Additive only: existing participants, LMU, admin, and legacy session tables are unchanged.
--
-- Architecture notes:
-- - Membership records describe which relational group a Wayfinder belongs to and
--   their capacity in that group. They are not authorization grants. Privileged
--   server actions must use scoped authorization (for example, an active
--   platform_role_assignments row with role = 'hub_leader', scope_type = 'hub',
--   and scope_id = the target Hub), not hub_memberships.membership_role alone.
-- - Builder content starts with experiences -> versions -> modules -> lessons ->
--   content blocks. Custom-coded experiences are not required to use that hierarchy.
--   Template-specific tables are intentionally deferred until cloning, flags, and
--   dedicated template entities can be evaluated against real builder workflows.
-- - Certificates are a near-term follow-on domain, intentionally deferred here.
--   They should attach to participant, experience, experience_version, and enrollment
--   so the Wayfinder CRM can expose issue date, credential code, verification, and
--   optional expiration without changing the identity/enrollment foundation.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text null,
  organization_type text not null default 'organization' check (organization_type in ('organization', 'partner', 'ministry')),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  membership_role text not null default 'member' check (membership_role in ('member', 'leader', 'organization_admin')),
  status text not null default 'active' check (status in ('invited', 'active', 'inactive', 'archived')),
  joined_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_organization_participant_key unique (organization_id, participant_id)
);

comment on table public.organization_memberships is
  'Relational organization membership only; membership_role is not a server authorization grant.';

create table if not exists public.hubs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null references public.organizations(id) on delete restrict,
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text null,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  location jsonb not null default '{}'::jsonb check (jsonb_typeof(location) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_memberships (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  membership_role text not null default 'member' check (membership_role in ('member', 'hub_leader')),
  status text not null default 'active' check (status in ('invited', 'active', 'inactive', 'archived')),
  joined_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hub_memberships_hub_participant_key unique (hub_id, participant_id)
);

comment on table public.hub_memberships is
  'Relational Hub membership only; membership_role (including hub_leader) is not a server authorization grant.';

create table if not exists public.platform_role_assignments (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('super_admin', 'admin', 'organization_admin', 'hub_leader', 'facilitator')),
  scope_type text not null check (scope_type in ('global', 'organization', 'hub', 'cohort')),
  scope_id uuid null,
  status text not null default 'active' check (status in ('active', 'inactive', 'revoked')),
  granted_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_role_assignments_scope_shape_check check ((scope_type = 'global' and scope_id is null) or (scope_type <> 'global' and scope_id is not null))
);

comment on table public.platform_role_assignments is
  'Scoped server authorization assignments, separate from organization and Hub membership.';

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text null,
  experience_type text not null check (experience_type in ('assessment', 'course', 'training', 'workshop', 'pathway', 'cohort_pathway', 'retreat', 'activity', 'resource')),
  delivery_mode text not null default 'builder' check (delivery_mode in ('custom_code', 'builder', 'hybrid')),
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'archived')),
  accent_color text null check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experience_versions (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete restrict,
  version_label text not null check (char_length(btrim(version_label)) between 1 and 80),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text null,
  published_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_versions_experience_label_key unique (experience_id, version_label),
  constraint experience_versions_id_experience_key unique (id, experience_id),
  constraint experience_versions_published_at_check check (status <> 'published' or published_at is not null)
);

create table if not exists public.experience_modules (
  id uuid primary key default gen_random_uuid(),
  experience_version_id uuid not null references public.experience_versions(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text null,
  sort_order integer not null check (sort_order >= 0),
  is_required boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_modules_version_order_key unique (experience_version_id, sort_order),
  constraint experience_modules_id_version_key unique (id, experience_version_id)
);

create table if not exists public.experience_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null,
  experience_version_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text null,
  sort_order integer not null check (sort_order >= 0),
  is_required boolean not null default true,
  completion_rule text not null default 'view' check (completion_rule in ('view', 'manual', 'blocks_complete', 'response_submitted')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_lessons_module_order_key unique (module_id, sort_order),
  constraint experience_lessons_id_version_key unique (id, experience_version_id),
  constraint experience_lessons_id_module_version_key unique (id, module_id, experience_version_id),
  constraint experience_lessons_module_version_fkey foreign key (module_id, experience_version_id) references public.experience_modules(id, experience_version_id) on delete restrict
);

create table if not exists public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.experience_lessons(id) on delete restrict,
  block_type text not null check (block_type in ('heading', 'rich_text', 'video', 'image', 'scripture', 'quote', 'callout', 'reflection', 'journal', 'discussion_prompt', 'practice', 'assignment', 'quiz', 'check_in', 'worksheet', 'checklist', 'resource', 'button', 'embed', 'action_step', 'ranking', 'card_selection', 'structured_response')),
  sort_order integer not null check (sort_order >= 0),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_blocks_lesson_order_key unique (lesson_id, sort_order),
  constraint content_blocks_id_lesson_key unique (id, lesson_id)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text null,
  resource_type text not null check (resource_type in ('video', 'pdf', 'worksheet', 'image', 'article', 'guide', 'framework', 'download', 'tool', 'link', 'other')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  external_url text null,
  storage_bucket text null,
  storage_path text null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_location_check check (status = 'draft' or external_url is not null or (storage_bucket is not null and storage_path is not null))
);

create table if not exists public.content_block_resources (
  content_block_id uuid not null references public.content_blocks(id) on delete restrict,
  resource_id uuid not null references public.resources(id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (content_block_id, resource_id)
);

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete restrict,
  experience_version_id uuid null,
  organization_id uuid null references public.organizations(id) on delete restrict,
  hub_id uuid null references public.hubs(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'open', 'active', 'completed', 'archived')),
  start_date date null,
  end_date date null,
  capacity integer null check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cohorts_date_order_check check (end_date is null or start_date is null or end_date >= start_date),
  constraint cohorts_version_experience_fkey foreign key (experience_version_id, experience_id) references public.experience_versions(id, experience_id) on delete restrict
);

create table if not exists public.cohort_memberships (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  membership_role text not null default 'participant' check (membership_role in ('participant', 'facilitator')),
  status text not null default 'active' check (status in ('invited', 'active', 'completed', 'withdrawn', 'archived')),
  joined_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cohort_memberships_cohort_participant_role_key unique (cohort_id, participant_id, membership_role)
);

create table if not exists public.experience_enrollments (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete restrict,
  experience_version_id uuid null,
  participant_id uuid not null references public.participants(id) on delete restrict,
  cohort_id uuid null references public.cohorts(id) on delete restrict,
  status text not null default 'enrolled' check (status in ('invited', 'enrolled', 'in_progress', 'completed', 'withdrawn', 'expired')),
  enrolled_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_enrollments_time_order_check check (completed_at is null or started_at is null or completed_at >= started_at),
  constraint experience_enrollments_id_participant_experience_key unique (id, participant_id, experience_id),
  constraint experience_enrollments_id_participant_key unique (id, participant_id),
  constraint experience_enrollments_id_participant_version_key unique (id, participant_id, experience_version_id),
  constraint experience_enrollments_version_experience_fkey foreign key (experience_version_id, experience_id) references public.experience_versions(id, experience_id) on delete restrict
);

create table if not exists public.experience_entitlements (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete restrict,
  experience_id uuid not null references public.experiences(id) on delete restrict,
  source_type text not null check (source_type in ('purchase', 'subscription', 'organization', 'hub', 'cohort', 'scholarship', 'admin_grant', 'free')),
  source_id uuid null,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz null,
  granted_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_entitlements_time_order_check check (expires_at is null or expires_at > starts_at)
);

create table if not exists public.experience_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique,
  participant_id uuid not null references public.participants(id) on delete restrict,
  experience_id uuid not null references public.experiences(id) on delete restrict,
  experience_version_id uuid null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  current_module_id uuid null,
  current_lesson_id uuid null,
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_progress_curriculum_shape_check check (
    (current_module_id is null or experience_version_id is not null)
    and (current_lesson_id is null or current_module_id is not null)
  ),
  constraint experience_progress_enrollment_owner_fkey foreign key (enrollment_id, participant_id, experience_id) references public.experience_enrollments(id, participant_id, experience_id) on delete restrict,
  constraint experience_progress_enrollment_owner_version_fkey foreign key (enrollment_id, participant_id, experience_version_id) references public.experience_enrollments(id, participant_id, experience_version_id) on delete restrict,
  constraint experience_progress_version_experience_fkey foreign key (experience_version_id, experience_id) references public.experience_versions(id, experience_id) on delete restrict,
  constraint experience_progress_current_module_version_fkey foreign key (current_module_id, experience_version_id) references public.experience_modules(id, experience_version_id) on delete restrict,
  constraint experience_progress_current_lesson_module_version_fkey foreign key (current_lesson_id, current_module_id, experience_version_id) references public.experience_lessons(id, module_id, experience_version_id) on delete restrict
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null,
  participant_id uuid not null references public.participants(id) on delete restrict,
  experience_version_id uuid not null,
  lesson_id uuid not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  resume_state jsonb not null default '{}'::jsonb check (jsonb_typeof(resume_state) = 'object'),
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_progress_enrollment_lesson_key unique (enrollment_id, lesson_id),
  constraint lesson_progress_enrollment_owner_version_fkey foreign key (enrollment_id, participant_id, experience_version_id) references public.experience_enrollments(id, participant_id, experience_version_id) on delete restrict,
  constraint lesson_progress_lesson_version_fkey foreign key (lesson_id, experience_version_id) references public.experience_lessons(id, experience_version_id) on delete restrict
);

create table if not exists public.response_definitions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  experience_version_id uuid not null,
  block_id uuid null,
  response_key text not null check (response_key ~ '^[a-z][a-z0-9_]*$'),
  response_type text not null check (response_type in ('reflection', 'journal', 'short_text', 'long_text', 'choice', 'multi_select', 'ranking', 'structured_response', 'action_plan')),
  label text not null check (char_length(btrim(label)) between 1 and 240),
  instructions text null,
  is_required boolean not null default false,
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint response_definitions_lesson_key_key unique (lesson_id, response_key),
  constraint response_definitions_id_version_key unique (id, experience_version_id),
  constraint response_definitions_lesson_version_fkey foreign key (lesson_id, experience_version_id) references public.experience_lessons(id, experience_version_id) on delete restrict,
  constraint response_definitions_block_lesson_fkey foreign key (block_id, lesson_id) references public.content_blocks(id, lesson_id) on delete restrict
);

create table if not exists public.participant_responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete restrict,
  enrollment_id uuid not null,
  experience_version_id uuid not null,
  response_definition_id uuid not null,
  response_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'finalized')),
  finalized_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participant_responses_enrollment_definition_key unique (enrollment_id, response_definition_id),
  constraint participant_responses_finalized_at_check check (status <> 'finalized' or finalized_at is not null),
  constraint participant_responses_enrollment_owner_version_fkey foreign key (enrollment_id, participant_id, experience_version_id) references public.experience_enrollments(id, participant_id, experience_version_id) on delete restrict,
  constraint participant_responses_definition_version_fkey foreign key (response_definition_id, experience_version_id) references public.response_definitions(id, experience_version_id) on delete restrict
);

-- Foreign-key and expected lookup indexes. Unique constraints already provide indexes.
create index if not exists organization_memberships_participant_id_idx on public.organization_memberships (participant_id);
create index if not exists organization_memberships_status_idx on public.organization_memberships (status);
create index if not exists hubs_organization_id_idx on public.hubs (organization_id) where organization_id is not null;
create index if not exists hub_memberships_participant_id_idx on public.hub_memberships (participant_id);
create index if not exists hub_memberships_status_idx on public.hub_memberships (status);
create index if not exists platform_role_assignments_auth_user_id_idx on public.platform_role_assignments (auth_user_id);
create index if not exists platform_role_assignments_scope_idx on public.platform_role_assignments (scope_type, scope_id) where scope_id is not null;
create index if not exists platform_role_assignments_granted_by_idx on public.platform_role_assignments (granted_by) where granted_by is not null;
create unique index if not exists platform_role_assignments_global_key on public.platform_role_assignments (auth_user_id, role) where scope_type = 'global' and scope_id is null;
create unique index if not exists platform_role_assignments_scoped_key on public.platform_role_assignments (auth_user_id, role, scope_type, scope_id) where scope_type <> 'global' and scope_id is not null;
create index if not exists experiences_status_idx on public.experiences (status);
create index if not exists experiences_created_by_idx on public.experiences (created_by) where created_by is not null;
create index if not exists experience_versions_status_idx on public.experience_versions (experience_id, status);
create index if not exists experience_versions_created_by_idx on public.experience_versions (created_by) where created_by is not null;
create index if not exists experience_modules_version_id_idx on public.experience_modules (experience_version_id);
create index if not exists experience_lessons_module_id_idx on public.experience_lessons (module_id);
create index if not exists experience_lessons_version_id_idx on public.experience_lessons (experience_version_id);
create index if not exists content_blocks_lesson_id_idx on public.content_blocks (lesson_id);
create index if not exists resources_created_by_idx on public.resources (created_by) where created_by is not null;
create index if not exists resources_status_idx on public.resources (status);
create index if not exists content_block_resources_resource_id_idx on public.content_block_resources (resource_id);
create index if not exists cohorts_experience_id_idx on public.cohorts (experience_id);
create index if not exists cohorts_experience_version_id_idx on public.cohorts (experience_version_id) where experience_version_id is not null;
create index if not exists cohorts_organization_id_idx on public.cohorts (organization_id) where organization_id is not null;
create index if not exists cohorts_hub_id_idx on public.cohorts (hub_id) where hub_id is not null;
create index if not exists cohorts_status_idx on public.cohorts (status);
create index if not exists cohort_memberships_participant_id_idx on public.cohort_memberships (participant_id);
create index if not exists cohort_memberships_status_idx on public.cohort_memberships (status);
create index if not exists experience_enrollments_participant_id_idx on public.experience_enrollments (participant_id);
create index if not exists experience_enrollments_experience_id_idx on public.experience_enrollments (experience_id);
create index if not exists experience_enrollments_version_id_idx on public.experience_enrollments (experience_version_id) where experience_version_id is not null;
create index if not exists experience_enrollments_cohort_id_idx on public.experience_enrollments (cohort_id) where cohort_id is not null;
create index if not exists experience_enrollments_status_idx on public.experience_enrollments (status);
create unique index if not exists experience_enrollments_individual_key on public.experience_enrollments (participant_id, experience_id) where cohort_id is null and status in ('invited', 'enrolled', 'in_progress');
create unique index if not exists experience_enrollments_cohort_key on public.experience_enrollments (participant_id, experience_id, cohort_id) where cohort_id is not null and status in ('invited', 'enrolled', 'in_progress');
create index if not exists experience_entitlements_participant_id_idx on public.experience_entitlements (participant_id);
create index if not exists experience_entitlements_experience_id_idx on public.experience_entitlements (experience_id);
create index if not exists experience_entitlements_granted_by_idx on public.experience_entitlements (granted_by) where granted_by is not null;
create unique index if not exists experience_entitlements_source_key on public.experience_entitlements (participant_id, experience_id, source_type, source_id) where source_id is not null and status = 'active';
create unique index if not exists experience_entitlements_sourceless_key on public.experience_entitlements (participant_id, experience_id, source_type) where source_id is null and status = 'active';
create index if not exists experience_progress_participant_id_idx on public.experience_progress (participant_id);
create index if not exists experience_progress_experience_id_idx on public.experience_progress (experience_id);
create index if not exists experience_progress_version_id_idx on public.experience_progress (experience_version_id) where experience_version_id is not null;
create index if not exists experience_progress_current_module_idx on public.experience_progress (current_module_id) where current_module_id is not null;
create index if not exists experience_progress_current_lesson_idx on public.experience_progress (current_lesson_id) where current_lesson_id is not null;
create index if not exists lesson_progress_participant_id_idx on public.lesson_progress (participant_id);
create index if not exists lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);
create index if not exists lesson_progress_version_id_idx on public.lesson_progress (experience_version_id);
create index if not exists response_definitions_block_id_idx on public.response_definitions (block_id) where block_id is not null;
create index if not exists response_definitions_version_id_idx on public.response_definitions (experience_version_id);
create index if not exists participant_responses_participant_id_idx on public.participant_responses (participant_id);
create index if not exists participant_responses_definition_id_idx on public.participant_responses (response_definition_id);
create index if not exists participant_responses_status_idx on public.participant_responses (status);

-- Reuse the existing trigger function without replacing it.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organizations', 'organization_memberships', 'hubs', 'hub_memberships',
    'platform_role_assignments', 'experiences', 'experience_versions',
    'experience_modules', 'experience_lessons', 'content_blocks', 'resources',
    'cohorts', 'cohort_memberships', 'experience_enrollments',
    'experience_entitlements', 'experience_progress', 'lesson_progress',
    'response_definitions', 'participant_responses'
  ] loop
    if not exists (
      select 1 from pg_trigger
      where tgname = table_name || '_set_updated_at'
        and tgrelid = format('public.%I', table_name)::regclass
        and not tgisinternal
    ) then
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_set_updated_at', table_name);
    end if;
  end loop;
end $$;

-- Server-only launch posture. RLS is enabled now; direct authenticated policies
-- will be added with tested participant, leader, and facilitator application paths.
-- Future browser access requires both an explicit GRANT for the relevant operation
-- and an appropriately scoped RLS policy; either control by itself is insufficient.
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.hubs enable row level security;
alter table public.hub_memberships enable row level security;
alter table public.platform_role_assignments enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_versions enable row level security;
alter table public.experience_modules enable row level security;
alter table public.experience_lessons enable row level security;
alter table public.content_blocks enable row level security;
alter table public.resources enable row level security;
alter table public.content_block_resources enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_memberships enable row level security;
alter table public.experience_enrollments enable row level security;
alter table public.experience_entitlements enable row level security;
alter table public.experience_progress enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.response_definitions enable row level security;
alter table public.participant_responses enable row level security;

revoke all on table public.organizations, public.organization_memberships, public.hubs,
  public.hub_memberships, public.platform_role_assignments, public.experiences,
  public.experience_versions, public.experience_modules, public.experience_lessons,
  public.content_blocks, public.resources, public.content_block_resources, public.cohorts,
  public.cohort_memberships, public.experience_enrollments, public.experience_entitlements,
  public.experience_progress, public.lesson_progress, public.response_definitions,
  public.participant_responses from anon, authenticated;

-- Known flagship experience identities only. They are custom-coded and are not
-- required to have builder versions, modules, lessons, or content blocks.
-- Planned programs intentionally have no accent yet.
insert into public.experiences (slug, name, description, experience_type, delivery_mode, status, accent_color, visibility)
values
  ('life-mapping-u', 'Life Mapping U', 'Career and calling assessment with ten guided modules.', 'assessment', 'custom_code', 'active', '#ED6A24', 'public'),
  ('kaleo', 'Kaleo', 'Formation pathway and discipleship experience.', 'pathway', 'custom_code', 'draft', null, 'private'),
  ('start-something', 'Start Something', 'Workshop and action pathway.', 'workshop', 'custom_code', 'draft', null, 'private'),
  ('impact-identity', 'Impact Identity', 'Guided discovery experience.', 'workshop', 'custom_code', 'draft', null, 'private'),
  ('hub-leader-cohort', 'Hub Leader Cohort', 'Cohort-based leadership pathway.', 'cohort_pathway', 'custom_code', 'draft', null, 'private'),
  ('impact-studio', 'Impact Studio', 'Formation experience connected to persistent initiative data.', 'cohort_pathway', 'custom_code', 'draft', null, 'private')
on conflict (slug) do nothing;
