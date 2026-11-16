-- KaziConnect MVP upgrade: additive changes for matching, career paths,
-- external application tracking, candidate discovery, and source operations.
-- Apply after schema.sql. Safe to re-run.

alter table public.profiles
  add column if not exists preferred_roles text[] not null default '{}',
  add column if not exists preferred_counties text[] not null default '{}',
  add column if not exists preferred_work_modes text[] not null default '{}',
  add column if not exists years_experience integer,
  add column if not exists open_to_work boolean not null default false,
  add column if not exists talent_pool_opt_in boolean not null default false,
  add column if not exists profile_headline text,
  add column if not exists profile_summary text,
  add column if not exists profile_visibility text not null default 'private'
    check (profile_visibility in ('private','employers'));

alter table public.opportunities
  add column if not exists work_mode text not null default 'onsite'
    check (work_mode in ('onsite','hybrid','remote')),
  add column if not exists source_checked_at timestamptz,
  add column if not exists source_expires_at timestamptz,
  add column if not exists is_demo_data boolean not null default false,
  add column if not exists distribution_url text;

create table if not exists public.external_application_tracker (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status text not null default 'interested'
    check(status in ('interested','started','submitted','interview','offer','rejected','withdrawn')),
  applied_at timestamptz,
  follow_up_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(seeker_id, opportunity_id)
);
alter table public.external_application_tracker
  add column if not exists reminder_notified_at timestamptz;

create table if not exists public.cv_builder_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'My CV',
  content jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid references public.career_resources(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  status text not null default 'planned' check(status in ('planned','in_progress','completed')),
  goal text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (num_nonnulls(resource_id,opportunity_id)=1),
  unique(seeker_id, resource_id),
  unique(seeker_id, opportunity_id)
);

create table if not exists public.candidate_shortlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid not null references public.profiles(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique(organization_id,candidate_id)
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'recruiter' check(member_role in ('owner','recruiter','viewer')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(organization_id,user_id)
);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_name text not null,
  account_role text not null check(account_role in ('employer','provider')),
  invited_email text not null,
  member_role text not null default 'recruiter' check(member_role in ('recruiter','viewer')),
  invite_token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now()+interval '14 days'),
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check(source_type in ('employer','feed','partner','manual')),
  source_url text,
  terms_url text,
  active boolean not null default true,
  last_checked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  reason text not null default 'Matches your preferences',
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  unique(user_id,opportunity_id)
);

create index if not exists opportunities_published_kind_idx on public.opportunities(kind,status,closing_at);
create index if not exists opportunities_county_mode_idx on public.opportunities(county,work_mode);
create index if not exists profiles_talent_search_idx on public.profiles(role,talent_pool_opt_in,open_to_work);
create index if not exists external_tracker_seeker_idx on public.external_application_tracker(seeker_id,updated_at desc);

alter table public.external_application_tracker enable row level security;
alter table public.cv_builder_versions enable row level security;
alter table public.learning_progress enable row level security;
alter table public.candidate_shortlists enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.listing_sources enable row level security;
alter table public.opportunity_alerts enable row level security;

drop policy if exists "Owner manages external tracker" on public.external_application_tracker;
create policy "Owner manages external tracker" on public.external_application_tracker
  for all using (seeker_id=auth.uid() or public.is_admin())
  with check (public.is_admin() or (seeker_id=auth.uid()
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='seeker')
    and exists(select 1 from public.opportunities op where op.id=opportunity_id and op.kind in ('job','internship') and op.application_method='external' and op.status='published')));

drop policy if exists "Owner manages CV builder versions" on public.cv_builder_versions;
create policy "Owner manages CV builder versions" on public.cv_builder_versions
  for all using (owner_id=auth.uid() or public.is_admin())
  with check (public.is_admin() or (owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='seeker')));

drop policy if exists "Owner manages learning progress" on public.learning_progress;
create policy "Owner manages learning progress" on public.learning_progress
  for all using (seeker_id=auth.uid() or public.is_admin())
  with check (public.is_admin() or (seeker_id=auth.uid()
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='seeker')
    and ((resource_id is not null and exists(select 1 from public.career_resources r where r.id=resource_id and r.status='published'))
      or (opportunity_id is not null and exists(select 1 from public.opportunities op where op.id=opportunity_id and op.kind='training' and op.status='published')))));

