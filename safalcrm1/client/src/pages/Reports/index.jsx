import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageIntro from "../../components/PageIntro";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchJson } from "../../services/api";

const currency = (value) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
};

const numberFormat = (value) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
};

const createDefaultFilters = () => ({
  dateMode: "allTime",
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  fromDate: "",
  toDate: "",
  fromTime: "00:00",
  toTime: "23:59:59",
  clientId: "",
  productId: "",
  status: "All",
  orderId: "",
});

const normalizeFilters = (filters = {}) => {
  const next = { ...createDefaultFilters(), ...filters };

  if (next.dateMode !== "custom") {
    next.fromDate = "";
    next.toDate = "";
    next.fromTime = "00:00";
    next.toTime = "23:59:59";
  }

  if (next.dateMode !== "month") {
    next.month = new Date().getMonth() + 1;
  }

  if (next.dateMode !== "year") {
    next.year = new Date().getFullYear();
  }

  return next;
};

const pieColors = ["#6F42C1", "#2E7D32", "#F59E0B", "#0EA5E9", "#EF4444"];

const buildQueryString = (filters) => {
  const params = new URLSearchParams();

  if (filters.dateMode) params.set("dateMode", filters.dateMode);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.fromTime) params.set("fromTime", filters.fromTime);
  if (filters.toTime) params.set("toTime", filters.toTime);
  if (filters.month) params.set("month", String(filters.month));
  if (filters.year) params.set("year", String(filters.year));
  if (filters.clientId) params.set("clientId", String(filters.clientId));
  if (filters.productId) params.set("productId", String(filters.productId));
  if (filters.status && filters.status !== "All") params.set("status", filters.status);
  if (filters.orderId) params.set("orderId", String(filters.orderId));

  return params.toString();
};

