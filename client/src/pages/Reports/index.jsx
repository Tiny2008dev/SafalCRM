import React, { useEffect, useState } from "react";
import { fetchJson } from "../../services/api";

const formatCurrency = (value) => {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
};

const ReportsPage = () => {
  const [reports, setReports] = useState({
    clients: null,
    inventory: null,
    products: null,
    production: null,
    orders: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          clientsData,
          inventoryData,
          productsData,
          productionData,
          ordersData,
        ] = await Promise.all([
          fetchJson("/reports/clients"),
          fetchJson("/reports/inventory"),
          fetchJson("/reports/products"),
          fetchJson("/reports/production"),
          fetchJson("/reports/orders"),
        ]);

        if (mounted) {
          setReports({
            clients: clientsData,
            inventory: inventoryData,
            products: productsData,
            production: productionData,
            orders: ordersData,
          });
        }
      } catch (err) {
        console.error("Reports loading error:", err);

        if (mounted) {
          setReports({
            clients: null,
            inventory: null,
            products: null,
            production: null,
            orders: null,
          });

          setError(err.message || "Reports are unavailable.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      mounted = false;
    };
  }, []);

  const renderSectionHeader = (title) => (
    <div className="card-header" style={{ marginBottom: "12px" }}>
      <h2>{title}</h2>
    </div>
  );

  return (
    <div>
      <header className="page-header">
        <h1>Reports</h1>
        <p className="muted">
          Business summaries across clients, inventory, products, production,
          and orders.
        </p>
      </header>

      {loading ? (
        <div className="empty-state">Loading reports...</div>
      ) : error ||
        !reports.clients ||
        !reports.inventory ||
        !reports.products ||
        !reports.production ||
        !reports.orders ? (
        <div className="empty-state">
          Unable to load reports.
          <br />
          {error || "Reports data is not available."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {/* CLIENT REPORT */}
          <section className="card">
            {renderSectionHeader("Client Report")}

            <div className="card-grid">
              <div className="card">
                <div className="label">Total Clients</div>
                <div className="value">
                  {reports.clients.totalClients ?? 0}
                </div>
              </div>
            </div>

            <div className="table-responsive" style={{ marginTop: "12px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.clients.clients?.length > 0 ? (
                    reports.clients.clients.map((client) => (
                      <tr key={client.id}>
                        <td>{client.id}</td>
                        <td>{client.name || "—"}</td>
                        <td>{client.email || "—"}</td>
                        <td>{client.phone || "—"}</td>
                        <td>{client.created_at || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No clients found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* INVENTORY REPORT */}
          <section className="card">
            {renderSectionHeader("Inventory Report")}

            <div className="card-grid">
              <div className="card">
                <div className="label">Total Materials</div>
                <div className="value">
                  {reports.inventory.totalMaterials ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Current Stock</div>
                <div className="value">
                  {reports.inventory.currentStock ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Minimum Stock</div>
                <div className="value">
                  {reports.inventory.minimumStock ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Low Stock Materials</div>
                <div className="value">
                  {reports.inventory.lowStockMaterials?.length ?? 0}
                </div>
              </div>
            </div>

            <div className="table-responsive" style={{ marginTop: "12px" }}>
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
                  {reports.inventory.lowStockMaterials?.length > 0 ? (
                    reports.inventory.lowStockMaterials.map((item) => (
                      <tr key={item.id}>
                        <td>{item.material_code || "—"}</td>
                        <td>{item.material_name || "—"}</td>
                        <td>{item.current_stock ?? "—"}</td>
                        <td>{item.minimum_stock ?? "—"}</td>
                        <td>{item.unit || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No low stock materials.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PRODUCT REPORT */}
          <section className="card">
            {renderSectionHeader("Product Report")}

            <div className="card-grid">
              <div className="card">
                <div className="label">Total Products</div>
                <div className="value">
                  {reports.products.totalProducts ?? 0}
                </div>
              </div>
            </div>

            <div className="table-responsive" style={{ marginTop: "12px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Price</th>
                    <th>Description</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.products.products?.length > 0 ? (
                    reports.products.products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.id}</td>
                        <td>{product.product_code || "—"}</td>
                        <td>{product.product_name || "—"}</td>
                        <td>{product.size || "—"}</td>
                        <td>{formatCurrency(product.selling_price)}</td>
                        <td>{product.description || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PRODUCTION REPORT */}
          <section className="card">
            {renderSectionHeader("Production Report")}

            <div className="card-grid">
              <div className="card">
                <div className="label">Total Production Orders</div>
                <div className="value">
                  {reports.production.totalProduction ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Pending</div>
                <div className="value">
                  {reports.production.pending ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Completed</div>
                <div className="value">
                  {reports.production.completed ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Cancelled</div>
                <div className="value">
                  {reports.production.cancelled ?? 0}
                </div>
              </div>
            </div>
          </section>

          {/* ORDERS REPORT */}
          <section className="card">
            {renderSectionHeader("Orders Report")}

            <div className="card-grid">
              <div className="card">
                <div className="label">Total Orders</div>
                <div className="value">
                  {reports.orders.totalOrders ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Pending</div>
                <div className="value">
                  {reports.orders.pending ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Processing</div>
                <div className="value">
                  {reports.orders.processing ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Completed</div>
                <div className="value">
                  {reports.orders.completed ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Cancelled</div>
                <div className="value">
                  {reports.orders.cancelled ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="label">Total Order Amount</div>
                <div className="value">
                  {formatCurrency(reports.orders.totalOrderAmount)}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;