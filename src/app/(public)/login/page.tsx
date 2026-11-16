import {LoginForm} from "@/components/login-form";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string;message?:string;next?:string}>}){const p=await searchParams;const next=p.next?.startsWith("/")&&!p.next.startsWith("//")?p.next:"/dashboard";return <main className="form-wrap"><LoginForm error={p.error} message={p.message} next={next}/></main>}
