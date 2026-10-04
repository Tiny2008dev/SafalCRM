import React, { useCallback, useEffect, useState } from "react";
import { fetchJson } from "../../services/api";

const statusClass = (status) => String(status || "").toLowerCase().replace(/\s+/g, "-");
const shortDate = (value) => {
  if (!value) return "—";
  const source = String(value);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(source);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(source);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const number = (value) => Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const amount = (value) => `₹${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const DashboardPage = ({ onNavigate }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadDashboard = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setDashboard(await fetchJson("/dashboard"));
      setUpdatedAt(new Date());
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err.message || "Dashboard data is not available.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) return <div className="dashboard-loading" role="status">Loading dashboard data…</div>;
  if (!dashboard) return (
    <div className="dashboard-error" role="alert">
      <div><strong>Dashboard data is unavailable</strong><span>{error}</span></div>
      <button className="btn secondary" onClick={() => loadDashboard()}>Try again</button>
    </div>
  );

  const stats = [
    { label: "Sales orders", value: dashboard.totalOrders, note: "Across all order statuses", tone: "green" },
    { label: "Pending production", value: dashboard.pendingProduction, note: "Awaiting a production start", tone: "amber" },
    { label: "Low-stock materials", value: dashboard.lowStockMaterials, note: "At or below reorder level", tone: "red" },
    { label: "Clients", value: dashboard.totalClients, note: "Customer accounts", tone: "blue" },
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">SAFAL MARG / OPERATIONS</p>
          <h1>Dashboard</h1>
          <p className="dashboard-description">A clear view of orders, production, and materials that need attention.</p>
        </div>
        <div className="dashboard-header-actions">
          <span className="dashboard-updated">{updatedAt ? `Updated ${updatedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "Live overview"}</span>
          <button className="btn secondary" type="button" onClick={() => loadDashboard(true)} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button className="btn primary" type="button" onClick={() => onNavigate?.("Orders")}>New order</button>
        </div>
      </header>

      {error && <div className="dashboard-notice" role="status">Refresh failed: {error}. Showing the last loaded data.</div>}

      <section className="dashboard-stat-grid" aria-label="Operational summary">
        {stats.map((stat) => (
          <article className={`dashboard-stat ${stat.tone}`} key={stat.label}>
            <span>{stat.label}</span>
            <strong>{Number(stat.value ?? 0).toLocaleString()}</strong>
            <small>{stat.note}</small>
          </article>
        ))}
      </section>

      <div className="dashboard-content-grid">
        <section className="card dashboard-card">
          <div className="section-heading">
            <div><p className="eyebrow">SALES</p><h2>Recent orders</h2></div>
            <button className="dashboard-section-link" type="button" onClick={() => onNavigate?.("Orders")}>All orders</button>
          </div>
          {dashboard.recentOrders?.length ? <div className="activity-list">
            {dashboard.recentOrders.map((order) => <div className="activity-row" key={order.id}>
              <div className="activity-marker green">{`#${order.id}`}</div>
              <div className="activity-main">
                <strong>{order.client_name || "Unassigned client"}</strong>
                <span>{order.product_name || "No product linked"}</span>
                <small>{shortDate(order.order_date)}</small>
              </div>
              <div className="activity-meta">
                <strong>{amount(order.total_amount)}</strong>
                <span className={`status-badge ${statusClass(order.status)}`}>{order.status || "Unknown"}</span>
              </div>
            </div>)}
          </div> : <div className="inline-empty">No recent orders yet.</div>}
        </section>

        <section className="card dashboard-card">
          <div className="section-heading">
            <div><p className="eyebrow">FACTORY</p><h2>Production activity</h2></div>
            <button className="dashboard-section-link" type="button" onClick={() => onNavigate?.("Production")}>Production</button>
          </div>
          {dashboard.recentProductionOrders?.length ? <div className="activity-list">
            {dashboard.recentProductionOrders.map((order) => <div className="activity-row" key={order.id}>
              <div className="activity-marker amber">{`#${order.id}`}</div>
              <div className="activity-main">
                <strong>{order.product_name || "Unnamed product"}</strong>
                <span>{number(order.quantity)} units planned</span>
                <small>{shortDate(order.production_date)}</small>
              </div>
              <div className="activity-meta"><span className={`status-badge ${statusClass(order.status)}`}>{order.status || "Unknown"}</span></div>
            </div>)}
          </div> : <div className="inline-empty">No recent production orders yet.</div>}
        </section>
      </div>

      <section className="card dashboard-card stock-card">
        <div className="section-heading">
          <div><p className="eyebrow">INVENTORY</p><h2>Materials to replenish</h2></div>
          <div className="stock-heading-actions">
            <span className={`stock-alert-label${Number(dashboard.lowStockMaterials) === 0 ? " clear" : ""}`}>
              {number(dashboard.lowStockMaterials)} {dashboard.lowStockMaterials === 1 ? "material" : "materials"}
            </span>
            <button className="dashboard-section-link" type="button" onClick={() => onNavigate?.("Materials")}>Inventory</button>
          </div>
        </div>
        {dashboard.lowStockItems?.length ? <div className="table-responsive"><table className="table dashboard-table"><thead><tr><th>Material</th><th>Code</th><th>Current stock</th><th>Minimum</th><th>Gap</th></tr></thead><tbody>
          {dashboard.lowStockItems.map((item) => {
            const gap = Math.max(0, Number(item.minimum_stock || 0) - Number(item.current_stock || 0));
            return <tr key={item.id}>
              <td><strong>{item.material_name || "—"}</strong><span className="table-subtext">{item.unit || "Unit not set"}</span></td>
              <td>{item.material_code || "—"}</td>
              <td className="numeric-cell">{number(item.current_stock)} {item.unit || ""}</td>
              <td className="numeric-cell">{number(item.minimum_stock)} {item.unit || ""}</td>
              <td className="numeric-cell"><span className="gap-value">{number(gap)} {item.unit || ""}</span></td>
            </tr>;
          })}
        </tbody></table></div> : <div className="inline-empty success-empty">All materials are above their minimum stock level.</div>}
      </section>
    </div>
  );
};

export default DashboardPage;
