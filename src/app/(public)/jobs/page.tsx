import Link from "next/link";
import { headers } from "next/headers";
import { ArrowUpRight, MapPin, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { searchCareerjet } from "@/lib/careerjet";
import { CareerjetResults } from "@/components/careerjet-results";

type Props = { searchParams: Promise<{ q?: string; county?: string; category?: string; work_mode?: string; cj_page?: string }> };

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const supabase = await createClient();
  let query = supabase?.from("opportunities").select("id,title,organization_name,county,category,employment_type,kind,work_mode,source_name,source_url,is_verified,is_demo_data,closing_at,description").eq("status", "published").in("kind", ["job", "internship"]).order("created_at", { ascending: false });
  const term = (params.q ?? "").replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 120);
  const now = new Date().toISOString();
  if (term) {
    const match = `or(title.ilike.%${term}%,organization_name.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%)`;
    query = query?.or(`and(closing_at.is.null,${match}),and(closing_at.gte.${now},${match})`);
  } else query = query?.or(`closing_at.is.null,closing_at.gte.${now}`);
  if (params.county) query = query?.eq("county", params.county);
  if (params.category === "job" || params.category === "internship") query = query?.eq("kind", params.category);
  if (["onsite", "hybrid", "remote"].includes(params.work_mode ?? "")) query = query?.eq("work_mode", params.work_mode);
  const { data } = query ? await query : { data: [] };
  const items = data ?? [];
  const live = await searchCareerjet({
    headers: requestHeaders,
    keywords: term,
    location: params.county,
    kind: params.category === "internship" ? "internship" : params.category === "job" ? "job" : "all",
    workMode: params.work_mode,
    page: Number(params.cj_page ?? 1),
    refererPath: "/jobs",
  });
  const normalized = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const liveListings = {
    ...live,
    items: live.items.filter((job) => !items.some((item: any) => normalized(item.title) === normalized(job.title) && normalized(item.organization_name) === normalized(job.company))),
  };
  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.county) next.set("county", params.county);
    if (params.category) next.set("category", params.category);
    if (params.work_mode) next.set("work_mode", params.work_mode);
    next.set("cj_page", String(page));
    return `/jobs?${next.toString()}`;
  };

  return <main className="wrap">
    <section className="page-header"><div className="eyebrow"><span className="eyebrow-line"/> FIND YOUR NEXT MOVE</div><h1>Work worth getting up for.</h1><p>Explore job openings across Kenya. Listings show their source, work arrangement, verification status, and clear instructions for what to do next.</p></section>
    <section className="page-grid">
      <form className="filter-panel"><h3>Find your fit</h3><label>Keywords<input name="q" defaultValue={params.q} placeholder="Role or company"/></label><label>County<select name="county" defaultValue={params.county??""}><option value="">All Kenya</option>{["Nairobi","Mombasa","Kisumu","Nakuru","Uasin Gishu","Kiambu","Machakos","Kakamega","Meru"].map(x=><option key={x}>{x}</option>)}</select></label><label>Opportunity type<select name="category" defaultValue={params.category??""}><option value="">Jobs & internships</option><option value="job">Jobs</option><option value="internship">Internships</option></select></label><label>Work arrangement<select name="work_mode" defaultValue={params.work_mode??""}><option value="">Any arrangement</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></label><button className="button button-dark" type="submit"><Search size={15}/> Search listings</button></form>
      <div className="jobs-results-column">
        <div className="content-panel"><div className="source-label">{items.length} KaziConnect listing{items.length===1?"":"s"} · Source links included</div>{items.length?items.map((item:any)=><article className="listing-row" key={item.id}><div className="company-avatar">{item.organization_name?.slice(0,1)}</div><div className="listing-row-main"><h3>{item.title}</h3><p>{item.organization_name}</p><div className="listing-row-meta"><span><MapPin size={12}/>{item.county}</span><span>{item.kind}</span><span>{item.work_mode}</span><span>{item.category}</span></div><div className="source-label" style={{marginTop:8}}>{item.is_verified&&<><ShieldCheck size={12}/> Verified organization · </>}{item.source_name?<>Listed via {item.source_name}</>:"Original source"}{item.is_demo_data&&<> · Fictional sample</>}{item.source_url&&<> · <a href={item.source_url} target="_blank" rel="noreferrer">View source ↗</a></>}</div></div><Link className="button button-dark" href={`/opportunities/${item.id}`}>View role <ArrowUpRight size={14}/></Link></article>):<div className="empty-state"><Search size={23}/><p>No KaziConnect listings match those filters.</p><span>See the live Careerjet results below or try a different search.</span></div>}</div>
        <CareerjetResults results={liveListings} pageHref={pageHref}/>
      </div>
    </section>
  </main>;
}
