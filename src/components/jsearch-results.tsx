import { ArrowUpRight, MapPin } from "lucide-react";
import type { JSearchSearch } from "@/lib/jsearch";

export function JSearchResults({ results }: { results: JSearchSearch }) {
  return (
    <section className="jsearch-results" aria-label="Live opportunities from JSearch">
      <div className="jsearch-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> LIVE OPPORTUNITIES</div>
          <h2>More roles from across Kenya</h2>
        </div>
        {results.state === "ready" && <span className="jsearch-count">{results.items.length} results</span>}
      </div>
      {results.state === "not-configured" ? (
        <div className="notice">The live JSearch feed is not connected yet. KaziConnect listings remain available above.</div>
      ) : results.state === "unavailable" ? (
        <div className="notice">The live job feed is temporarily unavailable. KaziConnect listings remain available above.{results.diagnostic && <small className="jsearch-diagnostic">Connection check: {results.diagnostic}.</small>}</div>
      ) : results.items.length ? (
        <>
          <p className="jsearch-attribution">Third-party listings provided through JSearch. KaziConnect has not verified these employers or postings. Open the source listing to confirm it is still available, check its requirements and apply there. Listings are screened for clear past deadlines where the source data provides one.</p>
          <div className="jsearch-list">
            {results.items.map((job) => (
              <article className="listing-row" key={`${job.applyUrl}-${job.title}`}>
                <div className="company-avatar">{job.company.slice(0, 1) || "✳"}</div>
                <div className="listing-row-main">
                  <h3>{job.title}</h3>
                  <p>{job.company}</p>
                  <div className="listing-row-meta">
                    <span><MapPin size={12} />{job.location}</span>
                    {job.employmentType && <span>{job.employmentType}</span>}
                    {job.posted && <span>{job.posted}</span>}
                    {job.salary && <span>{job.salary}</span>}
                    {job.remote && <span>Remote</span>}
                  </div>
                  {job.description && <p className="jsearch-description">{job.description}</p>}
                  <span className="source-label">Via {job.publisher} · External application</span>
                </div>
                <a className="button button-dark" href={job.applyUrl} target="_blank" rel="noreferrer">View & apply <ArrowUpRight size={14} /></a>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">JSearch returned no matching listings. Try a broader title or location.</div>
      )}
    </section>
  );
}
