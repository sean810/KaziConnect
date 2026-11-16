"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signUpAction, googleSignInAction } from "@/app/actions";

export function RegisterForm({role,error}:{role:"seeker"|"employer"|"provider";error?:string}) {
  const [showPassword,setShowPassword]=useState(false);
  const [passwordMismatch,setPasswordMismatch]=useState(false);
  const organization=role!=="seeker";
  const errorMessages:Record<string,string>={configuration:"Connect Supabase first using the project setup guide.","password-mismatch":"The passwords do not match. Please check both fields.","password-short":"Choose a password with at least 8 characters.","invalid-role":"Choose a valid account type.","organization-required":"Enter your organization name to continue."};
  const title=role==="employer"?"Create your employer account":role==="provider"?"Register as a training provider":"Create your seeker account";
  return <form className="form-card" action={signUpAction} onSubmit={event=>{const values=new FormData(event.currentTarget);if(values.get("password")!==values.get("confirm_password")){event.preventDefault();setPasswordMismatch(true)}else setPasswordMismatch(false)}}>
    <div className="eyebrow"><span className="eyebrow-line"/> {role==="seeker"?"START YOUR NEXT CHAPTER":"JOIN KAZICONNECT"}</div>
    <h1>{title}</h1><p>{role==="seeker"?"Build a profile, save opportunities, and apply when you’re ready.":role==="employer"?"Create an employer profile and post jobs or internships for review.":"Create a provider profile and share training opportunities with learners."}</p>
    {error&&<div className="notice error-notice">{errorMessages[error]??decodeURIComponent(error)}</div>}
    <input type="hidden" name="role" value={role}/>
    <label>{organization?"Your name":"Full name"}<input name="full_name" required autoComplete="name"/></label>
    <label>Email address<input name="email" type="email" required autoComplete="email"/></label>
    <label>Password<div className="password-control"><input name="password" type={showPassword?"text":"password"} minLength={8} required autoComplete="new-password"/><button type="button" className="password-toggle" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><small>Use at least 8 characters.</small></label>
    <label>Confirm password<input name="confirm_password" type={showPassword?"text":"password"} minLength={8} required autoComplete="new-password" onChange={()=>setPasswordMismatch(false)}/></label>{passwordMismatch&&<div className="notice error-notice" role="alert">The passwords do not match. Please check both fields.</div>}
    {organization&&<><label>{role==="employer"?"Company / organization name":"Training provider name"}<input name="organization_name" required/></label><label>County / base of operations<input name="county" placeholder="e.g. Nairobi" required/></label><label>{role==="employer"?"Industry":"Training focus"}<input name="industry" required/></label><div className="notice">Your organization starts with verification pending. Listings go through moderation.</div></>}
    <button className="button button-dark" type="submit">Create account <span>↗</span></button>
    {role==="seeker"&&<><div className="auth-divider"><span>or</span></div><button className="button button-outline" type="submit" formAction={googleSignInAction}>Continue with Google</button></>}
    <div className="form-switch">Already registered? <Link href="/login">Log in</Link></div>
    <div className="form-switch"><Link href="/">← Back to home</Link></div>
    {role==="seeker"&&<div className="form-switch"><Link href="/employers/register">Register as an employer</Link> · <Link href="/providers/register">Register as a training provider</Link></div>}
  </form>;
}
