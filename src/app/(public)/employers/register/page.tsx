import {RegisterForm} from "@/components/register-form";
export default async function EmployerRegister({searchParams}:{searchParams:Promise<{error?:string}>}){const p=await searchParams;return <main className="form-wrap"><RegisterForm role="employer" error={p.error}/></main>}
