import React, { useState, useEffect, useCallback } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../services/api";
import PageIntro from "../../components/PageIntro";

const emptyMaterial = {
  material_code: "",
  material_name: "",
  category: "",
  unit: "",
  current_stock: "",
  minimum_stock: "",
  material_source: "OWN",
  client_id: "",
};

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState(emptyMaterial);
  const [editingId, setEditingId] = useState(null);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchJson(`/materials${showArchived ? "?archived=true" : ""}`);
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.message || "Unable to load materials.");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);
  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    fetchJson("/clients").then((data) => setClients(Array.isArray(data) ? data : [])).catch(() => {});
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
    if (form.material_source === "CLIENT" && !form.client_id) {
      return "Select the client that supplied this material.";
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
        material_source: form.material_source,
        client_id: form.material_source === "CLIENT" ? Number(form.client_id) : null,
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
      material_source: material.material_source || "OWN",
      client_id: material.client_id?.toString() ?? "",
    });
    setEditingId(material.id);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (material) => {
    const confirmed = window.confirm(
      `Archive material ${material.material_code}? It will leave active inventory and cannot be used for new BOMs. Existing production history will be preserved.`
    );
    if (!confirmed) return;
    setError("");
    setSuccess("");

    try {
      await deleteJson(`/materials/${material.id}`);
      setSuccess("Material archived successfully.");
      if (editingId === material.id) {
        resetForm();
      }
      await loadMaterials();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRestore = async (material) => {
    setError("");
    setSuccess("");
    try {
      await putJson(`/materials/${material.id}/restore`, {});
      setSuccess("Material restored successfully.");
      await loadMaterials();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePermanentlyDelete = async (material) => {
    const confirmed = window.confirm(
      `Permanently delete ${material.material_code}? This cannot be undone and will also remove its BOM entries. Materials with production history cannot be permanently deleted.`
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    try {
      await deleteJson(`/materials/${material.id}/permanent`);
      setSuccess("Material permanently deleted.");
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
      <PageIntro eyebrow="Inventory control" title="Materials & Inventory" description="Manage raw materials, stock levels, and inventory settings." />

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
          <button className="btn" type="button" onClick={() => setShowArchived((current) => !current)}>
            {showArchived ? "Show Active Materials" : "Show Archived Materials"}
          </button>
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
              <input type="number" min="0" step="any" value={form.current_stock} onChange={handleChange("current_stock")} required />
            </div>
            <div className="form-group">
              <label>Minimum Stock *</label>
              <input type="number" min="0" step="any" value={form.minimum_stock} onChange={handleChange("minimum_stock")} required />
            </div>
            <div className="form-group">
              <label>Material Source *</label>
              <select value={form.material_source} onChange={handleChange("material_source")}>
                <option value="OWN">Company / Own Material</option>
                <option value="CLIENT">Client-Provided Material</option>
              </select>
            </div>
            {form.material_source === "CLIENT" && <div className="form-group">
              <label>Client *</label>
              <select value={form.client_id} onChange={handleChange("client_id")} required>
                <option value="">-- Select Client --</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.client_name}</option>)}
              </select>
            </div>}
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
        ) : loadError ? (
          <div className="empty-state">Unable to load materials: {loadError}</div>
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
                  <th>Source / Client</th>
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
                  const status = currentStock <= 0 ? "Out of Stock" : currentStock <= minimumStock ? "Low Stock" : "In Stock";
                  return (
                    <tr key={material.id || material.material_code}>
                      <td>{material.material_code || "—"}</td>
                      <td>{material.material_name || "—"}</td>
                      <td>{material.category || "—"}</td>
                      <td>{material.material_source === "CLIENT" ? `Client · ${material.client_name || "Client not set"}` : "Own"}</td>
                      <td>{material.unit || "—"}</td>
                      <td>{material.current_stock ?? "—"}</td>
                      <td>{material.minimum_stock ?? "—"}</td>
                      <td>{status}</td>
                      <td>
                        {showArchived ? (
                          <>
                            <button type="button" className="btn" onClick={() => handleRestore(material)}>
                              Restore
                            </button>
                            <button type="button" className="btn danger" onClick={() => handlePermanentlyDelete(material)}>
                              Permanently Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn" onClick={() => handleEdit(material)}>
                              Edit
                            </button>
                            <button type="button" className="btn danger" onClick={() => handleDelete(material)}>
                              Archive
                            </button>
                          </>
                        )}
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
