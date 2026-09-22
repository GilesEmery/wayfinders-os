begin;

select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'valid-admin@example.com', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wrong-person@example.com', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'expired-admin@example.com', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'revoked-admin@example.com', '', now(), now(), now());

insert into public.admin_members (id, email, email_normalized, auth_user_id, role, status, invitation_issued_at, invitation_expires_at, invitation_revoked_at)
values
  ('20000000-0000-0000-0000-000000000001', 'valid-admin@example.com', 'valid-admin@example.com', '10000000-0000-0000-0000-000000000001', 'admin', 'invited', now() - interval '5 minutes', now() + interval '55 minutes', null),
  ('20000000-0000-0000-0000-000000000002', 'expired-admin@example.com', 'expired-admin@example.com', '10000000-0000-0000-0000-000000000003', 'admin', 'invited', now() - interval '2 hours', now() - interval '1 hour', null),
  ('20000000-0000-0000-0000-000000000003', 'revoked-admin@example.com', 'revoked-admin@example.com', '10000000-0000-0000-0000-000000000004', 'admin', 'invited', now() - interval '5 minutes', now() + interval '55 minutes', now());

select throws_ok(
  $$ select * from public.activate_admin_invitation('99999999-0000-0000-0000-000000000999', 'unknown@example.com') $$,
  'P0001', 'admin_invitation_not_found',
  'an unknown identity cannot claim admin access'
);

select throws_ok(
  $$ select * from public.activate_admin_invitation('10000000-0000-0000-0000-000000000002', 'valid-admin@example.com') $$,
  'P0001', 'admin_invitation_not_found',
  'knowing an invited email without the bound Auth identity is insufficient'
);

select throws_ok(
  $$ select * from public.activate_admin_invitation('10000000-0000-0000-0000-000000000001', 'wrong-email@example.com') $$,
  'P0001', 'admin_invitation_identity_mismatch',
  'the verified Auth email must match the invitation'
);

select throws_ok(
  $$ select * from public.activate_admin_invitation('10000000-0000-0000-0000-000000000003', 'expired-admin@example.com') $$,
  'P0001', 'admin_invitation_expired',
  'an expired invitation cannot be activated'
);

select throws_ok(
  $$ select * from public.activate_admin_invitation('10000000-0000-0000-0000-000000000004', 'revoked-admin@example.com') $$,
  'P0001', 'admin_invitation_revoked',
  'a revoked invitation cannot be activated'
);

select results_eq(
  $$ select activated_role from public.activate_admin_invitation('10000000-0000-0000-0000-000000000001', 'valid-admin@example.com') $$,
  $$ values ('admin'::text) $$,
  'a valid invitation activates exactly its intended role'
);

select is((select status from public.admin_members where id = '20000000-0000-0000-0000-000000000001'), 'active', 'the valid member becomes active');
select is((select count(*)::integer from public.admin_audit_log where action = 'admin_invitation_activated' and entity_id = '20000000-0000-0000-0000-000000000001'), 1, 'activation writes exactly one audit event');

select throws_ok(
  $$ select * from public.activate_admin_invitation('10000000-0000-0000-0000-000000000001', 'valid-admin@example.com') $$,
  'P0001', 'admin_invitation_already_used',
  'an invitation cannot be reused or won by a concurrent second attempt'
);

select is((select count(*)::integer from public.admin_members where auth_user_id = '10000000-0000-0000-0000-000000000001' and status = 'active'), 1, 'only one active administrative identity exists after competing claims');

select * from finish();
rollback;
