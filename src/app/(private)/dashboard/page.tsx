import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BriefcaseBusiness, Building2, FileText, GraduationCap, LayoutDashboard, ListChecks, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions";

const navFor = (role: string) => role === "admin"
  ? [["Overview","/dashboard",LayoutDashboard], ["Organizations","/dashboard/organizations",Building2], ["Listings & moderation","/dashboard/manage",ShieldCheck], ["Users","/dashboard/users",Users], ["Reports","/dashboard/reports",ListChecks], ["Content","/dashboard/content",FileText], ["Notifications","/dashboard/notifications",Bell]]
  : role === "employer"
  ? [["Overview","/dashboard",LayoutDashboard], ["My listings","/dashboard/manage",BriefcaseBusiness], ["Applicants","/dashboard/applications",Users], ["Organization","/dashboard/organization",Building2], ["Notifications","/dashboard/notifications",Bell]]
  : role === "provider"
  ? [["Overview","/dashboard",LayoutDashboard], ["Training listings","/dashboard/manage",GraduationCap], ["Registrations","/dashboard/training",Users], ["Provider profile","/dashboard/organization",Building2], ["Notifications","/dashboard/notifications",Bell]]
  : [["Overview","/dashboard",LayoutDashboard], ["My profile","/dashboard/profile",Users], ["My applications","/dashboard/applications",ListChecks], ["Training registrations","/dashboard/training",GraduationCap], ["Saved opportunities","/dashboard/saved",BriefcaseBusiness], ["CVs & documents","/dashboard/cvs",FileText], ["Notifications","/dashboard/notifications",Bell]];

export default async function Dashboard() {
  const db = await createClient();
  if (!db) redirect("/login?error=configuration");
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.account_status === "suspended") redirect("/login?error=account-suspended");
  const name = profile.full_name || user.email || "Welcome";
  const links = navFor(profile.role);
  let stats: any = {};
  let items: any[] = [];
  if (profile.role === "seeker") {
    const { data } = await db.from("applications").select("id,status,created_at,opportunities(title,organization_name)").eq("seeker_id", user.id).order("created_at", { ascending: false }).limit(5);
    items = data ?? [];
    const training = await db.from("training_registrations").select("id", { count: "exact", head: true }).eq("seeker_id", user.id);
    const saved = await db.from("saved_opportunities").select("opportunity_id", { count: "exact", head: true }).eq("user_id", user.id);
    stats = { apps: items.length, training: training.count ?? 0, saved: saved.count ?? 0 };
  } else if (profile.role === "employer" || profile.role === "provider") {
    const { data: orgs } = await db.from("organizations").select("id,name,verification_status").eq("owner_id", user.id);
    stats.orgs = orgs ?? [];
    const ids = (orgs ?? []).map((o: any) => o.id);
    const result = ids.length ? await db.from("opportunities").select("id,title,status,kind,created_at").in("organization_id", ids).order("created_at", { ascending: false }) : { data: [] };
    items = result.data ?? [];
    stats.pending = items.filter((i: any) => i.status === "pending").length;
    stats.live = items.filter((i: any) => i.status === "published").length;
  } else {
    const { data } = await db.from("opportunities").select("id,title,status,kind,created_at").order("created_at", { ascending: false }).limit(8);
    items = data ?? [];
    const orgs = await db.from("organizations").select("id", { count: "exact", head: true }).eq("verification_status", "pending");
    const reports = await db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open");
    const pending = await db.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "pending");
    stats = { orgs: orgs.count ?? 0, reports: reports.count ?? 0, pending: pending.count ?? 0 };
  }
  return <>
    <header className="nav wrap"><Link className="brand" href="/"><span className="brand-mark">k.</span><span>kazi<span className="brand-light">connect</span></span></Link><span className="topbar-user">{name}<form action={signOutAction}><button>Log out</button></form></span></header>
    <main className="wrap dashboard-layout"><nav className="dash-nav">{links.map(([label, href, Icon]: any) => <Link key={href} href={href}><Icon size={15}/>{label}</Link>)}</nav>
      <section className="dashboard-content"><div className="eyebrow"><span className="eyebrow-line"/> YOUR KAZICONNECT</div><h1>Hello, {name.split(" ")[0]}.</h1><p>{profile.role === "seeker" ? "Your next opportunity is a few good steps away." : profile.role === "admin" ? "Keep the opportunity marketplace safe and useful." : "Here’s what’s happening with your organization."}</p>
        <div className="dashboard-cards">{profile.role === "seeker" ? <><div className="dashboard-card"><span>Applications</span><strong>{stats.apps}</strong><small>recently submitted</small></div><div className="dashboard-card"><span>Training</span><strong>{stats.training}</strong><small>registrations of interest</small></div><div className="dashboard-card"><span>Saved</span><strong>{stats.saved}</strong><small>opportunities</small></div></> : profile.role === "admin" ? <><div className="dashboard-card"><span>Organizations to review</span><strong>{stats.orgs}</strong><small>verification queue</small></div><div className="dashboard-card"><span>Listings to review</span><strong>{stats.pending}</strong><small>moderation queue</small></div><div className="dashboard-card"><span>Open reports</span><strong>{stats.reports}</strong><small>user-submitted</small></div></> : <><div className="dashboard-card"><span>Live listings</span><strong>{stats.live}</strong><small>visible to job seekers</small></div><div className="dashboard-card"><span>Awaiting review</span><strong>{stats.pending}</strong><small>submitted for moderation</small></div><div className="dashboard-card"><span>Organization</span><strong>{stats.orgs?.[0]?.verification_status ?? "—"}</strong><small>{stats.orgs?.[0]?.name ?? "Set up your profile"}</small></div></>}</div>
        <div className="content-panel"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3>{profile.role === "seeker" ? "Recent applications" : profile.role === "admin" ? "Recent listings" : "Your latest listings"}</h3>{profile.role === "seeker" && <Link href="/jobs" className="text-link">Find opportunities ↗</Link>}{(profile.role === "employer" || profile.role === "provider") && <Link href="/dashboard/manage" className="text-link">Manage ↗</Link>}</div>{items.length ? items.map((x: any) => <div className="listing-row" key={x.id}><div className="listing-row-main"><h3>{x.opportunities?.title ?? x.title}</h3><p>{x.opportunities?.organization_name ?? x.kind}</p></div><span className="status">{x.status?.replace("_", " ")}</span><span className="source-label">{new Date(x.created_at).toLocaleDateString("en-KE")}</span></div>) : <div className="empty-state">No records yet. Explore an opportunity or publish a listing to get started.</div>}</div>
      </section></main>
  </>;
}
