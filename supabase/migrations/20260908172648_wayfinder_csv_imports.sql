-- Durable staging and audit records for privileged Wayfinder CSV imports.
-- participants remains the only canonical person record; import rows are proposals.

create table public.crm_imports (
  id uuid primary key default gen_random_uuid(),
  import_type text not null default 'wayfinders_csv' check (import_type = 'wayfinders_csv'),
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  status text not null default 'review' check (status in ('review', 'importing', 'completed', 'failed')),
  column_mapping jsonb not null check (jsonb_typeof(column_mapping) = 'object'),
  row_count integer not null check (row_count between 1 and 2000),
  result_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(result_summary) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_imports is
  'Privileged CRM import audit jobs; these records never replace public.participants.';

create table public.crm_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.crm_imports(id) on delete restrict,
  row_number integer not null check (row_number > 1),
  source_data jsonb not null check (jsonb_typeof(source_data) = 'object'),
  first_name text null,
  last_name text null,
  email text null,
  email_normalized text null check (email_normalized is null or email_normalized = lower(btrim(email_normalized))),
  classification text not null check (classification in ('new_wayfinder', 'existing_match', 'already_present', 'needs_review_shared_email', 'needs_review_duplicate_name', 'needs_review_invalid_email', 'needs_review_no_email', 'conflict')),
  existing_participant_id uuid null references public.participants(id) on delete restrict,
  issue text null,
  selected boolean not null default false,
  outcome text not null default 'pending' check (outcome in ('pending', 'created', 'matched', 'skipped', 'failed')),
  created_participant_id uuid null references public.participants(id) on delete restrict,
  error_detail text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_import_rows_job_row_key unique (import_id, row_number)
);

comment on table public.crm_import_rows is
  'Non-canonical staged CSV proposals retained for validation, reconciliation, and import auditability.';

create index crm_imports_created_by_created_at_idx on public.crm_imports (created_by, created_at desc);
create index crm_import_rows_import_classification_idx on public.crm_import_rows (import_id, classification);
create index crm_import_rows_email_idx on public.crm_import_rows (email_normalized) where email_normalized is not null;
create index crm_import_rows_existing_participant_idx on public.crm_import_rows (existing_participant_id) where existing_participant_id is not null;

create trigger crm_imports_set_updated_at before update on public.crm_imports
for each row execute function public.set_updated_at();
create trigger crm_import_rows_set_updated_at before update on public.crm_import_rows
for each row execute function public.set_updated_at();

alter table public.crm_imports enable row level security;
alter table public.crm_import_rows enable row level security;
revoke all on table public.crm_imports, public.crm_import_rows from anon, authenticated;
