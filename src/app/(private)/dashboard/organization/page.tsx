import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {updateOrganizationAction} from "@/app/actions";
import {VerificationManager} from "@/components/verification-manager";

export default async function OrganizationPage({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}){
  const p=await searchParams;const db=await createClient();if(!db)redirect("/login");
  const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
  const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).single();
  if(!profile||!["employer","provider"].includes(profile.role))redirect("/dashboard");
  const {data:org}=await db.from("organizations").select("*").eq("owner_id",user.id).limit(1).maybeSingle();
  const {data:evidence}=org?await db.from("verification_documents").select("id,document_name,storage_path,created_at").eq("organization_id",org.id).order("created_at",{ascending:false}):{data:[]};
  return <main className="wrap"><section className="page-header"><div className="eyebrow"><span className="eyebrow-line"/> ORGANIZATION PROFILE</div><h1>Your organization.</h1><p>Keep the public profile accurate and give administrators evidence for verification review.</p></section>
    <form className="form-card" style={{maxWidth:700,marginBottom:25}} action={updateOrganizationAction}>
      {p.error&&<div className="notice error-notice">{p.error==="organization-required"?"Please add your organization details.":decodeURIComponent(p.error)}</div>}{p.message&&<div className="notice success-notice">{decodeURIComponent(p.message)}</div>}
      <div className="notice">Verification status: <b>{org?.verification_status??"not submitted"}</b>. Organization verification and listing moderation are reviewed separately.</div>
      <label>Organization name<input name="name" required defaultValue={org?.name}/></label><label>County<input name="county" defaultValue={org?.county}/></label><label>Industry / training focus<input name="industry" defaultValue={org?.industry}/></label><label>Website<input name="website" type="url" defaultValue={org?.website}/></label><label>About the organization<textarea name="description" rows={5} defaultValue={org?.description}/></label><button className="button button-dark">Save profile ↗</button>
    </form>{org&&<VerificationManager organizationId={org.id} initial={evidence??[]}/>}
  </main>;
}