drop policy if exists "Candidate manages their pool preference" on public.profiles;
-- Talent pool exposes only the deliberately selected, non-contact fields below.
drop policy if exists "Verified organizations discover opted-in candidates" on public.profiles;
create or replace view public.talent_profiles with (security_barrier=true) as
  select p.id,p.full_name,p.county,p.education_level,p.skills,p.experience,
    p.profile_headline,p.profile_summary,p.preferred_roles,p.years_experience
  from public.profiles p
  where p.role='seeker' and p.talent_pool_opt_in=true and p.open_to_work=true
    and exists(select 1 from public.organizations org
      where (org.owner_id=auth.uid() or exists(select 1 from public.organization_members m where m.organization_id=org.id and m.user_id=auth.uid() and m.member_role in ('owner','recruiter')))
        and org.verification_status='verified' and org.organization_type='employer');
grant select on public.talent_profiles to authenticated;

drop policy if exists "Organization members read their team" on public.organization_members;
create policy "Organization members read their team" on public.organization_members
  for select using (user_id=auth.uid() or exists(select 1 from public.organizations org
    where org.id=organization_id and org.owner_id=auth.uid()) or public.is_admin());
drop policy if exists "Organization owners manage their team" on public.organization_members;
create policy "Organization owners manage their team" on public.organization_members
  for all using (exists(select 1 from public.organizations org where org.id=organization_id and org.owner_id=auth.uid()) or public.is_admin())
  with check (exists(select 1 from public.organizations org where org.id=organization_id and org.owner_id=auth.uid()) or public.is_admin());

create or replace function public.can_manage_organization(target_org uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organizations org where org.id=target_org and org.owner_id=auth.uid())
    or exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=auth.uid() and m.member_role in ('owner','recruiter'));
$$;
create or replace function public.can_view_organization(target_org uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select public.can_manage_organization(target_org)
    or exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=auth.uid());
$$;

drop policy if exists "Team reads shared organization profile" on public.organizations;
create policy "Team reads shared organization profile" on public.organizations for select using (public.can_view_organization(id));
drop policy if exists "Team reads listings" on public.opportunities;
create policy "Team reads listings" on public.opportunities for select using (public.can_view_organization(organization_id));
drop policy if exists "Team creates listings" on public.opportunities;
create policy "Team creates listings" on public.opportunities for insert with check (public.can_manage_organization(organization_id));
drop policy if exists "Team updates listings" on public.opportunities;
create policy "Team updates listings" on public.opportunities for update using (public.can_manage_organization(organization_id)) with check (public.can_manage_organization(organization_id));
drop policy if exists "Team reads applicant profiles" on public.profiles;
create policy "Team reads applicant profiles" on public.profiles for select using (
  exists(select 1 from public.applications a join public.opportunities op on op.id=a.opportunity_id
    where a.seeker_id=profiles.id and public.can_view_organization(op.organization_id)));
drop policy if exists "Team reads applications" on public.applications;
create policy "Team reads applications" on public.applications for select using (
  exists(select 1 from public.opportunities op where op.id=opportunity_id and public.can_view_organization(op.organization_id)));
drop policy if exists "Recruiters update applications" on public.applications;
create policy "Recruiters update applications" on public.applications for update using (
  exists(select 1 from public.opportunities op where op.id=opportunity_id and public.can_manage_organization(op.organization_id)))
  with check (exists(select 1 from public.opportunities op where op.id=opportunity_id and public.can_manage_organization(op.organization_id)));
drop policy if exists "Team reads training registrations" on public.training_registrations;
create policy "Team reads training registrations" on public.training_registrations for select using (
  exists(select 1 from public.opportunities op where op.id=opportunity_id and public.can_view_organization(op.organization_id)));
drop policy if exists "Team updates training registrations" on public.training_registrations;
create policy "Team updates training registrations" on public.training_registrations for update using (
  exists(select 1 from public.opportunities op where op.id=opportunity_id and public.can_manage_organization(op.organization_id)))
  with check (exists(select 1 from public.opportunities op where op.id=opportunity_id and public.can_manage_organization(op.organization_id)));
drop policy if exists "Team reads application documents" on public.documents;
create policy "Team reads application documents" on public.documents for select using (
  exists(select 1 from public.applications a join public.opportunities op on op.id=a.opportunity_id
    where a.document_id=documents.id and public.can_view_organization(op.organization_id)));
drop policy if exists "Team reads applicant CV objects" on storage.objects;
create policy "Team reads applicant CV objects" on storage.objects for select using (
  bucket_id='private-cvs' and exists(select 1 from public.documents d join public.applications a on a.document_id=d.id join public.opportunities op on op.id=a.opportunity_id
    where d.storage_path=objects.name and public.can_view_organization(op.organization_id)));

drop policy if exists "Owners manage organization invites" on public.organization_invitations;
create policy "Owners manage organization invites" on public.organization_invitations for all using (
  exists(select 1 from public.organizations org where org.id=organization_id and org.owner_id=auth.uid()) or public.is_admin())
  with check (exists(select 1 from public.organizations org where org.id=organization_id and org.owner_id=auth.uid()) or public.is_admin());
