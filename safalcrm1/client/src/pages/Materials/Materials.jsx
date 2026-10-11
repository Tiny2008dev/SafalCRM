import React, { useState, useEffect, useCallback } from "react";
import { fetchJson, postJson, putJson } from "../../services/api";
import PageIntro from "../../components/PageIntro";
import SearchResults from "../../components/SearchResults";

const emptyMaterial = {
  material_code: "",
  material_name: "",
  category: "",
  unit: "",
  current_stock: "",
  minimum_stock: "",
  vendor_name: "",
  material_rate: "",
  material_source: "OWN",
  client_id: "",
};

const Materials = ({ editRecord, onEditConsumed }) => {
  const [materials, setMaterials] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState(emptyMaterial);
  const [editingId, setEditingId] = useState(null);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`/materials${showArchived ? "?archived=true" : ""}`);
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load materials.");
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
    if (form.material_rate !== "" && (!Number.isFinite(Number(form.material_rate)) || Number(form.material_rate) < 0)) {
      return "Material rate must be a non-negative number.";
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
        vendor_name: form.vendor_name.trim(),
        material_rate: form.material_rate === "" ? null : Number(form.material_rate),
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

  const handleEdit = useCallback((material) => {
    setForm({
      material_code: material.material_code || "",
      material_name: material.material_name || "",
      category: material.category || "",
      unit: material.unit || "",
      current_stock: material.current_stock?.toString() ?? "",
      minimum_stock: material.minimum_stock?.toString() ?? "",
      vendor_name: material.vendor_name || "",
      material_rate: material.material_rate?.toString() ?? "",
      material_source: material.material_source || "OWN",
      client_id: material.client_id?.toString() ?? "",
    });
    setEditingId(material.id);
    setError("");
    setSuccess("");
  }, []);

  useEffect(() => {
    if (editRecord?.type === "Materials") {
      handleEdit(editRecord.value);
      onEditConsumed?.();
    }
  }, [editRecord, handleEdit, onEditConsumed]);

  const filtered = materials.filter((material) => {
    const q = appliedQuery.trim().toLowerCase();
    if (!q) return true;
    return [
      material.material_code,
      material.material_name,
      material.category,
      material.unit,
      material.vendor_name,
    ]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(q));
  });

  return (
    <div>
      <PageIntro title="Materials & Inventory" />
      <div className="toolbar search-toolbar">
        <div className="toolbar-actions">
          <button className="btn primary" type="button" onClick={resetForm}>
            {editingId ? "New Material" : "Add Material"}
          </button>
          <form className="search-control" onSubmit={(event) => { event.preventDefault(); setAppliedQuery(query); }}>
          <input
            type="search"
            className="search"
            aria-label="Search materials"
            placeholder="Search code, name, category, vendor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
            <button type="submit" className="btn secondary search-submit">Search</button>
          </form>
          <button className="btn" type="button" onClick={() => setShowArchived((current) => !current)}>
            {showArchived ? "Show Active Materials" : "Show Archived Materials"}
          </button>
        </div>
      </div>

      <SearchResults
        query={appliedQuery}
        title="Material search results"
        loading={loading}
        results={filtered.map((material) => ({
          id: material.id,
          label: `${material.material_code || ""} ${material.material_name || "Unnamed material"}`.trim(),
          detail: [
            material.category,
            material.unit,
            material.vendor_name,
            material.current_stock != null ? `Stock: ${material.current_stock}` : null,
          ].filter(Boolean).join(" · "),
        }))}
      />

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
              <label>Vendor Name</label>
              <input type="text" value={form.vendor_name} onChange={handleChange("vendor_name")} />
            </div>
            <div className="form-group">
              <label>Material Rate (per unit)</label>
              <input type="number" min="0" step="any" value={form.material_rate} onChange={handleChange("material_rate")} />
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

    </div>
  );
};

export default Materials;
