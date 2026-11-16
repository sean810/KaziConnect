import {redirect} from "next/navigation";
import {headers} from "next/headers";
import {createClient} from "@/lib/supabase/server";
import {inviteOrganizationMemberAction} from "@/app/actions";

type Params={organization_id?:string;"invite-link"?:string;to?:string;error?:string;message?:string};
export default async function Team({searchParams}:{searchParams:Promise<Params>}){
 const q=await searchParams;const db=await createClient();if(!db)redirect("/login");
 const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:p}=await db.from("profiles").select("role").eq("id",user.id).single();
 if(!p||!["employer","provider"].includes(p.role))redirect("/dashboard");
 const [{data:owned},{data:memberRows}]=await Promise.all([
  db.from("organizations").select("id,name,organization_type").eq("owner_id",user.id),
  db.from("organization_members").select("organization_id,member_role,organizations(id,name,organization_type)").eq("user_id",user.id)
 ]);
 const orgs=[...(owned??[]).map((o:any)=>({...o,member_role:"owner",is_owner:true})),...(memberRows??[]).map((m:any)=>{const linked=Array.isArray(m.organizations)?m.organizations[0]:m.organizations;return {...linked,id:m.organization_id,member_role:m.member_role,is_owner:false}})];
 const selected=orgs.find((o:any)=>o.id===q.organization_id)??orgs[0];
 if(!selected)redirect("/dashboard/organization?error=organization-required");
 const isOwner=!!selected.is_owner;
 const [{data:members},{data:invites}]=isOwner?await Promise.all([
  db.from("organization_members").select("id,user_id,member_role,created_at,profiles(full_name)").eq("organization_id",selected.id).order("created_at"),
  db.from("organization_invitations").select("id,invited_email,member_role,expires_at,accepted_at").eq("organization_id",selected.id).order("created_at",{ascending:false})
 ]):[{data:[]},{data:[]}];
 const h=await headers();const configured=process.env.NEXT_PUBLIC_SITE_URL;const host=h.get("x-forwarded-host")??h.get("host")??"localhost:3000";const origin=configured??`${h.get("x-forwarded-proto")??(host.startsWith("localhost")?"http":"https")}://${host}`;const inviteUrl=q["invite-link"]?`${origin}/dashboard/team/accept?token=${q["invite-link"]}`:"";
 return <main className="wrap"><section className="page-header"><div className="eyebrow"><span className="eyebrow-line"/> ORGANIZATION COLLABORATION</div><h1>Work together on KaziConnect.</h1><p>Invite recruiters and viewers to share listings, applicant pipelines, and talent shortlists. Recruiters can manage jobs and applicants; viewers can review shared records.</p></section>
  {orgs.length>1&&<form method="get" className="content-panel org-select-bar"><label>Organization workspace<select name="organization_id" defaultValue={selected.id}>{orgs.map((o:any)=><option key={o.id} value={o.id}>{o.name} · {o.member_role}</option>)}</select></label><button className="button button-outline">Open workspace</button></form>}
  {q.error&&<div className="notice error-notice">{decodeURIComponent(q.error)}</div>}{q.message==="invite-accepted"&&<div className="notice success-notice">Invitation accepted. You now have access to the organization workspace.</div>}
  {isOwner?<div className="team-grid"><section className="content-panel"><h2>Invite a teammate to {selected.name}</h2><p className="source-label">The teammate must use a KaziConnect {p.role} account with the invited email. Share the invitation link after it is created; links expire in 14 days.</p><form action={inviteOrganizationMemberAction}><input type="hidden" name="organization_id" value={selected.id}/><label>Email address<input name="email" type="email" required autoComplete="off"/></label><label>Access level<select name="member_role"><option value="recruiter">Recruiter · manage listings and applicants</option><option value="viewer">Viewer · read shared workspace</option></select></label><button className="button button-dark">Create invitation ↗</button></form>{inviteUrl&&<div className="notice success-notice"><b>Invitation ready for {q.to}</b><input readOnly value={inviteUrl} onFocus={e=>e.currentTarget.select()}/><p>Share this link directly. KaziConnect does not send email yet.</p></div>}</section><section className="content-panel"><h2>Team members</h2>{members?.length?members.map((m:any)=><article className="listing-row" key={m.id}><div className="listing-row-main"><h3>{m.profiles?.full_name||"Team member"}</h3><p>{m.member_role}</p></div></article>):<p className="source-label">No accepted teammates yet.</p>}<h3 className="path-subhead">Pending invitations</h3>{invites?.filter((i:any)=>!i.accepted_at).length?invites.filter((i:any)=>!i.accepted_at).map((i:any)=><article className="listing-row" key={i.id}><div className="listing-row-main"><h3>{i.invited_email}</h3><p>{i.member_role} · expires {new Date(i.expires_at).toLocaleDateString("en-KE")}</p></div></article>):<p className="source-label">No pending invitations.</p>}</section></div>:<section className="content-panel"><h2>{selected.name}</h2><p>You are a {selected.member_role}. Shared listings and applicant activity are available in the workspace. Only the owner manages membership.</p><a className="text-link" href={`/dashboard/manage?organization_id=${selected.id}`}>Open this organization’s listings ↗</a></section>}
 </main>;
}
