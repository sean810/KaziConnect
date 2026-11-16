# KaziConnect

A database-backed Kenyan jobs, internships, training, and career guidance platform. The interface follows the approved KaziConnect visual direction and uses Job Connect Kenya as a product reference for location-led opportunity discovery and career guidance.

## Stack

- Next.js 15 / React 19 / TypeScript
- Tailwind CSS, with a project-specific KaziConnect component and color system
- Supabase Auth, PostgreSQL, row-level security, and private Storage
- Vercel deployment for the school presentation; Supabase hosts the persistent data and CV files

## Local setup

1. Install Node.js 20 or later.
2. Create a Supabase project. In its SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) for a new project. If the original schema was already installed, run [`supabase/upgrade_v2.sql`](supabase/upgrade_v2.sql) next; it is additive and preserves current data.
3. In Supabase Auth, enable email/password. Add the local and deployed origins and their `/auth/callback` paths to the allowed redirect URLs.
4. To enable Google sign-in, configure Google as a Supabase Auth provider with a Google OAuth client. In Google Cloud, use the Supabase project's OAuth callback (`https://<project-ref>.supabase.co/auth/v1/callback`) as the authorized redirect URI. Add local and deployed app origins to Supabase's redirect allow list. The app button reports a clear setup message until this is configured.
5. Copy [`.env.example`](.env.example) to `.env.local`, then set the Supabase URL and anon key. For deployed daily maintenance, also set `SUPABASE_SERVICE_ROLE_KEY` and a long random `CRON_SECRET` in Vercel only. These are server secrets: never use a `NEXT_PUBLIC_` name or commit their values.
6. Install and run:

   ```sh
   npm install
   npm run dev
   ```

7. Open `http://localhost:3000`.

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
2. Import that repository into Vercel and add the public Supabase URL/key and the server-only maintenance secrets in Project Settings.
3. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin (for example, `https://your-project.vercel.app`).
4. Add the Vercel origin and `${NEXT_PUBLIC_SITE_URL}/auth/callback` to Supabase Auth’s allowed redirect URLs, then redeploy.
5. Promote a separate account to admin using the SQL above. Set up the Google OAuth provider if it is needed for the presentation. Apply `upgrade_v2.sql` before using the upgraded pages. Verify the full flows using the checklist below.

Vercel Hobby is a zero-cost option for the non-commercial school presentation, with usage caps. Vercel states that Hobby is for personal, non-commercial use; a public commercial launch would need an eligible plan. Supabase Free currently includes Postgres/Auth/storage quotas, but inactive free projects can pause after one week, so check project status before the presentation. Review each provider’s current plan terms before a wider launch.

## Demonstration content

The base seed records are real third-party opportunities checked on 12 November 2026 and link to their listing pages on Job Connect Kenya. Listings are external and not automatically KaziConnect-verified. Refresh their status and source before a presentation or application. Career guidance articles are original KaziConnect editorial content stored in PostgreSQL. Future records should use real listings with a current source URL and must not be marked as fictional or KaziConnect verified unless they meet the relevant criteria.

The upgrade adds an admin source registry and CSV intake for up to 500 listings per import. Imported rows are deduplicated by source URL, marked as externally sourced and queued for moderation. Only import records you are authorized to distribute; the tool does not scrape websites or create job data. Add current listings through an authorized employer feed, partner, or manual source process to grow the inventory. A public JSON feed at `/api/opportunities/feed` lets other authorized channels consume published KaziConnect listings. A daily Vercel cron closes listings past their closing/source-expiry date and sends due follow-up reminders; configure the two server secrets above.

Sources used for initial listings:

- [Transport Coordinator — Woodnork Green](https://www.jobsconnect.co.ke/jobs?jobId=cmwbn6bc916k7nux480yctn42)
- [Executive Head Chef — Hellena’s Kitchen](https://www.jobsconnect.co.ke/jobs?jobId=cmw0vx5gq4gjcmzirz7vgp2gm)
- [Project Driver — Marsabit — SNV](https://www.jobsconnect.co.ke/jobs?jobId=cmw8tdpg90033nu6ftdrz1wfz)
- [Diageo Food Science & Engineering internship](https://www.jobsconnect.co.ke/jobs?jobId=cmw2lvk330077nu5xwy8uvp5a)
- [ICT Authority Smart Academy](https://www.smartacademy.go.ke/)

## Core workflow checklist

- Guest: browse jobs, internships and training; search by keyword and county; inspect a listing and its source; open the external apply/registration destination.
- Seeker: browse as a guest; set role/county/work-mode preferences; view ranked matches; opt in or out of the verified-employer talent pool; build and print multiple CV drafts; upload private CV documents; save/apply/register; track external applications and follow-ups; track learning progress; and read in-platform notifications.
- Employer: register separately, maintain an employer profile, submit jobs/internships for moderation, share published listings through the platform feed, review applicants, access an attached CV through a short-lived link, update application status, search opt-in candidates once verified, shortlist candidates, and invite recruiter/viewer teammates with expiring shareable links.
- Training provider: register separately, maintain a provider profile, submit training listings, review registrations, update registration status, and invite teammates.
- Admin: review organizations and listings, register authorized sources, import current external listing data, inspect source freshness, review reports, manage guidance articles, and inspect the user directory and audit trail.

## Notes

- External applications and registrations open the attributed listing/provider page. External job applications can be manually tracked in KaziConnect; this does not submit or verify an application with the employer.
- CVs are in a private bucket and use short-lived signed download URLs. Keep all secrets out of source control.
- CV builder drafts are private database records; print/Save as PDF uses the browser's print dialog. Uploaded CVs remain private in Supabase Storage.
- Match ranking uses profile/preferences and listing text; it is rule-based and explainable, not an AI guarantee. In-platform notifications are persisted in PostgreSQL. Email notifications are not included.
- Opportunity supply depends on authorized real listing sources. The importer and source lifecycle are implemented, but hundreds of current records require actual licensed/partner/manual source data and routine refresh.
- Before a real public launch, complete privacy and retention policies, incident handling, production monitoring, verified evidence procedures, backups, and the applicable Kenyan compliance review.
