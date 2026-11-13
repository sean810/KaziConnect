import {RegisterForm} from "@/components/register-form";
export default async function Register({searchParams}:{searchParams:Promise<{error?:string}>}){const p=await searchParams;return <main className="form-wrap"><RegisterForm role="seeker" error={p.error}/></main>}