drop policy if exists "Invitee reads their invitation" on public.organization_invitations;
create policy "Invitee reads their invitation" on public.organization_invitations for select using (
  lower(invited_email)=lower(coalesce(auth.jwt()->>'email','')) and accepted_at is null and expires_at>now());
drop policy if exists "Invitee accepts their invitation" on public.organization_invitations;
create policy "Invitee accepts their invitation" on public.organization_invitations for update using (
  lower(invited_email)=lower(coalesce(auth.jwt()->>'email','')) and accepted_at is null and expires_at>now())
  with check (lower(invited_email)=lower(coalesce(auth.jwt()->>'email','')) and accepted_by=auth.uid() and accepted_at is not null);
drop policy if exists "Organization owners read teammate profiles" on public.profiles;
create policy "Organization owners read teammate profiles" on public.profiles for select using (
  exists(select 1 from public.organization_members m join public.organizations org on org.id=m.organization_id
    where m.user_id=profiles.id and org.owner_id=auth.uid()));
drop policy if exists "Invitees join invited organization" on public.organization_members;
create policy "Invitees join invited organization" on public.organization_members for insert with check (
  user_id=auth.uid() and exists(select 1 from public.organization_invitations inv where inv.organization_id=organization_members.organization_id
    and lower(inv.invited_email)=lower(coalesce(auth.jwt()->>'email','')) and inv.accepted_at is null and inv.expires_at>now() and inv.member_role=organization_members.member_role));

-- Existing guard is owner-only. Extend it to recruiter members while preserving moderation.
create or replace function public.guard_opportunity_write() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if not public.can_manage_organization(new.organization_id) then raise exception 'You are not permitted to manage this organization'; end if;
  if tg_op='INSERT' then
    if not exists(select 1 from public.organizations o where o.id=new.organization_id and ((o.organization_type='employer' and new.kind in ('job','internship')) or (o.organization_type='training_provider' and new.kind='training'))) then raise exception 'Opportunity type does not match organization'; end if;
  else
    if new.is_verified <> old.is_verified then raise exception 'Only administrators can verify a listing'; end if;
    if new.status='closed' and old.status='published' then return new; end if;
  end if;
  new.status:='pending';
  new.is_verified:=false;
  return new;
end $$;

drop policy if exists "Verified organizations manage their shortlists" on public.candidate_shortlists;
create policy "Verified organizations manage their shortlists" on public.candidate_shortlists for all using (
  public.is_admin() or (public.can_manage_organization(organization_id) and exists(select 1 from public.organizations org where org.id=organization_id and org.verification_status='verified' and org.organization_type='employer')))
  with check (added_by=auth.uid() and public.can_manage_organization(organization_id) and exists(select 1 from public.organizations org where org.id=organization_id and org.verification_status='verified' and org.organization_type='employer') and exists(select 1 from public.profiles candidate where candidate.id=candidate_id and candidate.talent_pool_opt_in=true and candidate.open_to_work=true));

drop policy if exists "Organization manages its shortlist" on public.candidate_shortlists;
create policy "Organization manages its shortlist" on public.candidate_shortlists
  for all using (public.is_admin() or exists(select 1 from public.organizations org where org.id=organization_id and org.owner_id=auth.uid() and org.verification_status='verified'))
  with check (added_by=auth.uid() and exists(select 1 from public.organizations org where org.id=organization_id and org.owner_id=auth.uid() and org.verification_status='verified') and exists(select 1 from public.profiles candidate where candidate.id=candidate_id and candidate.talent_pool_opt_in=true and candidate.open_to_work=true));

drop policy if exists "Admin manages listing sources" on public.listing_sources;
create policy "Admin manages listing sources" on public.listing_sources for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Public reads active source names" on public.listing_sources;
create policy "Public reads active source names" on public.listing_sources for select using (active=true);

drop policy if exists "Users read own opportunity alerts" on public.opportunity_alerts;
create policy "Users read own opportunity alerts" on public.opportunity_alerts for select using (user_id=auth.uid() or public.is_admin());
drop policy if exists "Users update own opportunity alerts" on public.opportunity_alerts;
create policy "Users update own opportunity alerts" on public.opportunity_alerts for update using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "Admins create opportunity alerts" on public.opportunity_alerts;
create policy "Users and admins create opportunity alerts" on public.opportunity_alerts for insert with check (public.is_admin() or (user_id=auth.uid() and exists(select 1 from public.opportunities op where op.id=opportunity_id and op.status='published')));

-- Profile owners retain profile updates; only the user may change these consent fields.
-- Seed/demo records can be explicitly identified without representing them as real.
