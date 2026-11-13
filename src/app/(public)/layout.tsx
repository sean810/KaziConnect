import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
export default function PublicLayout({children}:{children:React.ReactNode}) { return <div className="page-shell"><SiteHeader/>{children}<footer className="footer"><div className="wrap footer-bottom"><span>© 2026 KaziConnect · Kenya</span><span><Link href="/trust-safety">Trust & safety</Link>　<Link href="/privacy">Privacy</Link></span></div></footer></div>; }
