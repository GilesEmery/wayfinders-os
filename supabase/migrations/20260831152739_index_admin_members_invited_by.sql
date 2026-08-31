create index admin_members_invited_by_idx on public.admin_members (invited_by)
where invited_by is not null;
