-- Private, server-mediated course assets. The application creates immutable
-- objects and issues short-lived signed URLs only after its existing Course
-- authorization checks pass. No anon/authenticated Storage policies are added.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'purposeos-assets',
  'purposeos-assets',
  false,
  4194304,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/csv',
    'application/rtf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.resources
  add column original_filename text null,
  add column mime_type text null,
  add column file_size_bytes bigint null,
  add constraint resources_original_filename_check
    check (original_filename is null or char_length(pg_catalog.btrim(original_filename)) between 1 and 255),
  add constraint resources_mime_type_check
    check (mime_type is null or (char_length(mime_type) between 3 and 160 and mime_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$')),
  add constraint resources_file_size_bytes_check
    check (file_size_bytes is null or file_size_bytes between 1 and 4194304),
  add constraint resources_storage_metadata_check
    check (
      (storage_bucket is null and storage_path is null and original_filename is null and mime_type is null and file_size_bytes is null)
      or
      (storage_bucket is not null and storage_path is not null and original_filename is not null and mime_type is not null and file_size_bytes is not null)
    );

comment on column public.resources.original_filename is 'Display-only original upload filename; never used as a trusted object path.';
comment on column public.resources.mime_type is 'Server-validated MIME type for an immutable uploaded object.';
comment on column public.resources.file_size_bytes is 'Uploaded object size, limited to 4 MiB for the initial server-action upload foundation.';

create index resources_storage_location_idx
  on public.resources (storage_bucket, storage_path)
  where storage_bucket is not null and storage_path is not null;
