import { useCallback, useEffect, useState } from "react";
import { fetchJson, patchJson } from "../../services/api";
import PageIntro from "../../components/PageIntro";

const statuses = ["New", "Contacted", "Qualified", "Closed"];

export default function EnquiriesPage({ userRole }) {
  const [rows, setRows] = useState([]);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const load = useCallback(async (nextOffset = offset) => {
    setLoading(true); setError("");
    try {
      const data = await fetchJson(`/enquiries?limit=25&offset=${nextOffset}`);
      setRows(data.enquiries || []); setHasMore((data.enquiries || []).length === 25);
    } catch (e) { setError(e.message || "Unable to load enquiries."); }
    finally { setLoading(false); }
  }, [offset]);
  useEffect(() => { load(); }, [load]);
  const updateStatus = async (row, status) => {
    try { await patchJson(`/enquiries/${row.id}/status`, { status }); await load(); }
    catch (e) { setError(e.message || "Unable to update status."); }
  };
  return <>
    <PageIntro title="B2B Enquiries" />
    {error && <div className="empty-state" role="alert">{error}</div>}
    {loading ? <div className="empty-state">Loading enquiries…</div> : rows.length ? <div className="table-responsive"><table className="table">
      <thead><tr><th>Company / Contact</th><th>Email / Phone</th><th>Product</th><th>Quantity</th><th>Message</th><th>Received</th><th>Status</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}>
        <td>{row.company_name}<br /><small>{row.contact_person}</small></td><td>{row.email}<br /><small>{row.phone || "—"}</small></td>
        <td>{row.product_interest}</td><td>{row.quantity ?? "—"}</td><td style={{ minWidth: 220, whiteSpace: "pre-wrap" }}>{row.message}</td>
        <td>{new Date(row.created_at).toLocaleString()}</td><td>{userRole === "admin" ? <select aria-label={`Status for ${row.company_name}`} value={row.status} onChange={(e) => updateStatus(row, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select> : row.status}</td>
      </tr>)}</tbody>
    </table></div> : <div className="empty-state">No B2B enquiries yet.</div>}
    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
      <button className="btn secondary" disabled={!offset || loading} onClick={() => setOffset(Math.max(0, offset - 25))}>Previous</button>
      <button className="btn secondary" disabled={!hasMore || loading} onClick={() => setOffset(offset + 25)}>Next</button>
    </div>
  </>;
}
