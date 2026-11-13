import {RegisterForm} from "@/components/register-form";
export default async function ProviderRegister({searchParams}:{searchParams:Promise<{error?:string}>}){const p=await searchParams;return <main className="form-wrap"><RegisterForm role="provider" error={p.error}/></main>}
