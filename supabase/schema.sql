-- Run this schema in a new Supabase project's SQL editor.
create extension if not exists pgcrypto;

create type public.account_role as enum ('seeker','employer','provider','admin');
create type public.review_status as enum ('draft','pending','published','rejected','closed');
create type public.opportunity_kind as enum ('job','internship','training');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.account_role not null default 'seeker',
  county text,
  phone text,
  education_level text,
  skills text[] not null default '{}',
  experience text,
  interests text[] not null default '{}',
  account_status text not null default 'active' check(account_status in ('active','suspended')),
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  organization_type text not null check (organization_type in ('employer','training_provider')),
  description text not null default '',
  industry text,
  county text,
  website text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verification_notes text,
  created_at timestamptz not null default now()
);

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  document_name text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  organization_name text not null,
  kind public.opportunity_kind not null,
  title text not null,
  description text not null,
  county text not null default 'Kenya',
  category text not null default 'General',
  employment_type text,
  education_level text,
  experience_level text,
  salary_min numeric,
  salary_max numeric,
  currency text not null default 'KES',
  application_method text not null default 'external' check (application_method in ('internal','external')),
  application_url text,
  registration_method text check (registration_method in ('internal','external')),
  registration_url text,
  duration text,
  course_cost numeric,
  source_name text,
  source_url text,
  is_verified boolean not null default false,
  status public.review_status not null default 'pending',
  published_at timestamptz,
  closing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((application_method <> 'external') or application_url is not null),
  check ((kind <> 'training') or registration_method is not null)
);
create unique index opportunities_source_unique on public.opportunities(source_url) where source_url is not null;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  storage_path text not null unique,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null references public.documents(id),
  status text not null default 'submitted' check (status in ('submitted','under_review','shortlisted','interview','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  unique(opportunity_id,seeker_id)
);

create table public.training_registrations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered','under_review','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  unique(opportunity_id,seeker_id)
);

create table public.saved_opportunities (
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,opportunity_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table public.career_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null,
  excerpt text not null,
  body text not null,
  status public.review_status not null default 'published',
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),case when new.raw_user_meta_data->>'role' in ('employer','provider') then (new.raw_user_meta_data->>'role')::public.account_role else 'seeker'::public.account_role end);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create function public.guard_organization_write() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op='INSERT' then
    if not exists(select 1 from public.profiles p where p.id=auth.uid() and ((p.role='employer' and new.organization_type='employer') or (p.role='provider' and new.organization_type='training_provider'))) then raise exception 'Organization type does not match account role'; end if;
    new.verification_status:='pending';
  else
    if new.owner_id <> old.owner_id or new.verification_status <> old.verification_status or new.verification_notes is distinct from old.verification_notes then raise exception 'Only administrators can change verification decisions'; end if;
    new.verification_status:='pending';
  end if;
  return new;
end $$;
create trigger guard_organization before insert or update on public.organizations for each row execute procedure public.guard_organization_write();

create function public.guard_opportunity_write() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op='INSERT' then
    if not exists(select 1 from public.organizations o where o.id=new.organization_id and o.owner_id=auth.uid() and ((o.organization_type='employer' and new.kind in ('job','internship')) or (o.organization_type='training_provider' and new.kind='training'))) then raise exception 'Opportunity type does not match organization'; end if;
  else
    if new.is_verified <> old.is_verified then raise exception 'Only administrators can verify a listing'; end if;
    if new.status='closed' and old.status='published' then return new; end if;
    new.status:='pending';
  end if;
  new.status:='pending';
  new.is_verified:=false;
  return new;
end $$;
create trigger guard_opportunity before insert or update on public.opportunities for each row execute procedure public.guard_opportunity_write();
create function public.guard_profile_role() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null and not public.is_admin() and new.role is distinct from old.role then raise exception 'Account role cannot be changed here'; end if;
  return new;
end $$;
create trigger guard_profile_role before update on public.profiles for each row execute procedure public.guard_profile_role();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.verification_documents enable row level security;
alter table public.opportunities enable row level security;
alter table public.documents enable row level security;
alter table public.applications enable row level security;
alter table public.training_registrations enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.career_resources enable row level security;
alter table public.audit_events enable row level security;

