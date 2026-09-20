import React, { useEffect, useState } from "react";
import { fetchJson } from "../../services/api";

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchJson("/dashboard");

        if (mounted) {
          setDashboard(data);
        }
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (mounted) {
          setDashboard(null);
          setError(err.message || "Unable to load dashboard.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const cards = [
    {
      key: "totalClients",
      label: "Total Clients",
    },
    {
      key: "totalProducts",
      label: "Total Products",
    },
    {
      key: "totalMaterials",
      label: "Total Materials",
    },
    {
      key: "lowStockMaterials",
      label: "Low Stock Materials",
    },
    {
      key: "pendingProduction",
      label: "Pending Production",
    },
    {
      key: "totalOrders",
      label: "Total Orders",
    },
  ];

  return (
    <div>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">
          Overview of key business metrics.
        </p>
      </header>

      {loading ? (
        <div className="empty-state">
          Loading dashboard...
        </div>
      ) : !dashboard ? (
        <div className="empty-state">
          Unable to load dashboard.
          <br />
          {error || "Dashboard data is not available."}
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="card-grid">
            {cards.map((card) => (
              <div key={card.key} className="card">
                <div className="label">
                  {card.label}
                </div>

                <div className="value">
                  {dashboard[card.key] ?? 0}
                </div>
              </div>
            ))}
          </div>

          {/* RECENT ORDERS + RECENT PRODUCTION */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            {/* RECENT ORDERS */}
            <div className="card">
              <div className="card-header">
                <h2>Recent Orders</h2>
              </div>

              <div className="card-body">
                {dashboard.recentOrders &&
                dashboard.recentOrders.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Client</th>
                          <th>Product</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {dashboard.recentOrders.map(
                          (order) => (
                            <tr key={order.id}>
                              <td>{order.id}</td>

                              <td>
                                {order.client_name || "—"}
                              </td>

                              <td>
                                {order.product_name || "—"}
                              </td>

                              <td>
                                {Number(
                                  order.total_amount ?? 0
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>

                              <td>
                                {order.status || "—"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    No recent orders found.
                  </div>
                )}
              </div>
            </div>

            {/* RECENT PRODUCTION */}
            <div className="card">
              <div className="card-header">
                <h2>Recent Production Orders</h2>
              </div>

              <div className="card-body">
                {dashboard.recentProductionOrders &&
                dashboard.recentProductionOrders.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {dashboard.recentProductionOrders.map(
                          (order) => (
                            <tr key={order.id}>
                              <td>{order.id}</td>

                              <td>
                                {order.product_name || "—"}
                              </td>

                              <td>
                                {order.quantity ?? "—"}
                              </td>

                              <td>
                                {order.production_date || "—"}
                              </td>

                              <td>
                                {order.status || "—"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    No recent production orders found.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LOW STOCK MATERIALS */}
          <div
            className="card"
            style={{
              marginTop: "16px",
            }}
          >
            <div className="card-header">
              <h2>Low Stock Materials</h2>
            </div>

            <div className="card-body">
              {dashboard.lowStockItems &&
              dashboard.lowStockItems.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Material</th>
                        <th>Current Stock</th>
                        <th>Minimum Stock</th>
                        <th>Unit</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dashboard.lowStockItems.map(
                        (item) => (
                          <tr key={item.id}>
                            <td>
                              {item.material_code || "—"}
                            </td>

                            <td>
                              {item.material_name || "—"}
                            </td>

                            <td>
                              {item.current_stock ?? "—"}
                            </td>

                            <td>
                              {item.minimum_stock ?? "—"}
                            </td>

                            <td>
                              {item.unit || "—"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  No low stock materials found.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;