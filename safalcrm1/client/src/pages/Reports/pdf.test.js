import { buildReportSections, createReportPdf } from "./pdf";

const dashboard = {
  ordersSummary: {
    totalOrders: 4,
    totalSalesAmount: 1250,
    averageOrderValue: 312.5,
    totalItemsSold: 12,
    completedOrders: 2,
    pendingOrders: 1,
    cancelledOrders: 1,
    totalCustomersWithOrders: 3,
  },
  salesTrend: [{ period: "2026-10", orders: 4, sales: 1250 }],
  ordersTrend: [{ period: "2026-10", orders: 4 }],
  salesByClient: [{ clientName: "Acme", companyName: "Acme Ltd", orders: 2, salesAmount: 950 }],
  salesByProduct: [{ productName: "Perfume", unitsSold: 12, orders: 4, revenue: 1250 }],
  production: {
    summary: { totalProductionOrders: 3, totalUnitsProduced: 120, pendingProduction: 1, completedProduction: 2, cancelledProduction: 0 },
    timeSeries: [{ period: "2026-10", orders: 3, unitsProduced: 120 }],
    byProduct: [{ productName: "Perfume", unitsProduced: 120 }],
    statusBreakdown: [{ status: "Completed", count: 2 }],
  },
  inventory: {
    summary: { totalMaterials: 5, totalStock: 80, lowStockMaterials: 1, outOfStockMaterials: 0 },
    stockByMaterial: [{ materialName: "Bottle", category: "Packaging", currentStock: 20, minimumStock: 5 }],
    stockByCategory: [{ category: "Packaging", totalStock: 20 }],
    lowStockMaterials: [{ materialName: "Cap", category: "Packaging", currentStock: 2, minimumStock: 5 }],
  },
  detailedOrders: [{ orderId: 31, clientName: "Acme", orderDate: "2026-10-15", products: "Perfume", quantity: 12, amount: 950, status: "Completed" }],
  clientAnalytics: { client: { name: "Acme", company: "Acme Ltd", phone: "123", email: "buyer@example.com", totalOrders: 2, totalPurchaseAmount: 950, averageOrderValue: 475, totalProductsPurchased: 12, lastOrderDate: "2026-10-15" } },
  orderAnalytics: { order: { orderId: 31, client: "Acme", orderDate: "2026-10-15", status: "Completed", totalAmount: 950, numberOfProducts: 1, totalQuantity: 12 }, items: [{ productName: "Perfume", quantity: 12, unitPrice: 79.17, totalPrice: 950 }] },
  productAnalytics: { product: { productName: "Perfume", productCode: "P-1", sellingPrice: 79.17, totalUnitsSold: 12, totalRevenue: 950, numberOfOrders: 2, numberOfClients: 1 } },
};

test("includes every report dataset and drill-down section in the PDF data", () => {
  const sections = buildReportSections(dashboard);
  const names = sections.map((section) => section.title);
  expect(names).toEqual([
    "Sales and Order Summary",
    "Sales Over Time",
    "Orders Over Time",
    "Sales By Client",
    "Sales By Product",
    "Order Status Distribution",
    "Production Summary",
    "Production Over Time",
    "Production By Product",
    "Production Status Breakdown",
    "Inventory Summary",
    "Inventory Stock By Material",
    "Inventory Stock By Category",
    "Low-Stock Materials",
    "Filtered Order Details",
    "Client Analytics",
    "Order Analytics",
    "Order Product Details",
    "Product Analytics",
  ]);
  expect(sections.find((section) => section.title === "Sales By Client").rows[0]).toEqual(["Acme", "Acme Ltd", 2, "INR 950.00"]);
  expect(sections.find((section) => section.title === "Sales By Product").rows[0]).toEqual(["Perfume", 12, 4, "INR 1,250.00"]);
  expect(sections.find((section) => section.title === "Low-Stock Materials").rows[0]).toEqual(["Cap", "Packaging", 2, 5]);
});

test("creates a multipage PDF containing report details and selected filters", () => {
  const doc = createReportPdf({
    dashboard: {
      ...dashboard,
      detailedOrders: Array.from({ length: 80 }, (_, index) => ({
        orderId: index + 1,
        clientName: `Client ${index + 1}`,
        orderDate: "2026-10-15",
        products: "Perfume",
        quantity: 12,
        amount: 950,
        status: "Completed",
      })),
    },
    filters: ["October 2026", "Status: Completed"],
    generatedAt: new Date("2026-10-16T10:00:00.000Z"),
  });
  const output = doc.output();

  expect(doc.internal.getNumberOfPages()).toBeGreaterThan(1);
  expect(output).toContain("SAFAL CRM - Reports & Analytics");
  expect(output).toContain("Status: Completed");
  expect(output).toContain("Low-Stock Materials");
  expect(output).toContain("Client 80");
  expect(output).toContain("Page 2 of");
});
