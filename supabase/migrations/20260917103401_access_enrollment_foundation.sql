-- PurposeOS access and enrollment foundation.
-- Catalog visibility remains in experiences.visibility. Admission policy is a
-- separate concern, with an optional per-offering override. Enrollments record
-- the reason the canonical participant-to-training relationship was created.

alter table public.experiences
  add column admission_policy text not null default 'admin_assigned'
  constraint experiences_admission_policy_check check (
    admission_policy in ('admin_assigned', 'open_enrollment')
  );

comment on column public.experiences.admission_policy is
  'Default admission policy for this Experience. Catalog visibility is stored separately in visibility.';

alter table public.experience_offerings
  add column admission_policy text
  constraint experience_offerings_admission_policy_check check (
    admission_policy is null or admission_policy in ('admin_assigned', 'open_enrollment')
  );

comment on column public.experience_offerings.admission_policy is
  'Optional admission-policy override for this delivery Offering; null inherits the Experience default.';

alter table public.experience_enrollments
  add column source_type text not null default 'legacy'
  constraint experience_enrollments_source_type_check check (
    source_type in (
      'legacy',
      'admin',
      'self',
      'invitation',
      'approval',
      'offering',
      'cohort',
      'hub',
      'entitlement',
      'purchase',
      'scholarship',
      'comp',
      'organization'
    )
  ),
  add column source_id uuid,
  add column offering_id uuid references public.experience_offerings(id) on delete set null;

comment on column public.experience_enrollments.source_type is
  'Why the canonical enrollment exists. Legacy identifies rows created before provenance tracking.';
comment on column public.experience_enrollments.source_id is
  'Optional identifier for the qualifying source record; interpreted according to source_type.';
comment on column public.experience_enrollments.offering_id is
  'Optional delivery Offering associated with this enrollment.';

create index experience_enrollments_offering_idx
  on public.experience_enrollments (offering_id)
  where offering_id is not null;
