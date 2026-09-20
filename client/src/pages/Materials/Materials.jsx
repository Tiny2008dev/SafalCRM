import React, { useState, useEffect } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../services/api";

const emptyMaterial = {
  material_code: "",
  material_name: "",
  category: "",
  unit: "",
  current_stock: "",
  minimum_stock: "",
};

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyMaterial);
  const [editingId, setEditingId] = useState(null);

  const loadMaterials = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson("/materials");
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const resetForm = () => {
    setForm(emptyMaterial);
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const validateForm = () => {
    if (!form.material_code.trim()) {
      return "Material code is required.";
    }
    if (!form.material_name.trim()) {
      return "Material name is required.";
    }
    if (!form.category.trim()) {
      return "Category is required.";
    }
    if (!form.unit.trim()) {
      return "Unit is required.";
    }
    const currentStock = Number(form.current_stock);
    const minimumStock = Number(form.minimum_stock);
    if (!Number.isFinite(currentStock) || currentStock < 0) {
      return "Current stock must be a non-negative number.";
    }
    if (!Number.isFinite(minimumStock) || minimumStock < 0) {
      return "Minimum stock must be a non-negative number.";
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
        material_code: form.material_code.trim(),
        material_name: form.material_name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        current_stock: Number(form.current_stock),
        minimum_stock: Number(form.minimum_stock),
      };

      if (editingId) {
        await putJson(`/materials/${editingId}`, payload);
        setSuccess("Material updated successfully.");
      } else {
        await postJson("/materials", payload);
        setSuccess("Material added successfully.");
      }
      resetForm();
      await loadMaterials();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (material) => {
    setForm({
      material_code: material.material_code || "",
      material_name: material.material_name || "",
      category: material.category || "",
      unit: material.unit || "",
      current_stock: material.current_stock?.toString() ?? "",
      minimum_stock: material.minimum_stock?.toString() ?? "",
    });
    setEditingId(material.id);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (material) => {
    const confirmed = window.confirm(`Delete material ${material.material_code}?`);
    if (!confirmed) return;
    setError("");
    setSuccess("");

    try {
      await deleteJson(`/materials/${material.id}`);
      setSuccess("Material deleted successfully.");
      if (editingId === material.id) {
        resetForm();
      }
      await loadMaterials();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = materials.filter((material) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [
      material.material_code,
      material.material_name,
      material.category,
      material.unit,
    ]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(q));
  });

  return (
    <div>
      <header className="page-header">
        <h1>Materials & Inventory</h1>
        <p className="muted">Manage raw materials, stock levels, and inventory settings.</p>
      </header>

      <div className="toolbar">
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn primary" type="button" onClick={resetForm}>
            {editingId ? "New Material" : "Add Material"}
          </button>
          <input
            className="search"
            placeholder="Search materials by code, name, category, or unit"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {(error || success) && (
        <div style={{ marginBottom: "16px" }}>
          {error && <div className="empty-state">{error}</div>}
          {success && <div className="empty-state" style={{ borderColor: "#10b981", background: "#ecfdf5", color: "#065f46" }}>{success}</div>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card card-form">
        <div className="card-header">
          <h2>{editingId ? "Edit Material" : "Add Material"}</h2>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Material Code *</label>
              <input type="text" value={form.material_code} onChange={handleChange("material_code")} required />
            </div>
            <div className="form-group">
              <label>Material Name *</label>
              <input type="text" value={form.material_name} onChange={handleChange("material_name")} required />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <input type="text" value={form.category} onChange={handleChange("category")} required />
            </div>
            <div className="form-group">
              <label>Unit *</label>
              <input type="text" value={form.unit} onChange={handleChange("unit")} required />
            </div>
            <div className="form-group">
              <label>Current Stock *</label>
              <input type="number" min="0" value={form.current_stock} onChange={handleChange("current_stock")} required />
            </div>
            <div className="form-group">
              <label>Minimum Stock *</label>
              <input type="number" min="0" value={form.minimum_stock} onChange={handleChange("minimum_stock")} required />
            </div>
          </div>
        </div>

        <div className="card-footer" style={{ justifyContent: "flex-end" }}>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : editingId ? "Update Material" : "Save Material"}
          </button>
        </div>
      </form>

      <section className="page-body">
        {loading ? (
          <div className="empty-state">Loading materials…</div>
        ) : error ? (
          <div className="empty-state">Unable to load materials: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No materials found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Material</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((material) => {
                  const currentStock = Number(material.current_stock ?? 0);
                  const minimumStock = Number(material.minimum_stock ?? 0);
                  const status = currentStock <= minimumStock ? "Low Stock" : "In Stock";
                  return (
                    <tr key={material.id || material.material_code}>
                      <td>{material.material_code || "—"}</td>
                      <td>{material.material_name || "—"}</td>
                      <td>{material.category || "—"}</td>
                      <td>{material.unit || "—"}</td>
                      <td>{material.current_stock ?? "—"}</td>
                      <td>{material.minimum_stock ?? "—"}</td>
                      <td>{status}</td>
                      <td>
                        <button type="button" className="btn" onClick={() => handleEdit(material)}>
                          Edit
                        </button>
                        <button type="button" className="btn danger" onClick={() => handleDelete(material)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Materials;
