import React from "react";

const SearchResults = ({ query, title, results, loading = false }) => {
  if (!query.trim()) return null;

  return (
    <section className="search-results card" aria-live="polite">
      <div className="card-header">
        <h2>{title}</h2>
        <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
      </div>
      {loading ? (
        <p className="search-results-empty">Searching records…</p>
      ) : results.length ? (
        <ul className="search-results-list">
          {results.map((result, index) => (
            <li key={result.id ?? index}>
              <strong>{result.label}</strong>
              {result.detail && <span>{result.detail}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="search-results-empty">No matching records found.</p>
      )}
    </section>
  );
};

export default SearchResults;
