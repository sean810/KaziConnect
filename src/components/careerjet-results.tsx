import { ArrowUpRight, MapPin } from "lucide-react";
import type { CareerjetSearch } from "@/lib/careerjet";

export function CareerjetResults({
  results,
  pageHref,
}: {
  results: CareerjetSearch;
  pageHref: (page: number) => string;
}) {
  return (
    <section className="careerjet-results" aria-label="Live opportunities from Careerjet">
      <div className="careerjet-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> LIVE OPPORTUNITIES</div>
          <h2>More roles from Careerjet</h2>
        </div>
        {results.state === "ready" && <span className="careerjet-count">{results.hits.toLocaleString()} results</span>}
      </div>
      {results.state === "not-configured" ? (
        <div className="notice">Live Careerjet listings are not connected yet. Add a Careerjet publisher API key to enable this feed. KaziConnect published listings remain available above.</div>
      ) : results.state === "unavailable" ? (
        <div className="notice">Careerjet’s live search is temporarily unavailable. KaziConnect published listings remain available above.</div>
      ) : results.items.length ? (
        <>
          <p className="careerjet-attribution">Listings supplied by Careerjet. These third-party posts are not verified by KaziConnect; check availability and requirements on the source page. Careerjet receives your IP address and browser type with this search to provide its results.</p>
          <div className="careerjet-list">
            {results.items.map((job, index) => (
              <article className="listing-row" key={`${job.url}-${index}`}>
                <div className="company-avatar">{job.company.slice(0, 1) || "✳"}</div>
                <div className="listing-row-main">
                  <h3>{job.title}</h3>
                  <p>{job.company}</p>
                  <div className="listing-row-meta">
                    {job.locations && <span><MapPin size={12} />{job.locations}</span>}
                    {job.date && <span>{job.date}</span>}
                    {job.salary && <span>{job.salary}</span>}
                  </div>
                  {job.description && <p className="careerjet-description">{job.description}</p>}
                  <span className="source-label">Careerjet listing · Availability may change</span>
                </div>
                <a className="button button-dark" href={job.url} target="_blank" rel="noreferrer">View & apply <ArrowUpRight size={14} /></a>
              </article>
            ))}
          </div>
          {results.pages > 1 && (
            <nav className="careerjet-pagination" aria-label="Careerjet pages">
              {results.page > 1 && <a className="button button-outline" href={pageHref(results.page - 1)}>← Previous</a>}
              <span>Page {results.page} of {results.pages}</span>
              {results.page < results.pages && <a className="button button-outline" href={pageHref(results.page + 1)}>More live opportunities →</a>}
            </nav>
          )}
        </>
      ) : (
        <div className="empty-state">Careerjet did not return matching listings. Try a broader search or location.</div>
      )}
    </section>
  );
}
