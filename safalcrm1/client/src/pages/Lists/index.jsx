import React, { useCallback, useEffect, useMemo, useState } from "react";
import { deleteJson, fetchJson, putJson } from "../../services/api";
import PageIntro from "../../components/PageIntro";

const listTypes = ["Clients", "Materials", "Products", "Orders", "BOM"];
const money = (value) => value == null ? "—" : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AdminListsPage = ({ onEditRequest }) => {
  const [activeList, setActiveList] = useState("Clients");
  const [clients, setClients] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bomItems, setBomItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [clientRows, materialRows, productRows, orderRows] = await Promise.all([
        fetchJson("/clients"),
        fetchJson(`/materials${archived ? "?archived=true" : ""}`),
        fetchJson("/products"),
        fetchJson("/orders"),
      ]);
      setClients(Array.isArray(clientRows) ? clientRows : []);
      setMaterials(Array.isArray(materialRows) ? materialRows : []);
      setProducts(Array.isArray(productRows) ? productRows : []);
      setOrders(Array.isArray(orderRows) ? orderRows : []);
      setSelectedProductId((current) => current || String(productRows[0]?.id || ""));
    } catch (err) {
      setError(err.message || "Unable to load admin lists.");
    } finally {
      setLoading(false);
    }
  }, [archived]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (activeList !== "BOM" || !selectedProductId) {
      setBomItems([]);
      return;
    }
    let active = true;
    fetchJson(`/bom/${selectedProductId}`)
      .then((rows) => {
        if (active) setBomItems(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load BOM list.");
      });
    return () => { active = false; };
  }, [activeList, selectedProductId]);

  const records = useMemo(() => {
    const list = {
      Clients: clients,
      Materials: materials,
      Products: products,
      Orders: orders,
      BOM: bomItems,
    }[activeList] || [];
    const query = search.trim().toLowerCase();
    return query ? list.filter((record) => JSON.stringify(record).toLowerCase().includes(query)) : list;
  }, [activeList, bomItems, clients, materials, orders, products, search]);

  const removeRecord = async (type, record) => {
    const label = type === "Orders" ? `order #${record.id}` : record.client_name || record.material_code || record.product_code || `${type} #${record.id}`;
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      const endpoint = type === "Orders" ? "orders" : `${type.toLowerCase()}`;
      await deleteJson(`/${endpoint}/${record.id}`);
      setSuccess(`${type.slice(0, -1)} deleted.`);
      await loadLists();
    } catch (err) {
      setError(err.message || `Unable to delete ${type.toLowerCase()}.`);
    }
  };

  const restoreMaterial = async (material) => {
    try {
      await putJson(`/materials/${material.id}/restore`, {});
      setSuccess("Material restored.");
      await loadLists();
    } catch (err) {
      setError(err.message || "Unable to restore material.");
    }
  };

  const permanentlyDeleteMaterial = async (material) => {
    if (!window.confirm(`Permanently delete ${material.material_code}? This cannot be undone.`)) return;
    try {
      await deleteJson(`/materials/${material.id}/permanent`);
      setSuccess("Material permanently deleted.");
      await loadLists();
    } catch (err) {
      setError(err.message || "Unable to permanently delete material.");
    }
  };

  const renderActions = (type, record) => (
    <td className="list-row-actions">
      {type === "Materials" && archived ? (
        <>
          <button className="btn" type="button" onClick={() => restoreMaterial(record)}>Restore</button>
          <button className="btn danger" type="button" onClick={() => permanentlyDeleteMaterial(record)}>Delete Permanently</button>
        </>
      ) : type === "BOM" ? (
        <button className="btn" type="button" onClick={() => onEditRequest(type, record)}>Edit</button>
      ) : (
        <>
          <button className="btn" type="button" onClick={() => onEditRequest(type, record)}>Edit</button>
          {type !== "BOM" && <button className="btn danger" type="button" onClick={() => removeRecord(type, record)}>Delete</button>}
        </>
      )}
    </td>
  );

  const renderRows = () => {
    if (activeList === "Clients") return records.map((client) => (
      <tr key={client.id}>
        <td>{client.client_name || "—"}</td><td>{client.company_name || "—"}</td><td>{client.gstin || "—"}</td>
        <td>{client.phone || "—"}</td><td>{client.email || "—"}</td><td>{client.office_address || client.address || "—"}</td>
        <td>{client.godown_address || "—"}</td><td>{client.city || "—"}</td>{renderActions("Clients", client)}
      </tr>
    ));
    if (activeList === "Materials") return records.map((material) => (
      <tr key={material.id}>
        <td>{material.material_code || "—"}</td><td>{material.material_name || "—"}</td><td>{material.category || "—"}</td>
        <td>{material.material_source === "CLIENT" ? material.client_name || "Client" : "Own"}</td><td>{material.unit || "—"}</td>
        <td>{material.vendor_name || "—"}</td><td>{money(material.material_rate)}</td><td>{material.current_stock ?? "—"}</td>
        <td>{material.minimum_stock ?? "—"}</td>{renderActions("Materials", material)}
      </tr>
    ));
    if (activeList === "Products") return records.map((product) => (
      <tr key={product.id}>
        <td>{product.product_code || "—"}</td><td>{product.product_name || "—"}</td><td>{product.size || "—"}</td>
        <td>{product.product_date ? String(product.product_date).slice(0, 10) : "—"}</td><td>{product.expiry_date ? String(product.expiry_date).slice(0, 10) : "—"}</td>
        <td>{product.client_name || "General"}</td><td>{money(product.selling_price)}</td>{renderActions("Products", product)}
      </tr>
    ));
    if (activeList === "Orders") return records.map((order) => (
      <tr key={order.id}>
        <td>#{order.id}</td><td>{order.client_name || "—"}</td>
        <td>{order.items?.map((item) => `${item.product_name} × ${item.quantity}`).join(", ") || "—"}</td>
        <td>{money(order.total_amount)}</td><td>{order.order_date || "—"}</td><td>{order.status || "—"}</td>
        {renderActions("Orders", order)}
      </tr>
    ));
    return records.map((item) => (
      <tr key={item.id}>
        <td>{item.material_code || "—"}</td><td>{item.material_name || "—"}</td>
        <td>{item.quantity_required ?? "—"}</td><td>{item.unit || "—"}</td>{renderActions("BOM", item)}
      </tr>
    ));
  };

  const headers = {
    Clients: ["Client", "Company", "GSTIN", "Phone", "Email", "Office Address", "Godown Address", "City", "Actions"],
    Materials: ["Code", "Material", "Category", "Source / Client", "Unit", "Vendor", "Rate / Unit", "Stock", "Min Stock", "Actions"],
    Products: ["Code", "Product", "Size", "Date", "Expiry Date", "Client", "Price", "Actions"],
    Orders: ["Order", "Client", "Products", "Amount", "Date", "Status", "Actions"],
    BOM: ["Material Code", "Material", "Quantity", "Unit", "Actions"],
  }[activeList];

  return (
    <div>
      <PageIntro title="Records" />
      <section className="card admin-lists-card">
        <div className="admin-list-toolbar">
          <div className="list-tabs" role="tablist" aria-label="Record lists">
            {listTypes.map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={activeList === type}
                className={`btn ${activeList === type ? "primary" : "secondary"}`}
                onClick={() => { setActiveList(type); setSearch(""); setError(""); setSuccess(""); }}
              >
                {type}
              </button>
            ))}
          </div>
          <input
            className="search"
            type="search"
            aria-label={`Search ${activeList}`}
            placeholder={`Search ${activeList.toLowerCase()}...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {activeList === "Materials" && (
            <button type="button" className="btn secondary" onClick={() => setArchived((value) => !value)}>
              {archived ? "Show Active" : "Show Archived"}
            </button>
          )}
          {activeList === "BOM" && (
            <select aria-label="Select product for BOM list" value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
              <option value="">Select product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
            </select>
          )}
        </div>
        {(error || success) && <div className="empty-state" role={error ? "alert" : "status"}>{error || success}</div>}
        {loading ? <div className="empty-state">Loading records…</div> : records.length === 0 ? (
          <div className="empty-state">No {activeList.toLowerCase()} found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
              <tbody>{renderRows()}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminListsPage;
