import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BriefcaseBusiness, CheckCircle2, GraduationCap, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Opportunity = { id: string; title: string; organization_name: string; county: string; category: string; employment_type: string; source_url: string | null; source_name: string | null; is_verified: boolean; created_at: string; kind: string };

async function getOpportunities(): Promise<Opportunity[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("opportunities").select("id,title,organization_name,county,category,employment_type,source_url,source_name,is_verified,created_at,kind").eq("status", "published").or(`closing_at.is.null,closing_at.gte.${new Date().toISOString()}`).order("created_at", { ascending: false }).limit(4);
  return (data ?? []) as Opportunity[];
}

export default async function Home() {
  const opportunities = await getOpportunities();
  return <main>
    <div className="announcement"><span className="pulse"/> A better way to find your next step <span className="announce-arrow">↗</span></div>
    <header className="nav wrap">
      <Link className="brand" href="/"><span className="brand-mark">k.</span><span>kazi<span className="brand-light">connect</span></span></Link>
      <nav className="nav-links"><Link href="/jobs">Find a job</Link><Link href="/internships">Internships</Link><Link href="/training">Learn</Link><Link href="/guidance">Career guide</Link></nav>
      <div className="nav-actions"><Link className="login-link" href="/login">Log in</Link><Link className="button button-dark button-small" href="/register">Get started <ArrowUpRight size={15}/></Link></div>
      <details className="mobile-menu"><summary aria-label="Open menu">☰</summary><div className="mobile-menu-links"><Link href="/jobs">Find a job</Link><Link href="/internships">Internships</Link><Link href="/training">Learn</Link><Link href="/guidance">Career guide</Link><Link href="/login">Log in</Link><Link href="/register">Create account ↗</Link></div></details>
    </header>

    <section className="hero wrap">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line"/> YOUR NEXT CHAPTER STARTS HERE</div>
        <h1>Find work that<br/>moves you <span className="serif-accent">forward.</span></h1>
        <p className="hero-sub">Real opportunities. Practical skills. A clearer path to the career you want — right here in Kenya.</p>
        <form className="search-box" action="/jobs">
          <Search size={19}/><input name="q" placeholder="Role, skill or company" aria-label="Search jobs"/><span className="search-divider"/><MapPin size={18}/><select name="county" aria-label="County"><option value="">All Kenya</option><option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Nakuru</option><option>Uasin Gishu</option></select><button aria-label="Search"><ArrowRight size={19}/></button>
        </form>
        <div className="popular"><span>Popular:</span><Link href="/jobs?q=graduate">Graduate roles</Link><Link href="/internships">Attachment</Link><Link href="/training">Digital skills</Link></div>
        <div className="hero-proof"><div className="avatar-stack"><span>W</span><span>A</span><span>M</span><span>+</span></div><p><b>Made for Kenya.</b> Built around your ambitions.</p></div>
      </div>
      <div className="hero-art">
        <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
        <div className="art-sun"/>
        <div className="art-card card-main"><div className="card-top"><span className="tiny-label">YOUR NEXT MOVE</span><span className="card-dots">···</span></div><div className="card-role-icon"><BriefcaseBusiness size={20}/></div><h3>Meaningful work<br/>is closer than you think.</h3><div className="art-chart"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="chart-label"><span>YOUR POTENTIAL</span><b>↑ Always growing</b></div></div>
        <div className="float-card float-verified"><span className="verified-icon"><ShieldCheck size={17}/></span><span><b>Trust comes first</b><small>Reviewed opportunities</small></span><CheckCircle2 size={16} className="check-green"/></div>
        <div className="float-card float-learn"><span className="learn-icon"><GraduationCap size={18}/></span><span><b>Keep growing</b><small>Skills for what’s next</small></span><ArrowUpRight size={15}/></div>
        <span className="art-spark spark-a">✳</span><span className="art-spark spark-b">✳</span><span className="art-caption">NAIROBI · KENYA</span>
      </div>
    </section>

    <section className="trust-strip"><div className="wrap trust-inner"><span className="trust-caption">A platform for every kind of ambition</span><div className="trust-pill"><span>01</span> Find work</div><div className="trust-pill"><span>02</span> Build skills</div><div className="trust-pill"><span>03</span> Grow your future</div><div className="trust-note"><ShieldCheck size={16}/> Opportunities reviewed with care</div></div></section>

    <section className="section wrap opportunity-section"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> MADE FOR YOUR NEXT MOVE</div><h2>Opportunities worth<br/><span className="serif-accent">showing up for.</span></h2></div><Link className="text-link" href="/jobs">Explore all opportunities <ArrowUpRight size={16}/></Link></div>
      <div className="opportunity-grid">{opportunities.length ? opportunities.map((job, i) => <article className="job-card" key={job.id}><div className="job-card-top"><div className={`company-avatar company-${i % 4}`}>{job.organization_name.slice(0,1)}</div><span className="job-kind">{job.kind === "internship" ? "INTERNSHIP" : job.kind === "training" ? "TRAINING" : "FULL TIME"}</span></div><h3>{job.title}</h3><p className="company-name">{job.organization_name}</p><div className="job-meta"><span><MapPin size={14}/>{job.county}</span><span>{job.category}</span></div><div className="job-card-foot"><span>{job.is_verified ? <><ShieldCheck size={14}/> Verified organization</> : "Source linked"}</span><Link href={`/opportunities/${job.id}`} aria-label={`View ${job.title}`}><ArrowUpRight size={17}/></Link></div></article>) : <div className="empty-opportunities"><Sparkles size={19}/><div><b>Opportunity listings are being connected.</b><p>Live listings will appear here with their source and application link.</p></div><Link href="/jobs">Browse opportunities <ArrowRight size={15}/></Link></div>}</div>
      <div className="source-note">Listings link to their original source. Always confirm details and closing dates before applying.</div>
    </section>

    <section className="path-section"><div className="wrap"><div className="section-heading path-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> MORE THAN A JOB SEARCH</div><h2>Wherever you’re headed,<br/><span className="serif-accent">start here.</span></h2></div><p>From your first attachment to your next big move, find the support and opportunity to get there.</p></div><div className="path-grid"><Link href="/jobs" className="path-card path-jobs"><span className="path-index">01 / FIND WORK</span><span className="path-icon"><BriefcaseBusiness size={23}/></span><h3>Work that<br/>fits your life.</h3><p>Explore openings from organizations looking for someone like you.</p><span className="path-link">Explore jobs <ArrowUpRight size={16}/></span><div className="path-decoration">↗</div></Link><Link href="/internships" className="path-card path-internships"><span className="path-index">02 / GET EXPERIENCE</span><span className="path-icon"><Sparkles size={23}/></span><h3>Your first step<br/>starts now.</h3><p>Find internships and attachments built for learning as you go.</p><span className="path-link">Find an internship <ArrowUpRight size={16}/></span><div className="path-decoration">✳</div></Link><Link href="/training" className="path-card path-training"><span className="path-index">03 / BUILD SKILLS</span><span className="path-icon"><GraduationCap size={23}/></span><h3>Learn something<br/>that opens doors.</h3><p>Discover training that helps you grow into your next opportunity.</p><span className="path-link">Explore training <ArrowUpRight size={16}/></span><div className="path-decoration">⌁</div></Link></div></div></section>

    <section className="trust-feature wrap"><div className="trust-graphic"><div className="trust-big">Good work<br/>starts with<br/><span>good trust.</span></div><div className="trust-seal"><ShieldCheck size={27}/><span>TRUST<br/>MATTERS</span></div><div className="trust-graphic-line"/></div><div className="trust-copy"><div className="eyebrow"><span className="eyebrow-line"/> YOUR SAFETY MATTERS</div><h2>Know what you’re<br/>applying <span className="serif-accent">for.</span></h2><p>We make it clear where each opportunity comes from, how to apply, and what we know about its source. No hidden steps. No guessing.</p><ul><li><CheckCircle2 size={17}/> Source links you can check yourself</li><li><CheckCircle2 size={17}/> Clear application instructions</li><li><CheckCircle2 size={17}/> A simple way to report a concern</li></ul><Link href="/trust-safety" className="text-link">How we build trust <ArrowUpRight size={16}/></Link></div></section>

    <section className="guidance-section"><div className="wrap guidance-inner"><div><div className="eyebrow"><span className="eyebrow-line"/> SMALL STEPS, BIG MOMENTUM</div><h2>A little guidance<br/>goes a <span className="serif-accent">long way.</span></h2><p>Practical advice to help you feel ready for what comes next.</p><Link href="/guidance" className="button button-light">Visit the career guide <ArrowUpRight size={16}/></Link></div><div className="guide-visual"><div className="guide-paper"><span className="guide-label">THE KAZI GUIDE&nbsp; / &nbsp;01</span><div className="guide-line long"/><div className="guide-line medium"/><div className="guide-highlight">Your experience is<br/>more than a job title.</div><div className="guide-line long"/><div className="guide-line short"/><div className="guide-stamp">START<br/>WHERE<br/>YOU ARE</div></div><div className="guide-star">✳</div></div></div></section>

    <footer className="footer"><div className="wrap"><div className="footer-main"><div className="footer-brand"><Link className="brand brand-footer" href="/"><span className="brand-mark">k.</span><span>kazi<span className="brand-light">connect</span></span></Link><p>Opportunity, made more accessible.<br/>Built for the ambition in every corner<br/>of Kenya.</p></div><div className="footer-col"><b>Explore</b><Link href="/jobs">Find a job</Link><Link href="/internships">Internships</Link><Link href="/training">Skills & training</Link><Link href="/guidance">Career guide</Link></div><div className="footer-col"><b>Your KaziConnect</b><Link href="/register">Create an account</Link><Link href="/employers/register">For employers</Link><Link href="/providers/register">For training providers</Link><Link href="/login">Log in</Link></div><div className="footer-col"><b>We’re here to help</b><Link href="/about">About us</Link><Link href="/trust-safety">Trust & safety</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></div></div><div className="footer-bottom"><span>© 2026 KaziConnect. Made with purpose in Kenya.</span><span>OPPORTUNITY HAS NO ONE ADDRESS <ArrowDownRight size={14}/></span></div></div></footer>
  </main>;
}
