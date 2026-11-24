import Link from "next/link";
import { ArrowUpRight, MapPin, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { searchJSearch } from "@/lib/jsearch";
import { JSearchResults } from "@/components/jsearch-results";

type Props = { searchParams: Promise<{ q?: string; county?: string }> };

export const dynamic = "force-dynamic";

export default async function InternshipsPage({ searchParams }: Props) {
  const params = await searchParams;
  const db = await createClient();
  const term = (params.q ?? "").replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 120);
  let query = db?.from("opportunities").select("id,title,organization_name,county,category,duration,source_name,source_url,closing_at,description").eq("status", "published").eq("kind", "internship").or(`closing_at.is.null,closing_at.gte.${new Date().toISOString()}`).order("created_at", { ascending: false });
  if (term) query = query?.or(`and(closing_at.is.null,or(title.ilike.%${term}%,organization_name.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%)),and(closing_at.gte.${new Date().toISOString()},or(title.ilike.%${term}%,organization_name.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%))`);
  if (params.county) query = query?.eq("county", params.county);
  const { data } = query ? await query : { data: [] };
  const live = await searchJSearch({ keywords: term, location: params.county, kind: "internship" });
  const normalized = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const liveListings = { ...live, items: live.items.filter((job) => !(data ?? []).some((item: any) => normalized(item.title) === normalized(job.title) && normalized(item.organization_name) === normalized(job.company))) };
  return <main className="wrap">
    <section className="page-header"><div className="eyebrow"><span className="eyebrow-line"/> GET EXPERIENCE</div><h1>Your first step starts here.</h1><p>Internships, attachments, and graduate opportunities to help you learn by doing.</p></section>
    <form className="internship-search content-panel"><label>Keywords<input name="q" defaultValue={params.q} placeholder="Role, skill or company"/></label><label>County<select name="county" defaultValue={params.county??""}><option value="">All Kenya</option>{["Nairobi","Mombasa","Kisumu","Nakuru","Uasin Gishu","Kiambu","Machakos","Kakamega","Meru"].map(x=><option key={x}>{x}</option>)}</select></label><button className="button button-dark"><Search size={15}/> Search internships</button></form>
    <section className="jobs-results-column internship-results">
      <div className="content-panel" style={{marginBottom:20}}><div className="source-label">{data?.length??0} KaziConnect internship{data?.length===1?"":"s"} · Source links included</div>{data?.length?data.map((x:any)=><article className="listing-row" key={x.id}><div className="company-avatar">{x.organization_name.slice(0,1)}</div><div className="listing-row-main"><h3>{x.title}</h3><p>{x.organization_name}</p><div className="listing-row-meta"><span><MapPin size={12}/>{x.county}</span>{x.duration&&<span>{x.duration}</span>}</div><span className="source-label">{x.source_name} {x.source_url&&<>· <a href={x.source_url} target="_blank" rel="noreferrer">View source listing ↗</a></>}</span></div><Link className="button button-dark" href={`/opportunities/${x.id}`}>Details <ArrowUpRight size={14}/></Link></article>):<div className="empty-state">No KaziConnect internships match those filters. See the live JSearch results below or try another search.</div>}</div>
      <JSearchResults results={liveListings}/>
    </section>
  </main>;
}
