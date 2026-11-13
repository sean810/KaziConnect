import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data: { user } = { user: null } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  return <header className="nav wrap"><Link className="brand" href="/"><span className="brand-mark">k.</span><span>kazi<span className="brand-light">connect</span></span></Link><nav className="nav-links"><Link href="/jobs">Find a job</Link><Link href="/internships">Internships</Link><Link href="/training">Learn</Link><Link href="/guidance">Career guide</Link></nav><div className="nav-actions">{user ? <Link className="button button-dark button-small" href="/dashboard">My dashboard ↗</Link> : <><Link className="login-link" href="/login">Log in</Link><Link className="button button-dark button-small" href="/register">Get started ↗</Link></>}</div><details className="mobile-menu"><summary aria-label="Open menu">☰</summary><div className="mobile-menu-links"><Link href="/jobs">Find a job</Link><Link href="/internships">Internships</Link><Link href="/training">Learn</Link><Link href="/guidance">Career guide</Link>{user?<Link href="/dashboard">My dashboard</Link>:<><Link href="/login">Log in</Link><Link href="/register">Create account</Link></>}</div></details></header>;
}
