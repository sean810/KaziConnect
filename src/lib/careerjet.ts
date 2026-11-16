type HeaderReader = { get(name: string): string | null };

export type CareerjetListing = {
  title: string;
  company: string;
  date: string;
  description: string;
  locations: string;
  salary?: string;
  url: string;
};

export type CareerjetSearch = {
  state: "ready" | "not-configured" | "unavailable";
  items: CareerjetListing[];
  hits: number;
  pages: number;
  page: number;
};

type CareerjetResponse = {
  jobs?: CareerjetListing[];
  hits?: number;
  pages?: number;
  message?: string;
};

function visitorIp(headers: HeaderReader) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "";
}

function publisherOrigin(headers: HeaderReader) {
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host")?.trim();
  if (host) {
    try {
      const url = new URL(`https://${host}`);
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return url.origin;
    } catch {
      // Fall through to a validated public configuration value below.
    }
  }
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (configured.protocol === "https:" && configured.hostname !== "localhost") return configured.origin;
  } catch {
    // Use the configured production domain as the final safe fallback.
  }
  return "https://kaziconnect-hazel.vercel.app";
}

export async function searchCareerjet({
  headers,
  keywords,
  location,
  kind = "all",
  workMode,
  page = 1,
  refererPath = "/jobs",
}: {
  headers: HeaderReader;
  keywords?: string;
  location?: string;
  kind?: "all" | "job" | "internship";
  workMode?: string;
  page?: number;
  refererPath?: string;
}): Promise<CareerjetSearch> {
  const requestedPage = Number(page);
  const safePage = Math.max(1, Math.min(10, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  const apiKey = process.env.CAREERJET_API_KEY;
  if (!apiKey) return { state: "not-configured", items: [], hits: 0, pages: 0, page: safePage };

  const ip = visitorIp(headers);
  const userAgent = headers.get("user-agent") ?? "";
  if (!ip || !userAgent) {
    console.warn("[careerjet] Search skipped because visitor IP or user-agent was unavailable.");
    return { state: "unavailable", items: [], hits: 0, pages: 0, page: safePage };
  }

  const query = new URLSearchParams({
    locale_code: "en_KE",
    page: String(safePage),
    page_size: "20",
    sort: "date",
    fragment_size: "240",
    user_ip: ip,
    user_agent: userAgent,
  });
  const cleanKeywords = (keywords ?? "").replace(/[^\p{L}\p{N}\s+.-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 120);
  const modeKeyword = workMode === "remote" || workMode === "hybrid" ? workMode : "";
  const fullKeywords = [cleanKeywords, modeKeyword].filter(Boolean).join(" ");
  if (fullKeywords) query.set("keywords", fullKeywords);
  if (location) query.set("location", location.slice(0, 80));
  if (kind === "internship") query.set("contract_type", "i");
  const siteOrigin = publisherOrigin(headers);
  const authorization = Buffer.from(`${apiKey}:`).toString("base64");
  try {
    const response = await fetch(`https://search.api.careerjet.net/v4/query?${query.toString()}`, {
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
        Referer: `${siteOrigin}${refererPath}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn(`[careerjet] Publisher API returned HTTP ${response.status}.`);
      return { state: "unavailable", items: [], hits: 0, pages: 0, page: safePage };
    }
    const data = (await response.json()) as CareerjetResponse;
    const items = (Array.isArray(data.jobs) ? data.jobs : []).filter((job) =>
      typeof job.title === "string" && typeof job.company === "string" && typeof job.url === "string" &&
      /^https:\/\//i.test(job.url),
    );
    return {
      state: "ready",
      items,
      hits: Number.isFinite(data.hits) ? Number(data.hits) : items.length,
      pages: Math.max(0, Math.min(10, Number(data.pages) || 0)),
      page: safePage,
    };
  } catch {
    console.warn("[careerjet] Publisher API request failed or timed out.");
    return { state: "unavailable", items: [], hits: 0, pages: 0, page: safePage };
  }
}
