type JSearchJob = {
  job_title?: string;
  employer_name?: string;
  job_publisher?: string;
  job_description?: string;
  job_apply_link?: string;
  job_location?: string;
  job_city?: string;
  job_country?: string;
  job_employment_type?: string;
  job_is_remote?: boolean;
  job_posted_at?: string;
  job_posted_at_datetime_utc?: string;
  job_posted_at_timestamp?: number;
  job_expiration_datetime_utc?: string;
  job_expiration_timestamp?: number;
  job_salary?: string;
  job_salary_string?: string;
};

type JSearchResponse = {
  status?: string;
  data?: {
    jobs?: JSearchJob[];
    cursor?: string;
  };
  message?: string;
};

export type JSearchListing = {
  title: string;
  company: string;
  publisher: string;
  location: string;
  employmentType: string;
  description: string;
  applyUrl: string;
  posted: string;
  salary?: string;
  remote: boolean;
};

export type JSearchSearch = {
  state: "ready" | "not-configured" | "unavailable";
  items: JSearchListing[];
  diagnostic?: string;
};

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function toDate(value: string | number | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value < 10_000_000_000 ? value * 1000 : value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function statedDeadline(description: string) {
  const marker = /(?:application\s+)?(?:deadline|closing\s+date|apply\s+before|applications?\s+close(?:s)?\s+on)\s*[:\-]?\s*([^\n\r.]{3,50})/i.exec(description);
  if (!marker) return null;
  const candidate = marker[1];
  const iso = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(candidate);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 23, 59, 59));
  const namedMonth = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i.exec(candidate);
  const monthFirst = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i.exec(candidate);
  const match = namedMonth
    ? { day: namedMonth[1], month: namedMonth[2], year: namedMonth[3] }
    : monthFirst
      ? { day: monthFirst[2], month: monthFirst[1], year: monthFirst[3] }
      : null;
  if (!match) return null;
  return new Date(Date.UTC(Number(match.year), MONTHS[match.month.toLowerCase()], Number(match.day), 23, 59, 59));
}

function isExpired(job: JSearchJob, now: Date) {
  const expiration = toDate(job.job_expiration_datetime_utc ?? job.job_expiration_timestamp);
  if (expiration && expiration.getTime() < now.getTime()) return true;
  const deadline = statedDeadline(job.job_description ?? "");
  return Boolean(deadline && deadline.getTime() < now.getTime());
}

function isInternship(job: JSearchJob) {
  return /intern|attachment|graduate trainee/i.test(`${job.job_title ?? ""} ${job.job_employment_type ?? ""}`);
}

function safeListing(job: JSearchJob): JSearchListing | null {
  const applyUrl = typeof job.job_apply_link === "string" ? job.job_apply_link : "";
  if (!/^https:\/\//i.test(applyUrl) || !job.job_title || !job.employer_name) return null;
  return {
    title: job.job_title,
    company: job.employer_name,
    publisher: job.job_publisher || "JSearch",
    location: job.job_location || job.job_city || "Kenya",
    employmentType: job.job_employment_type || "Opportunity",
    description: job.job_description || "Open the source listing to review the complete requirements and application instructions.",
    applyUrl,
    posted: job.job_posted_at || (job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc).toLocaleDateString("en-KE") : ""),
    salary: job.job_salary_string || job.job_salary || undefined,
    remote: Boolean(job.job_is_remote),
  };
}

export async function searchJSearch({
  keywords,
  location,
  kind = "all",
  workMode,
}: {
  keywords?: string;
  location?: string;
  kind?: "all" | "job" | "internship";
  workMode?: string;
}): Promise<JSearchSearch> {
  const apiKey = process.env.JSEARCH_API_KEY?.trim();
  if (!apiKey) return { state: "not-configured", items: [] };

  const cleanKeywords = (keywords ?? "").replace(/[^\p{L}\p{N}\s+.-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 100);
  const cleanLocation = (location ?? "").replace(/[^\p{L}\p{N}\s,.-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 60);
  const query = new URLSearchParams({
    query: [cleanKeywords || (kind === "internship" ? "internship" : "jobs"), cleanLocation || "Kenya"].join(" in "),
    country: "ke",
    language: "en",
    date_posted: "month",
    num_pages: "1",
  });
  if (kind === "internship") query.set("employment_types", "INTERN");
  if (workMode === "remote") query.set("work_from_home", "true");

  try {
    const response = await fetch(`https://jsearch.p.rapidapi.com/search?${query.toString()}`, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.warn(`[jsearch] Provider returned HTTP ${response.status}.`);
      return { state: "unavailable", items: [], diagnostic: `provider HTTP ${response.status}` };
    }
    const data = (await response.json()) as JSearchResponse;
    if (data.status !== "OK") {
      console.warn("[jsearch] Provider returned a non-success response.");
      return { state: "unavailable", items: [], diagnostic: "provider returned an unsuccessful response" };
    }
    const now = new Date();
    const items = (Array.isArray(data.data?.jobs) ? data.data.jobs : [])
      .filter((job) => !isExpired(job, now))
      .filter((job) => kind === "all" || (kind === "internship" ? isInternship(job) : !isInternship(job)))
      .map(safeListing)
      .filter((job): job is JSearchListing => Boolean(job));
    return { state: "ready", items };
  } catch {
    console.warn("[jsearch] Provider request failed or timed out.");
    return { state: "unavailable", items: [], diagnostic: "provider request timed out or could not connect" };
  }
}
