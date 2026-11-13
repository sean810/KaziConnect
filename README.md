# KaziConnect

A database-backed Kenyan jobs, internships, training, and career guidance platform. The interface follows the approved KaziConnect visual direction and uses Job Connect Kenya as a product reference for location-led opportunity discovery and career guidance.

## Stack

- Next.js 15 / React 19 / TypeScript
- Tailwind CSS, with a project-specific KaziConnect component and color system
- Supabase Auth, PostgreSQL, row-level security, and private Storage
- Vercel deployment for the school presentation; Supabase hosts the persistent data and CV files

## Local setup

1. Install Node.js 20 or later.
2. Create a Supabase project. In its SQL Editor, run the full [`supabase/schema.sql`](supabase/schema.sql) file. It creates tables, role and ownership policies, a private CV bucket, career resources, and a small set of current, source-attributed listings.
3. In Supabase project settings, enable email/password sign-in. For the school presentation, you may turn off email confirmation to simplify account creation, or keep it enabled and add your deployed URL plus `http://localhost:3000/auth/callback` to the allowed redirect URLs.
4. Copy [`.env.example`](.env.example) to `.env.local`, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase Project API settings. Do not put a Supabase service-role key in this app or in a `NEXT_PUBLIC_` variable.
5. Install and run:

   ```sh
   npm install
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Create the first administrator

Public registration cannot create an administrator. First register an account, then use the Supabase SQL Editor to promote that account by its email:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email = 'YOUR_ADMIN_EMAIL';
```

This is an administrative setup action. Never add an admin role selector to public registration.

## Deploy for the presentation

1. Push the project to a private or public Git repository you control.
2. Import that repository into Vercel and add the two Supabase environment variables in Project Settings.
3. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin (for example, `https://your-project.vercel.app`).
4. Add the Vercel origin and `${NEXT_PUBLIC_SITE_URL}/auth/callback` to Supabase Auth’s allowed redirect URLs, then redeploy.
5. Create a seeker, employer, and training-provider account. Promote a separate account to admin using the SQL above. Verify the full flows using the checklist below.

Vercel Hobby is a zero-cost option for the non-commercial school presentation, with usage caps. Vercel states that Hobby is for personal, non-commercial use; a public commercial launch would need an eligible plan. Supabase Free currently includes Postgres/Auth/storage quotas, but inactive free projects can pause after one week, so check project status before the presentation. Review each provider’s current plan terms before a wider launch.

## Demonstration content

The seed records in the SQL file are real third-party opportunities checked on 12 November 2026 and link to their listing pages on Job Connect Kenya. Job Connect says its listings may be aggregated from other sources, so treat it as the attribution/source page and follow its current application instructions. These opportunities are externally sourced, not verified by KaziConnect. Listings and deadlines can change; re-check each source before presenting or applying. The training entry links to ICT Authority Smart Academy. Career guidance articles are original KaziConnect editorial content stored in PostgreSQL.

Sources used for initial listings:

- [Transport Coordinator — Woodnork Green](https://www.jobsconnect.co.ke/jobs?jobId=cmwbn6bc916k7nux480yctn42)
- [Executive Head Chef — Hellena’s Kitchen](https://www.jobsconnect.co.ke/jobs?jobId=cmw0vx5gq4gjcmzirz7vgp2gm)
- [Project Driver — Marsabit — SNV](https://www.jobsconnect.co.ke/jobs?jobId=cmw8tdpg90033nu6ftdrz1wfz)
- [Diageo Food Science & Engineering internship](https://www.jobsconnect.co.ke/jobs?jobId=cmw2lvk330077nu5xwy8uvp5a)
- [ICT Authority Smart Academy](https://www.smartacademy.go.ke/)

## Core workflow checklist

- Guest: browse jobs, internships and training; search by keyword and county; inspect a listing and its source; open the external apply/registration destination.
- Seeker: register, update profile, upload multiple private CV versions, download/delete/set default, save an opportunity, select a CV for an internal application, track application/training status, and read notifications.
- Employer: register separately, maintain an employer profile, submit a job/internship for moderation, view applicants, access an attached CV through a short-lived link, and update application status.
- Training provider: register separately, maintain a provider profile, submit a training listing, review registrations, and update registration status.
- Admin: review organizations, publish/reject listings, review reports, manage guidance articles, and inspect the user directory and audit trail.

## Notes

- External applications and registrations open the attributed listing/provider page; for aggregated job records, follow the employer’s current application instructions there. KaziConnect does not claim to track external submissions.
- CVs are in a private bucket and use short-lived signed download URLs. Keep all secrets out of source control.
- In-platform notifications are persisted in PostgreSQL. Email notifications are not part of this MVP.
- Before a real public launch, complete privacy and retention policies, incident handling, production monitoring, verified evidence procedures, backups, and the applicable Kenyan compliance review.
