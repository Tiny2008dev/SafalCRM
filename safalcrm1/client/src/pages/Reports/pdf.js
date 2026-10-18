import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const money = (value) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `INR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "INR 0.00";
};

const valueOrDash = (value) => value == null || value === "" ? "—" : String(value);
const rowsFor = (items, mapRow) => items?.length ? items.map(mapRow) : [["No records for this report."]];

export function buildReportSections(dashboard) {
  const summary = dashboard.ordersSummary || {};
  const production = dashboard.production || {};
  const inventory = dashboard.inventory || {};
  const orderStatus = [
    ["Pending", summary.pendingOrders ?? 0],
    ["Completed", summary.completedOrders ?? 0],
    ["Cancelled", summary.cancelledOrders ?? 0],
  ];
  const sections = [
    {
      title: "Sales and Order Summary",
      columns: ["Metric", "Value"],
      rows: [
        ["Total Orders", summary.totalOrders ?? 0],
        ["Total Sales Amount", money(summary.totalSalesAmount)],
        ["Average Order Value", money(summary.averageOrderValue)],
        ["Total Items Sold", summary.totalItemsSold ?? 0],
        ["Completed Orders", summary.completedOrders ?? 0],
        ["Pending Orders", summary.pendingOrders ?? 0],
        ["Cancelled Orders", summary.cancelledOrders ?? 0],
        ["Customers With Orders", summary.totalCustomersWithOrders ?? 0],
      ],
    },
    {
      title: "Sales Over Time",
      columns: ["Period", "Orders", "Sales Amount"],
      rows: rowsFor(dashboard.salesTrend, (item) => [valueOrDash(item.period), item.orders ?? 0, money(item.sales)]),
    },
    {
      title: "Orders Over Time",
      columns: ["Period", "Orders"],
      rows: rowsFor(dashboard.ordersTrend, (item) => [valueOrDash(item.period), item.orders ?? 0]),
    },
    {
      title: "Sales By Client",
      columns: ["Client", "Company", "Orders", "Sales Amount"],
      rows: rowsFor(dashboard.salesByClient, (item) => [
        valueOrDash(item.clientName), valueOrDash(item.companyName), item.orders ?? item.totalOrders ?? "—", money(item.salesAmount),
      ]),
    },
    {
      title: "Sales By Product",
      columns: ["Product", "Units Sold", "Orders", "Revenue"],
      rows: rowsFor(dashboard.salesByProduct, (item) => [
        valueOrDash(item.productName), item.unitsSold ?? item.quantity ?? item.totalQuantity ?? "—", item.orders ?? "—", money(item.revenue),
      ]),
    },
    {
      title: "Order Status Distribution",
      columns: ["Status", "Orders"],
      rows: orderStatus,
    },
    {
      title: "Production Summary",
      columns: ["Metric", "Value"],
      rows: [
        ["Total Production Orders", production.summary?.totalProductionOrders ?? 0],
        ["Total Units Produced", production.summary?.totalUnitsProduced ?? 0],
        ["Pending Production", production.summary?.pendingProduction ?? 0],
        ["Completed Production", production.summary?.completedProduction ?? 0],
        ["Cancelled Production", production.summary?.cancelledProduction ?? 0],
      ],
    },
    {
      title: "Production Over Time",
      columns: ["Period", "Orders", "Units Produced"],
      rows: rowsFor(production.timeSeries, (item) => [valueOrDash(item.period), item.orders ?? 0, item.unitsProduced ?? 0]),
    },
    {
      title: "Production By Product",
      columns: ["Product", "Units Produced"],
      rows: rowsFor(production.byProduct, (item) => [valueOrDash(item.productName), item.unitsProduced ?? 0]),
    },
    {
      title: "Production Status Breakdown",
      columns: ["Status", "Production Orders"],
      rows: rowsFor(production.statusBreakdown, (item) => [valueOrDash(item.status), item.count ?? 0]),
    },
    {
      title: "Inventory Summary",
      columns: ["Metric", "Value"],
      rows: [
        ["Total Materials", inventory.summary?.totalMaterials ?? 0],
        ["Total Stock", inventory.summary?.totalStock ?? 0],
        ["Low-Stock Materials", inventory.summary?.lowStockMaterials ?? 0],
        ["Out-of-Stock Materials", inventory.summary?.outOfStockMaterials ?? 0],
      ],
    },
    {
      title: "Inventory Stock By Material",
      columns: ["Material", "Category", "Current Stock", "Minimum Stock"],
      rows: rowsFor(inventory.stockByMaterial, (item) => [valueOrDash(item.materialName), valueOrDash(item.category), item.currentStock ?? 0, item.minimumStock ?? 0]),
    },
    {
      title: "Inventory Stock By Category",
      columns: ["Category", "Total Stock"],
      rows: rowsFor(inventory.stockByCategory, (item) => [valueOrDash(item.category), item.totalStock ?? 0]),
    },
    {
      title: "Low-Stock Materials",
      columns: ["Material", "Category", "Current Stock", "Minimum Stock"],
      rows: rowsFor(inventory.lowStockMaterials, (item) => [valueOrDash(item.materialName), valueOrDash(item.category), item.currentStock ?? 0, item.minimumStock ?? 0]),
    },
    {
      title: "Filtered Order Details",
      columns: ["Order ID", "Client", "Date", "Products", "Quantity", "Amount", "Status"],
      rows: rowsFor(dashboard.detailedOrders, (item) => [
        valueOrDash(item.orderId), valueOrDash(item.clientName), valueOrDash(item.orderDate),
        valueOrDash(item.products), item.quantity ?? 0, money(item.amount), valueOrDash(item.status),
      ]),
    },
  ];

  if (dashboard.clientAnalytics) {
    const client = dashboard.clientAnalytics.client || {};
    sections.push({
      title: "Client Analytics",
      columns: ["Metric", "Value"],
      rows: [
        ["Name", valueOrDash(client.name)],
        ["Company", valueOrDash(client.company)],
        ["Phone", valueOrDash(client.phone)],
        ["Email", valueOrDash(client.email)],
        ["Total Orders", client.totalOrders ?? 0],
        ["Total Purchase Amount", money(client.totalPurchaseAmount)],
        ["Average Order Value", money(client.averageOrderValue)],
        ["Total Products Purchased", client.totalProductsPurchased ?? 0],
        ["Last Order Date", valueOrDash(client.lastOrderDate)],
      ],
    });
  }

  if (dashboard.orderAnalytics) {
    const order = dashboard.orderAnalytics.order || {};
    sections.push({
      title: "Order Analytics",
      columns: ["Metric", "Value"],
      rows: [
        ["Order ID", valueOrDash(order.orderId)],
        ["Client", valueOrDash(order.client)],
        ["Order Date", valueOrDash(order.orderDate)],
        ["Status", valueOrDash(order.status)],
        ["Total Amount", money(order.totalAmount)],
        ["Number of Products", order.numberOfProducts ?? 0],
        ["Total Quantity", order.totalQuantity ?? 0],
      ],
    });
    sections.push({
      title: "Order Product Details",
      columns: ["Product", "Quantity", "Unit Price", "Total"],
      rows: rowsFor(dashboard.orderAnalytics.items, (item) => [
        valueOrDash(item.productName), item.quantity ?? 0, money(item.unitPrice), money(item.totalPrice),
      ]),
    });
  }

  if (dashboard.productAnalytics) {
    const product = dashboard.productAnalytics.product || {};
    sections.push({
      title: "Product Analytics",
      columns: ["Metric", "Value"],
      rows: [
        ["Product Name", valueOrDash(product.productName)],
        ["Product Code", valueOrDash(product.productCode)],
        ["Selling Price", money(product.sellingPrice)],
        ["Total Units Sold", product.totalUnitsSold ?? 0],
        ["Total Revenue", money(product.totalRevenue)],
        ["Number of Orders", product.numberOfOrders ?? 0],
        ["Number of Clients", product.numberOfClients ?? 0],
      ],
    });
  }

  return sections;
}

export function createReportPdf({ dashboard, filters = [], generatedAt = new Date() }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const sections = buildReportSections(dashboard);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(49, 92, 76);
  doc.text("SAFAL CRM - Reports & Analytics", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 84);
  doc.text(`Generated: ${generatedAt.toLocaleString()}`, 14, 22);
  doc.text(`Filters: ${filters.length ? filters.join(" | ") : "All-time view across all clients and products"}`, 14, 28, { maxWidth: pageWidth - 28 });

  let cursorY = 36;
  sections.forEach((section) => {
    if (cursorY > pageHeight - 24) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(49, 92, 76);
    doc.text(section.title, 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 3,
      head: [section.columns],
      body: section.rows,
      margin: { left: 14, right: 14, top: 14, bottom: 14 },
      theme: "grid",
      styles: { font: "helvetica", fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [49, 92, 76], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 249, 246] },
    });
    cursorY = doc.lastAutoTable.finalY + 9;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 118, 112);
    doc.text("Safal CRM | Confidential business report", 14, pageHeight - 7);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: "right" });
  }

  return doc;
}

export function downloadReportPdf(options) {
  const doc = createReportPdf(options);
  doc.save(`safalcrm-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
