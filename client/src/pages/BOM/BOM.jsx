
import React, { useState, useEffect, useCallback } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../services/api";

const emptyForm = {
  product_id: "",
  material_id: "",
  quantity_required: "",
};

const BOM = () => {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [bomItems, setBomItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadProducts = useCallback(async () => {
    try {
      const data = await fetchJson("/products");
      const list = Array.isArray(data) ? data : [];
      setProducts(list);

      if (!selectedProduct && list.length > 0) {
        setSelectedProduct(String(list[0].id));
      }
    } catch (err) {
      setError(err.message || "Unable to load products.");
    }
  }, [selectedProduct]);

  const loadMaterials = async () => {
    try {
      const data = await fetchJson("/materials");
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        (current) => current || (err.message || "Unable to load materials.")
      );
    }
  };

  const loadBom = async (productId) => {
    if (!productId) {
      setBomItems([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchJson(`/bom/${productId}`);
      setBomItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load BOM.");
      setBomItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadMaterials();
  }, [loadProducts]);

  useEffect(() => {
    if (selectedProduct) {
      setForm((current) => ({
        ...current,
        product_id: String(selectedProduct),
      }));
      loadBom(selectedProduct);
    } else {
      setBomItems([]);
    }
  }, [selectedProduct]);

  const resetForm = () => {
    setForm({
      product_id: selectedProduct ? String(selectedProduct) : "",
      material_id: "",
      quantity_required: "",
    });
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const validateForm = () => {
    if (!form.product_id || Number(form.product_id) <= 0) {
      return "Product is required.";
    }

    if (!form.material_id || Number(form.material_id) <= 0) {
      return "Material is required.";
    }

    const quantity = Number(form.quantity_required);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return "Quantity must be greater than 0.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        product_id: Number(form.product_id),
        material_id: Number(form.material_id),
        quantity_required: Number(form.quantity_required),
      };

      if (editingId) {
        await putJson(`/bom/${editingId}`, payload);
        setSuccess("BOM item updated successfully.");
      } else {
        await postJson("/bom", payload);
        setSuccess("BOM item added successfully.");
      }

      resetForm();

      if (selectedProduct) {
        await loadBom(selectedProduct);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      product_id: String(item.product_id || selectedProduct),
      material_id: String(item.material_id || ""),
      quantity_required: String(item.quantity_required ?? ""),
    });

    setEditingId(item.id);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Remove this BOM item for ${item.material_name || "material"}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteJson(`/bom/${item.id}`);
      setSuccess("BOM item deleted successfully.");

      if (editingId === item.id) {
        resetForm();
      }

      if (selectedProduct) {
        await loadBom(selectedProduct);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const productName =
    products.find(
      (product) => String(product.id) === String(selectedProduct)
    )?.product_name || "";

  const filteredBom = bomItems.filter((item) => {
    const q = query.trim().toLowerCase();

    if (!q) return true;

    return [item.material_name, item.material_code, item.unit]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(q));
  });

  return (
    <div>
      <header className="page-header">
        <h1>Bill of Materials</h1>
        <p className="muted">
          Define materials required to build each product.
        </p>
      </header>

      <div className="toolbar">
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>Select Product</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">-- Select Product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.product_name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {(error || success) && (
        <div style={{ marginBottom: "16px" }}>
          {error && <div className="empty-state">{error}</div>}
          {success && (
            <div
              className="empty-state"
              style={{
                borderColor: "#10b981",
                background: "#ecfdf5",
                color: "#065f46",
              }}
            >
              {success}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card card-form">
        <div className="card-header">
          <h2>{editingId ? "Edit BOM Item" : "Add BOM Item"}</h2>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Product *</label>
              <select
                value={form.product_id}
                onChange={handleChange("product_id")}
                disabled={!products.length}
                required
              >
                <option value="">-- Select Product --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Material *</label>
              <select
                value={form.material_id}
                onChange={handleChange("material_id")}
                required
              >
                <option value="">-- Select Material --</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.material_name} ({material.material_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity Required *</label>
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={form.quantity_required}
                onChange={handleChange("quantity_required")}
                required
              />
            </div>
          </div>
        </div>

        <div className="card-footer" style={{ justifyContent: "flex-end" }}>
          <button
            type="submit"
            className="btn primary"
            disabled={saving || !selectedProduct}
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Update BOM Item"
                : "Save BOM Item"}
          </button>
        </div>
      </form>

      <section className="page-body">
        {!selectedProduct ? (
          <div className="empty-state">Select a product to view the BOM.</div>
        ) : loading ? (
          <div className="empty-state">Loading BOM…</div>
        ) : (
          <>
            <div className="toolbar" style={{ marginBottom: "12px" }}>
              <input
                className="search"
                placeholder="Search materials in this BOM"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {filteredBom.length === 0 ? (
              <div className="empty-state">
                {productName
                  ? `No BOM items found for ${productName}.`
                  : "No BOM items found."}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Quantity Required</th>
                      <th>Unit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBom.map((item) => (
                      <tr key={item.id}>
                        <td>{item.material_name || "—"}</td>
                        <td>{item.quantity_required ?? "—"}</td>
                        <td>{item.unit || "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => handleDelete(item)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default BOM;