const ReportsPage = () => {
  const [filters, setFilters] = useState(() => createDefaultFilters());
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [dashboard, setDashboard] = useState({
    ordersSummary: null,
    salesTrend: [],
    ordersTrend: [],
    salesByClient: [],
    salesByProduct: [],
    orderStatus: [],
    production: null,
    inventory: null,
    clientAnalytics: null,
    orderAnalytics: null,
    productAnalytics: null,
    detailedOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleApplyFilters = useCallback(async (nextFilters = createDefaultFilters()) => {
    const preparedFilters = normalizeFilters(nextFilters);
    setLoading(true);
    setError("");

    try {
      const queryString = buildQueryString(preparedFilters);
      const apiCalls = [
        fetchJson(`/reports/orders/analytics?${queryString}`),
        fetchJson(`/reports/orders/timeseries?${queryString}`),
        fetchJson(`/reports/orders/by-client?${queryString}`),
        fetchJson(`/reports/orders/by-product?${queryString}`),
        fetchJson(`/reports/production/analytics?${queryString}`),
        fetchJson(`/reports/inventory/analytics?${queryString}`),
        fetchJson(`/reports/orders/detailed?${queryString}`),
      ];

      if (preparedFilters.clientId) {
        apiCalls.push(fetchJson(`/reports/client/${preparedFilters.clientId}/analytics?${queryString}`));
      }
      if (preparedFilters.productId) {
        apiCalls.push(fetchJson(`/reports/product/${preparedFilters.productId}/analytics?${queryString}`));
      }
      if (preparedFilters.orderId) {
        apiCalls.push(fetchJson(`/reports/order/${preparedFilters.orderId}/analytics?${queryString}`));
      }

      const results = await Promise.allSettled(apiCalls);
      const settledResults = results.map((result) => (result.status === "fulfilled" ? result.value : null));
      const failedResults = results.filter((result) => result.status === "rejected");

      failedResults.forEach((result) => {
        console.warn("Reports request failed:", result.reason);
      });

      const hasAnyData = settledResults.some((value) => {
        if (Array.isArray(value)) return value.length > 0;
        if (value && typeof value === "object") return Object.keys(value).length > 0;
        return Boolean(value);
      });

      if (!hasAnyData && failedResults.length) {
        throw new Error(failedResults[0].reason?.message || "Unable to load reports.");
      }

      const ordersSummary = settledResults[0] || {};
      const salesTrend = settledResults[1] || [];
      const salesByClient = settledResults[2] || [];
      const salesByProduct = settledResults[3] || [];
      const production = settledResults[4] || { summary: {}, timeSeries: [], byProduct: [], statusBreakdown: [] };
      const inventory = settledResults[5] || { summary: {}, stockByMaterial: [], stockByCategory: [], lowStockMaterials: [] };
      const detailedOrders = settledResults[6] || [];
      const clientAnalytics = preparedFilters.clientId ? settledResults[7] || null : null;
      const productAnalytics = preparedFilters.productId ? settledResults[7 + (preparedFilters.clientId ? 1 : 0)] || null : null;
      const orderAnalytics = preparedFilters.orderId ? settledResults[7 + (preparedFilters.clientId ? 1 : 0) + (preparedFilters.productId ? 1 : 0)] || null : null;

      setDashboard({
        ordersSummary,
        salesTrend,
        ordersTrend: salesTrend.map((item) => ({ period: item.period, orders: item.orders })),
        salesByClient,
        salesByProduct,
        orderStatus: [
          { name: "Pending", value: Number(ordersSummary.pendingOrders || 0) },
          { name: "Completed", value: Number(ordersSummary.completedOrders || 0) },
          { name: "Cancelled", value: Number(ordersSummary.cancelledOrders || 0) },
        ],
        production,
        inventory,
        clientAnalytics,
        productAnalytics,
        orderAnalytics,
        detailedOrders,
      });
    } catch (err) {
      console.error("Reports dashboard error:", err);
      setError(err.message || "Unable to load reports.");
      setDashboard({
        ordersSummary: null,
        salesTrend: [],
        ordersTrend: [],
        salesByClient: [],
        salesByProduct: [],
        orderStatus: [],
        production: null,
        inventory: null,
        clientAnalytics: null,
        productAnalytics: null,
        detailedOrders: [],
        orderAnalytics: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadLookupData = async () => {
      try {
        const [clientsData, productsData] = await Promise.all([
          fetchJson("/clients"),
          fetchJson("/products"),
        ]);

        const normalizedClients = (Array.isArray(clientsData) ? clientsData : clientsData.clients || []).map((client) => ({
          ...client,
          name: client.name || client.client_name || "Unnamed client",
          client_name: client.client_name || client.name || "Unnamed client",
        }));

        const normalizedProducts = (Array.isArray(productsData) ? productsData : productsData.products || []).map((product) => ({
          ...product,
          product_name: product.product_name || product.name || "Unnamed product",
        }));

        setClients(normalizedClients);
        setProducts(normalizedProducts);
      } catch (err) {
        console.error("Lookup load error:", err);
      }
    };

    loadLookupData();
handleApplyFilters(createDefaultFilters());
  }, [handleApplyFilters]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => ({ label: new Date(2024, index, 1).toLocaleString("en-US", { month: "long" }), value: index + 1 }));
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => currentYear - 6 + index);
  }, []);

  const kpis = [
    { label: "Total Orders", value: dashboard.ordersSummary?.totalOrders ?? 0 },
    { label: "Total Sales Amount", value: `₹${currency(dashboard.ordersSummary?.totalSalesAmount ?? 0)}` },
    { label: "Average Order Value", value: `₹${currency(dashboard.ordersSummary?.averageOrderValue ?? 0)}` },
    { label: "Total Items Sold", value: numberFormat(dashboard.ordersSummary?.totalItemsSold ?? 0) },
    { label: "Completed Orders", value: dashboard.ordersSummary?.completedOrders ?? 0 },
    { label: "Pending Orders", value: dashboard.ordersSummary?.pendingOrders ?? 0 },
    { label: "Cancelled Orders", value: dashboard.ordersSummary?.cancelledOrders ?? 0 },
    { label: "Total Customers With Orders", value: dashboard.ordersSummary?.totalCustomersWithOrders ?? 0 },
  ];

  const activeFilters = [
    filters.dateMode !== "allTime" && (filters.dateMode === "month" ? `${monthOptions.find((item) => item.value === filters.month)?.label} ${filters.year}` : filters.dateMode === "year" ? String(filters.year) : `${filters.fromDate || "Start"} to ${filters.toDate || "today"}`),
    filters.clientId && `Client: ${clients.find((client) => String(client.id) === String(filters.clientId))?.name || filters.clientId}`,
    filters.productId && `Product: ${products.find((product) => String(product.id) === String(filters.productId))?.product_name || filters.productId}`,
    filters.status !== "All" && `Status: ${filters.status}`,
    filters.orderId && `Order #${filters.orderId}`,
  ].filter(Boolean);

  const exportReport = () => {
    const rows = [
      ["Metric", "Value"],
      ...kpis.map((item) => [item.label, item.value]),
      [],
      ["Top product", "Revenue"],
      ...dashboard.salesByProduct.map((item) => [item.productName, currency(item.revenue)]),
      [],
      ["Top client", "Sales amount"],
      ...dashboard.salesByClient.map((item) => [item.clientName, currency(item.salesAmount)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    link.download = "safalcrm-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const updateFilter = (changes) => {
    setFilters((current) => normalizeFilters({ ...current, ...changes }));
  };

  const resetFilters = () => {
    const nextFilters = createDefaultFilters();
    setFilters(nextFilters);
    handleApplyFilters(nextFilters);
  };

  const chartTooltipStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid rgba(111, 66, 193, 0.12)",
    borderRadius: 12,
    boxShadow: "0 14px 30px rgba(31, 41, 55, 0.12)",
    color: "#1f2937",
  };

  const renderChartPlaceholder = (message) => (
    <div className="chart-empty-state">
      <span className="chart-empty-icon">◎</span>
      <span>{message}</span>
    </div>
  );

  const renderEmptyState = (title, message) => (
    <div className="empty-state state-panel">
      <div className="state-icon">◎</div>
      <div className="state-copy">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );

  return (
    <div>
      <PageIntro eyebrow="Business intelligence" title="Reports & Analytics" description="Sales, production, and inventory insight for better daily decisions." />

      <section className="card reports-filter-card">
        <div className="reports-filters">
          <div className="filter-group">
            <label>Date Range</label>
            <select value={filters.dateMode} onChange={(event) => updateFilter({ dateMode: event.target.value })}>
              <option value="allTime">All Time</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {filters.dateMode === "month" && (
            <>
              <div className="filter-group">
                <label>Month</label>
                <select value={filters.month} onChange={(event) => updateFilter({ month: Number(event.target.value), dateMode: "month" })}>
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Year</label>
                <select value={filters.year} onChange={(event) => updateFilter({ year: Number(event.target.value), dateMode: "month" })}>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {filters.dateMode === "year" && (
            <div className="filter-group">
              <label>Year</label>
              <select value={filters.year} onChange={(event) => updateFilter({ year: Number(event.target.value), dateMode: "year" })}>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {filters.dateMode === "custom" && (
            <>
              <div className="filter-group">
                <label>From Date</label>
                <input type="date" value={filters.fromDate} onChange={(event) => updateFilter({ fromDate: event.target.value, dateMode: "custom" })} />
              </div>
              <div className="filter-group">
                <label>From Time</label>
                <input type="time" step="1" value={filters.fromTime} onChange={(event) => updateFilter({ fromTime: event.target.value, dateMode: "custom" })} />
              </div>
              <div className="filter-group">
                <label>To Date</label>
                <input type="date" value={filters.toDate} onChange={(event) => updateFilter({ toDate: event.target.value, dateMode: "custom" })} />
              </div>
              <div className="filter-group">
                <label>To Time</label>
                <input type="time" step="1" value={filters.toTime} onChange={(event) => updateFilter({ toTime: event.target.value, dateMode: "custom" })} />
              </div>
            </>
          )}

          <div className="filter-group">
            <label>Client</label>
            <select value={filters.clientId} onChange={(event) => updateFilter({ clientId: event.target.value })}>
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name || client.client_name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Product</label>
            <select value={filters.productId} onChange={(event) => updateFilter({ productId: event.target.value })}>
              <option value="">All Products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.product_name || product.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Order Status</label>
            <select value={filters.status} onChange={(event) => updateFilter({ status: event.target.value })}>
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Order ID</label>
            <input type="number" min="1" value={filters.orderId} onChange={(event) => updateFilter({ orderId: event.target.value })} placeholder="Optional" />
          </div>
        </div>

        <div className="report-actions">
          <button className="btn primary" onClick={() => handleApplyFilters(normalizeFilters(filters))} disabled={loading}>Apply Filters</button>
          <button className="btn secondary" onClick={resetFilters}>Reset</button>
          <button className="btn secondary" onClick={exportReport} disabled={loading || !dashboard.ordersSummary}>Export CSV</button>
        </div>
      </section>

      {loading ? (
        renderEmptyState("Loading analytics", "Preparing charts, KPIs, and trends…")
      ) : error ? (
        renderEmptyState("Reports unavailable", error)
      ) : !dashboard.ordersSummary ? (
        renderEmptyState("No data for this filter set", "Try broadening the date range or clearing selected filters.")
      ) : (
        <>
          <div className="reports-summary-bar">
            <div><strong>Report overview</strong><span>{activeFilters.length ? activeFilters.join(" · ") : "All-time view across all clients and products"}</span></div>
            <span>{dashboard.salesTrend.length} reporting period{dashboard.salesTrend.length === 1 ? "" : "s"}</span>
          </div>
          <section className="kpi-grid">
            {kpis.map((item) => (
              <div className="kpi-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </section>

          <section className="card chart-panel">
            <div className="card-header"><h2>Sales Over Time</h2></div>
            <div className="chart-shell">
              {dashboard.salesTrend.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dashboard.salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${currency(value)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#6F42C1" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                renderChartPlaceholder("No sales data for the selected period.")
              )}
            </div>
          </section>

          <section className="card chart-panel">
            <div className="card-header"><h2>Orders Over Time</h2></div>
            <div className="chart-shell">
              {dashboard.ordersTrend.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dashboard.ordersTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="#198754" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                renderChartPlaceholder("No order trend data available.")
              )}
            </div>
          </section>

          <div className="two-col-grid">
            <section className="card chart-panel">
              <div className="card-header"><h2>Sales By Client</h2></div>
              <div className="chart-shell">
                {dashboard.salesByClient.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dashboard.salesByClient.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9e2f7" />
                      <XAxis dataKey="clientName" angle={-15} textAnchor="end" height={70} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip formatter={(value) => `₹${currency(value)}`} contentStyle={chartTooltipStyle} labelStyle={{ color: '#111827', fontWeight: 600 }} itemStyle={{ color: '#475467' }} />
                      <Bar dataKey="salesAmount" fill="#6F42C1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  renderChartPlaceholder("No client sales recorded.")
                )}
              </div>
            </section>

            <section className="card chart-panel">
              <div className="card-header"><h2>Sales By Product</h2></div>
              <div className="chart-shell">
                {dashboard.salesByProduct.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dashboard.salesByProduct.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dfeaf7" />
                      <XAxis dataKey="productName" angle={-15} textAnchor="end" height={70} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip formatter={(value) => `₹${currency(value)}`} contentStyle={chartTooltipStyle} labelStyle={{ color: '#111827', fontWeight: 600 }} itemStyle={{ color: '#475467' }} />
                      <Bar dataKey="revenue" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  renderChartPlaceholder("No product revenue data available.")
                )}
              </div>
            </section>
          </div>

          <div className="two-col-grid">
            <section className="card chart-panel">
              <div className="card-header"><h2>Order Status Distribution</h2></div>
              <div className="chart-shell compact-chart">
                {dashboard.orderStatus.length && dashboard.orderStatus.some((entry) => Number(entry.value) > 0) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={dashboard.orderStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={90} paddingAngle={3}>
                        {dashboard.orderStatus.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#111827', fontWeight: 600 }} itemStyle={{ color: '#475467' }} />
                      <Legend wrapperStyle={{ paddingTop: 12, fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  renderChartPlaceholder("No order status data to visualize.")
                )}
              </div>
            </section>

            <section className="card chart-panel">
              <div className="card-header"><h2>Top Clients</h2></div>
              <div className="chart-shell">
                {dashboard.salesByClient.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dashboard.salesByClient.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f7e6bf" />
                      <XAxis dataKey="clientName" angle={-15} textAnchor="end" height={70} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip formatter={(value) => `₹${currency(value)}`} contentStyle={chartTooltipStyle} labelStyle={{ color: '#111827', fontWeight: 600 }} itemStyle={{ color: '#475467' }} />
                      <Bar dataKey="salesAmount" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  renderChartPlaceholder("No top-clients data for this filter set.")
                )}
              </div>
            </section>
          </div>

          <div className="two-col-grid">
            <section className="card chart-panel">
              <div className="card-header"><h2>Top Products</h2></div>
              <div className="chart-shell">
                {dashboard.salesByProduct.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dashboard.salesByProduct.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dfeee5" />
                      <XAxis dataKey="productName" angle={-15} textAnchor="end" height={70} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip formatter={(value) => `₹${currency(value)}`} contentStyle={chartTooltipStyle} labelStyle={{ color: '#111827', fontWeight: 600 }} itemStyle={{ color: '#475467' }} />
                      <Bar dataKey="revenue" fill="#198754" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  renderChartPlaceholder("No product performance data to display.")
                )}
              </div>
            </section>

            <section className="card chart-panel">
              <div className="card-header"><h2>Production Analytics</h2></div>
              <div className="chart-shell">
                {dashboard.production?.timeSeries?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={dashboard.production.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dfeee5" />
                      <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#111827', fontWeight: 600 }} itemStyle={{ color: '#475467' }} />
                      <Line type="monotone" dataKey="unitsProduced" stroke="#2E7D32" strokeWidth={3} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#2E7D32', strokeWidth: 2, fill: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  renderChartPlaceholder("No production trend data in this filter range.")
                )}
              </div>
            </section>
          </div>

          <div className="two-col-grid">
            <section className="card chart-panel">
              <div className="card-header"><h2>Inventory Stock By Material</h2></div>
              <div className="chart-shell">
                {dashboard.inventory?.stockByMaterial?.length ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dashboard.inventory.stockByMaterial}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9e2f7" />
                      <XAxis dataKey="materialName" angle={-15} textAnchor="end" height={70} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis allowDecimals tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#111827', fontWeight: 600 }} itemStyle={{ color: '#475467' }} />
                      <Bar dataKey="currentStock" fill="#59339D" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  renderChartPlaceholder("No material stock information available.")
                )}
              </div>
            </section>

            <section className="card chart-panel">
              <div className="card-header"><h2>Inventory Stock By Category</h2></div>
              <div className="chart-shell">
                {dashboard.inventory?.stockByCategory?.length ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dashboard.inventory.stockByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dfeaf7" />
                      <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis allowDecimals tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#111827', fontWeight: 600 }} itemStyle={{ color: '#475467' }} />
                      <Bar dataKey="totalStock" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  renderChartPlaceholder("No inventory category totals for this view.")
                )}
              </div>
            </section>
          </div>

          <section className="card chart-panel">
            <div className="card-header"><h2>Filtered Order Details</h2><span className="section-count">{dashboard.detailedOrders.length} orders</span></div>
            {dashboard.detailedOrders.length ? <div className="table-responsive"><table className="table"><thead><tr><th>Order ID</th><th>Client</th><th>Order Date & Time</th><th>Products</th><th>Quantity</th><th>Amount</th><th>Status</th></tr></thead><tbody>
              {dashboard.detailedOrders.map((order) => <tr key={order.orderId}><td>#{order.orderId}</td><td>{order.clientName}</td><td>{order.orderDate || "—"}</td><td>{order.products}</td><td>{numberFormat(order.quantity)}</td><td>₹{currency(order.amount)}</td><td><span className={`status-badge ${String(order.status || "").toLowerCase()}`}>{order.status}</span></td></tr>)}
            </tbody></table></div> : <div className="inline-empty">No orders match the current filters.</div>}
          </section>

          {dashboard.clientAnalytics && (
            <section className="card chart-panel">
              <div className="card-header"><h2>Client Analytics</h2></div>
              <div className="detail-grid">
                <div><strong>Name:</strong> {dashboard.clientAnalytics.client?.name}</div>
                <div><strong>Company:</strong> {dashboard.clientAnalytics.client?.company || "—"}</div>
                <div><strong>Phone:</strong> {dashboard.clientAnalytics.client?.phone || "—"}</div>
                <div><strong>Email:</strong> {dashboard.clientAnalytics.client?.email || "—"}</div>
                <div><strong>Total Orders:</strong> {dashboard.clientAnalytics.client?.totalOrders}</div>
                <div><strong>Total Purchase Amount:</strong> ₹{currency(dashboard.clientAnalytics.client?.totalPurchaseAmount)}</div>
                <div><strong>Average Order Value:</strong> ₹{currency(dashboard.clientAnalytics.client?.averageOrderValue)}</div>
                <div><strong>Total Products Purchased:</strong> {dashboard.clientAnalytics.client?.totalProductsPurchased}</div>
                <div><strong>Last Order Date:</strong> {dashboard.clientAnalytics.client?.lastOrderDate || "—"}</div>
              </div>
            </section>
          )}

          {dashboard.orderAnalytics && (
            <section className="card chart-panel">
              <div className="card-header"><h2>Order Details Analytics</h2></div>
              <div className="detail-grid">
                <div><strong>Order ID:</strong> {dashboard.orderAnalytics.order?.orderId}</div>
                <div><strong>Client:</strong> {dashboard.orderAnalytics.order?.client}</div>
                <div><strong>Order Date:</strong> {dashboard.orderAnalytics.order?.orderDate}</div>
                <div><strong>Status:</strong> {dashboard.orderAnalytics.order?.status}</div>
                <div><strong>Total Amount:</strong> ₹{currency(dashboard.orderAnalytics.order?.totalAmount)}</div>
                <div><strong>Number of Products:</strong> {dashboard.orderAnalytics.order?.numberOfProducts}</div>
                <div><strong>Total Quantity:</strong> {dashboard.orderAnalytics.order?.totalQuantity}</div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.orderAnalytics.items || []).map((item, index) => (
                      <tr key={`${item.productName}-${index}`}>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>₹{currency(item.unitPrice)}</td>
                        <td>₹{currency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {dashboard.productAnalytics && (
            <section className="card chart-panel">
              <div className="card-header"><h2>Product Analytics</h2></div>
              <div className="detail-grid">
                <div><strong>Product Name:</strong> {dashboard.productAnalytics.product?.productName}</div>
                <div><strong>Product Code:</strong> {dashboard.productAnalytics.product?.productCode}</div>
                <div><strong>Selling Price:</strong> ₹{currency(dashboard.productAnalytics.product?.sellingPrice)}</div>
                <div><strong>Total Units Sold:</strong> {dashboard.productAnalytics.product?.totalUnitsSold}</div>
                <div><strong>Total Revenue:</strong> ₹{currency(dashboard.productAnalytics.product?.totalRevenue)}</div>
                <div><strong>Number of Orders:</strong> {dashboard.productAnalytics.product?.numberOfOrders}</div>
                <div><strong>Number of Clients:</strong> {dashboard.productAnalytics.product?.numberOfClients}</div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
