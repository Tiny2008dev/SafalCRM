import { useCallback, useEffect, useState } from "react";
import { fetchJson, patchJson } from "../../services/api";
import PageIntro from "../../components/PageIntro";
import "./Enquiries.css";

const PAGE_SIZE = 25;
const statuses = ["New", "Contacted", "Qualified", "Closed"];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function EnquiriesPage({ userRole }) {
  const [rows, setRows] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [statusInput, setStatusInput] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async (nextOffset = offset) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(nextOffset) });
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      const data = await fetchJson(`/enquiries?${params.toString()}`);
      setRows(Array.isArray(data.enquiries) ? data.enquiries : []);
      setTotal(Number(data.total) || 0);
    } catch (err) {
      setError(err.message || "Unable to load enquiries.");
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = (event) => {
    event.preventDefault();
    setOffset(0);
    setFilters({ search: searchInput.trim(), status: statusInput });
    setNotice("");
  };

  const updateStatus = async (row, status) => {
    setError("");
    setNotice("");
    setUpdatingId(row.id);
    try {
      await patchJson(`/enquiries/${row.id}/status`, { status });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item));
      setNotice(`Status updated for ${row.company_name}.`);
      if (filters.status && filters.status !== status) await load(offset);
    } catch (err) {
      setError(err.message || "Unable to update enquiry status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const pageStart = total ? offset + 1 : 0;
  const pageEnd = Math.min(offset + rows.length, total);

  return (
    <section className="enquiries-page">
      <PageIntro
        eyebrow="SALES PIPELINE"
        title="B2B Enquiries"
        description="Review incoming business enquiries from the Safal Cosmetics website and track each follow-up."
      />

      <form className="enquiries-toolbar" onSubmit={applyFilters}>
        <label className="enquiries-search">
          <span>Search enquiries</span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Company, contact, email, or product"
          />
        </label>
        <label className="enquiries-status-filter">
          <span>Enquiry status</span>
          <select value={statusInput} onChange={(event) => setStatusInput(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <button className="btn primary" type="submit" disabled={loading}>Apply filters</button>
        <button className="btn secondary" type="button" onClick={() => load(offset)} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </form>

      {error && <div className="empty-state enquiry-message enquiry-error" role="alert">{error}</div>}
      {notice && <div className="empty-state enquiry-message enquiry-success" role="status">{notice}</div>}

      {loading ? (
        <div className="empty-state">Loading enquiries…</div>
      ) : rows.length ? (
        <>
          <div className="enquiries-table-wrap">
            <div className="table-responsive">
              <table className="table enquiries-table">
                <thead>
                  <tr>
                    <th scope="col">Company / Contact</th>
                    <th scope="col">Contact details</th>
                    <th scope="col">Product interest</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Message</th>
                    <th scope="col">Received</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.company_name}</strong>
                        <span className="enquiry-subtext">{row.contact_person}</span>
                      </td>
                      <td>
                        <a href={`mailto:${row.email}`}>{row.email}</a>
                        {row.phone && <a className="enquiry-subtext" href={`tel:${row.phone}`}>{row.phone}</a>}
                      </td>
                      <td>{row.product_interest}</td>
                      <td>{row.quantity == null ? "—" : Number(row.quantity).toLocaleString()}</td>
                      <td className="enquiry-message-cell">
                        <details>
                          <summary>View message</summary>
                          <p>{row.message}</p>
                        </details>
                      </td>
                      <td>{formatDate(row.created_at)}</td>
                      <td>
                        {userRole === "admin" ? (
                          <select
                            className="enquiry-status-select"
                            aria-label={`Status for ${row.company_name}`}
                            value={row.status}
                            disabled={updatingId === row.id}
                            onChange={(event) => updateStatus(row, event.target.value)}
                          >
                            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        ) : (
                          <span className={`enquiry-status-badge status-${row.status.toLowerCase()}`}>{row.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="enquiries-pagination">
            <span>Showing {pageStart}–{pageEnd} of {total} enquiries</span>
            <div>
              <button
                className="btn secondary"
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </button>
              <button
                className="btn secondary"
                type="button"
                disabled={pageEnd >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        !error && (
          <div className="empty-state">
            {filters.search || filters.status ? "No enquiries match these filters." : "No B2B enquiries have been received yet."}
          </div>
        )
      )}
    </section>
  );
}
