import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KaziConnect — Find your next opportunity",
  description: "Discover jobs, internships and training opportunities across Kenya.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