create policy "Public reads own profile" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "Employer reads applicants" on public.profiles for select using (exists(select 1 from public.applications a join public.opportunities j on j.id=a.opportunity_id join public.organizations o on o.id=j.organization_id where a.seeker_id=profiles.id and o.owner_id=auth.uid()));
create policy "Provider reads registrants" on public.profiles for select using (exists(select 1 from public.training_registrations r join public.opportunities j on j.id=r.opportunity_id join public.organizations o on o.id=j.organization_id where r.seeker_id=profiles.id and o.owner_id=auth.uid()));
create policy "User updates own profile" on public.profiles for update using (id=auth.uid() and role <> 'admin' and account_status='active') with check (id=auth.uid() and role <> 'admin' and account_status='active');
create policy "Admin manages profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published opportunities" on public.opportunities for select using (status='published' or public.is_admin() or exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "Organization owners create opportunities" on public.opportunities for insert with check (exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "Organization owners update opportunities" on public.opportunities for update using (exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid()) or public.is_admin()) with check (exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid()) or public.is_admin());
create policy "Organizations readable" on public.organizations for select using (verification_status='verified' or owner_id=auth.uid() or public.is_admin());
create policy "Owners create organization" on public.organizations for insert with check (owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and ((p.role='employer' and organization_type='employer') or (p.role='provider' and organization_type='training_provider'))));
create policy "Owners update organization" on public.organizations for update using (owner_id=auth.uid() or public.is_admin()) with check (owner_id=auth.uid() or public.is_admin());
create policy "Owner and admin view verification evidence" on public.verification_documents for select using (public.is_admin() or exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "Organization owner adds verification evidence" on public.verification_documents for insert with check (uploaded_by=auth.uid() and exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "Owner and admin delete verification evidence" on public.verification_documents for delete using (public.is_admin() or exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "Owner reads private documents" on public.documents for select using (owner_id=auth.uid() or public.is_admin() or exists(select 1 from public.applications a where a.document_id=documents.id and exists(select 1 from public.opportunities j join public.organizations o on o.id=j.organization_id where j.id=a.opportunity_id and o.owner_id=auth.uid())));
create policy "Owner inserts documents" on public.documents for insert with check (owner_id=auth.uid());
create policy "Owner deletes documents" on public.documents for delete using (owner_id=auth.uid() or public.is_admin());
create policy "Owner updates documents" on public.documents for update using (owner_id=auth.uid() or public.is_admin()) with check (owner_id=auth.uid() or public.is_admin());
create policy "Seeker and listing owner read applications" on public.applications for select using (seeker_id=auth.uid() or public.is_admin() or exists(select 1 from public.opportunities j join public.organizations o on o.id=j.organization_id where j.id=opportunity_id and o.owner_id=auth.uid()));
create policy "Seeker submits application" on public.applications for insert with check (seeker_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='seeker') and exists(select 1 from public.opportunities j where j.id=opportunity_id and j.status='published' and j.kind in ('job','internship') and j.application_method='internal') and exists(select 1 from public.documents d where d.id=document_id and d.owner_id=auth.uid()));
create policy "Seeker withdraws application" on public.applications for update using (seeker_id=auth.uid()) with check (seeker_id=auth.uid() and status='withdrawn');
create policy "Listing owner updates application status" on public.applications for update using (public.is_admin() or exists(select 1 from public.opportunities j join public.organizations o on o.id=j.organization_id where j.id=opportunity_id and o.owner_id=auth.uid()));
create policy "Seeker and provider read registrations" on public.training_registrations for select using (seeker_id=auth.uid() or public.is_admin() or exists(select 1 from public.opportunities j join public.organizations o on o.id=j.organization_id where j.id=opportunity_id and o.owner_id=auth.uid()));
create policy "Seeker registers for internal training" on public.training_registrations for insert with check (seeker_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='seeker') and exists(select 1 from public.opportunities j where j.id=opportunity_id and j.kind='training' and j.status='published' and j.registration_method='internal'));
create policy "Seeker or provider updates registration" on public.training_registrations for update using (seeker_id=auth.uid() or public.is_admin() or exists(select 1 from public.opportunities j join public.organizations o on o.id=j.organization_id where j.id=opportunity_id and o.owner_id=auth.uid())) with check (public.is_admin() or exists(select 1 from public.opportunities j join public.organizations o on o.id=j.organization_id where j.id=opportunity_id and o.owner_id=auth.uid()) or (seeker_id=auth.uid() and status='withdrawn'));
create policy "Seeker deletes registration" on public.training_registrations for delete using (seeker_id=auth.uid() or public.is_admin());
create policy "Users manage saved opportunities" on public.saved_opportunities for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Users read notifications" on public.notifications for select using (user_id=auth.uid() or public.is_admin());
create policy "Users and listing owners create notifications" on public.notifications for insert with check (user_id=auth.uid() or public.is_admin() or exists(select 1 from public.applications a join public.opportunities j on j.id=a.opportunity_id join public.organizations o on o.id=j.organization_id where a.seeker_id=user_id and o.owner_id=auth.uid()) or exists(select 1 from public.training_registrations r join public.opportunities j on j.id=r.opportunity_id join public.organizations o on o.id=j.organization_id where r.seeker_id=user_id and o.owner_id=auth.uid()));
create policy "Users update notifications" on public.notifications for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Public reads published resources" on public.career_resources for select using (status='published' or public.is_admin());
create policy "Admin manages resources" on public.career_resources for all using (public.is_admin()) with check (public.is_admin());
create policy "Public creates report" on public.reports for insert with check (reporter_id is null or reporter_id=auth.uid());
create policy "Admin manages reports" on public.reports for all using (public.is_admin()) with check (public.is_admin());
create policy "Audit visible to admins" on public.audit_events for select using (public.is_admin());
create policy "Admins add audit events" on public.audit_events for insert with check (public.is_admin());

-- Private CV bucket. Files use {user-id}/{uuid}-{filename}; keep signed links short lived.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('private-cvs','private-cvs',false,10485760,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('private-verification','private-verification',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
create policy "CV owner manages own folder" on storage.objects for all using (bucket_id='private-cvs' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='private-cvs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Employers can read CVs attached to their applications" on storage.objects for select using (bucket_id='private-cvs' and exists(select 1 from public.documents d join public.applications a on a.document_id=d.id join public.opportunities j on j.id=a.opportunity_id join public.organizations o on o.id=j.organization_id where d.storage_path=name and o.owner_id=auth.uid()));
create policy "Organization owner uploads verification files" on storage.objects for insert with check (bucket_id='private-verification' and exists(select 1 from public.organizations o where o.id::text=(storage.foldername(name))[1] and o.owner_id=auth.uid()));
create policy "Owner and admin read verification files" on storage.objects for select using (bucket_id='private-verification' and (public.is_admin() or exists(select 1 from public.organizations o where o.id::text=(storage.foldername(name))[1] and o.owner_id=auth.uid())));
create policy "Owner and admin delete verification files" on storage.objects for delete using (bucket_id='private-verification' and (public.is_admin() or exists(select 1 from public.organizations o where o.id::text=(storage.foldername(name))[1] and o.owner_id=auth.uid())));

-- Source-attributed, currently open records checked 12 Nov 2026. These are external listings,
-- not KaziConnect-verified organizations. Re-check the publisher before each presentation.
insert into public.opportunities(organization_name,kind,title,description,county,category,employment_type,education_level,experience_level,application_method,application_url,registration_method,registration_url,source_name,source_url,is_verified,status,published_at,closing_at)
values
('Woodnork Green','job','Transport Coordinator','Coordinate transport schedules, drivers, deliveries, fleet records, vehicle maintenance and safety compliance. The publisher lists a diploma or degree in transport, logistics, supply chain, business administration or a related field, a valid driving licence, and at least three years of relevant experience. See the source listing for full requirements and email application instructions.','Nairobi','Transport & Logistics','Full time','Diploma / Degree','3+ years','external','https://www.jobsconnect.co.ke/jobs?jobId=cmwbn6bc916k7nux480yctn42',null,null,'Job Connect Kenya','https://www.jobsconnect.co.ke/jobs?jobId=cmwbn6bc916k7nux480yctn42',false,'published',now(),'2026-12-09'),
('Hellena''s Kitchen','job','Executive Head Chef','Two positions are listed. The publisher requests a culinary, food production or hospitality qualification and extensive senior kitchen experience, alongside menu development, food safety, team leadership and cost-control skills. See the source listing for full requirements and application details.','Nairobi','Hospitality','Full time','Diploma / Degree','Senior','external','https://www.jobsconnect.co.ke/jobs?jobId=cmw0vx5gq4gjcmzirz7vgp2gm',null,null,'Job Connect Kenya','https://www.jobsconnect.co.ke/jobs?jobId=cmw0vx5gq4gjcmzirz7vgp2gm',false,'published',now(),'2026-12-08'),
('SNV Netherlands Development Organization','job','Project Driver — Marsabit','Provide safe and professional driving support for SNV staff, visitors and consultants travelling to project sites. The source describes fieldwork, logistics, vehicle care and operational support responsibilities. Review the publisher page for complete requirements and application instructions.','Marsabit','Transport & Logistics','Full time','See source','See source','external','https://www.jobsconnect.co.ke/jobs?jobId=cmw8tdpg90033nu6ftdrz1wfz',null,null,'Job Connect Kenya','https://www.jobsconnect.co.ke/jobs?jobId=cmw8tdpg90033nu6ftdrz1wfz',false,'published',now(),'2026-12-07'),
('Diageo','internship','Internship Program — Food Science & Engineering (Mechanical)','Internship opportunity in food science and engineering. Review the publisher page for the eligibility criteria, responsibilities and application instructions. The listing page reported an application deadline of 18 November 2026 when checked.','Nairobi','Food Science & Engineering','Internship','See source','Entry level','external','https://www.jobsconnect.co.ke/jobs?jobId=cmw2lvk330077nu5xwy8uvp5a',null,null,'Job Connect Kenya','https://www.jobsconnect.co.ke/jobs?jobId=cmw2lvk330077nu5xwy8uvp5a',false,'published',now(),'2026-11-18'),
('ICT Authority — Smart Academy','training','Digital Skills & ICT Literacy Programs','Kenya ICT Authority learning pathways cover digital workspace skills, digital ethics, cybersecurity, data skills, digital marketing, online commerce, web design and programming. Programs include free public training and subsidised certificate pathways; check the official portal for current availability and eligibility.','Online · Kenya','Digital Skills','Self-paced / live','See provider','All levels','internal',null,'external','https://www.smartacademy.go.ke/','ICT Authority Smart Academy','https://www.smartacademy.go.ke/',false,'published',now(),null)
on conflict do nothing;

insert into public.career_resources(title,slug,category,excerpt,body,status) values
('Build a CV that is easy to scan','cv-checklist','CV & applications','A simple structure for making your experience, skills and achievements clear to a busy recruiter.','Start with your name and reliable contact details. Add a short profile tied to the role you want. List education and experience in reverse chronological order. For each role or project, describe what you did and what changed as a result. Use specific verbs and concrete examples instead of unsupported claims. Include relevant skills and training, check spelling, and keep layout readable on a phone. Tailor the first half of the CV to the requirements in each vacancy. Ask someone you trust to review the final copy.','published'),
('Prepare for an interview with a clear story','interview-prep','Interview preparation','A practical routine for showing how your experience relates to the role.','Read the role description and identify three requirements. Prepare a short example for each: explain the situation, your responsibility, the action you took, and the result. Research the organization using its official site and the job source. Practise speaking your examples aloud without memorising a script. Prepare two thoughtful questions about the work and expectations. Confirm the time, location or video link, transport plan, and contact person. Never pay to attend an interview or receive a job offer.','published'),
('A steady weekly job-search routine','job-search','Job search','A manageable routine for targeting relevant openings and keeping track of applications.','Choose a small set of roles that match your skills and direction. Review each listing’s source, deadline and instructions before applying. Keep a simple record of the organization, role, application date, link, CV version and follow-up date. Set aside time to learn or practise one skill related to your target roles. After an interview, note what went well and what you want to improve. Take breaks and ask a trusted person for support when the process feels overwhelming.','published')
on conflict(slug) do nothing;
