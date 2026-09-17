-- Standardize the private PurposeOS native asset ceiling at 25 MiB while
-- preserving the existing bucket identity, MIME allowlist, and metadata rules.

update storage.buckets
set file_size_limit = 26214400,
    public = false
where id = 'purposeos-assets';

alter table public.resources
  drop constraint if exists resources_file_size_bytes_check;

alter table public.resources
  add constraint resources_file_size_bytes_check
    check (file_size_bytes is null or file_size_bytes between 1 and 26214400);

comment on column public.resources.file_size_bytes is
  'Uploaded object size, limited to 25 MiB for supported native PurposeOS assets.';
