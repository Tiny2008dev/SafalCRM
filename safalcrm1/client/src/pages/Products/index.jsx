import React, { useState, useEffect, useCallback } from 'react';
import { fetchJson, postJson, putJson } from '../../services/api';
import PageIntro from '../../components/PageIntro';
import SearchResults from '../../components/SearchResults';

const emptyProduct = {
  product_code: '',
  product_name: '',
  size: '',
  product_date: '',
  expiry_date: '',
  description: '',
  selling_price: '',
  client_id: '',
};

const ProductsPage = ({ editRecord, onEditConsumed }) => {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);

  const productNameOptions = [
    'Velvet Bloom',
    'Noir Saffron',
    'Rose Alchemy',
    'Amber Veil',
    'Citrus Muse',
    'Midnight Oud',
    'Golden Petals',
    'Pearl Mist',
    'White Woods',
    'Signature Elixir',
  ];

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    fetchJson('/clients').then((data) => setClients(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const resetForm = () => {
    setForm(emptyProduct);
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const validateForm = () => {
    if (!form.product_code.trim()) {
      return 'Product code is required.';
    }
    if (!form.product_name.trim()) {
      return 'Product name is required.';
    }
    if (!form.size.trim()) {
      return 'Size is required.';
    }

    const sellingPrice = Number(form.selling_price);
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      return 'Selling price must be 0 or greater.';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        product_code: form.product_code.trim(),
        product_name: form.product_name.trim(),
        size: form.size.trim(),
        product_date: form.product_date || null,
        expiry_date: form.expiry_date || null,
        description: form.description.trim(),
        selling_price: Number(form.selling_price),
        client_id: form.client_id ? Number(form.client_id) : null,
      };

      if (editingId) {
        await putJson(`/products/${editingId}`, payload);
        setSuccess('Product updated successfully.');
      } else {
        await postJson('/products', payload);
        setSuccess('Product added successfully.');
      }

      resetForm();
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = useCallback((product) => {
    setForm({
      product_code: product.product_code || '',
      product_name: product.product_name || '',
      size: product.size || '',
      product_date: product.product_date ? String(product.product_date).slice(0, 10) : '',
      expiry_date: product.expiry_date ? String(product.expiry_date).slice(0, 10) : '',
      description: product.description || '',
      selling_price: product.selling_price != null ? String(product.selling_price) : '',
      client_id: product.client_id?.toString() ?? '',
    });
    setEditingId(product.id);
    setError('');
    setSuccess('');
  }, []);

  useEffect(() => {
    if (editRecord?.type === 'Products') {
      handleEdit(editRecord.value);
      onEditConsumed?.();
    }
  }, [editRecord, handleEdit, onEditConsumed]);

  const filteredProducts = products.filter((product) => {
    const q = appliedQuery.trim().toLowerCase();
    if (!q) return true;

    return [
      product.product_code,
      product.product_name,
      product.size,
      product.product_date,
      product.expiry_date,
      product.description,
      product.selling_price,
    ]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(q));
  });

  return (
    <div>
      <PageIntro title="Products" />
      <div className="toolbar search-toolbar">
        <div className="toolbar-actions">
          <button type="button" className="btn primary" onClick={resetForm}>
            {editingId ? 'New Product' : 'Add Product'}
          </button>
          <form className="search-control" onSubmit={(event) => { event.preventDefault(); setAppliedQuery(query); }}>
          <input
            type="search"
            className="search"
            aria-label="Search products"
            placeholder="Search code, product, size, date..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
            <button type="submit" className="btn secondary search-submit">Search</button>
          </form>
        </div>
      </div>

      <SearchResults
        query={appliedQuery}
        title="Product search results"
        loading={loading}
        results={filteredProducts.map((product) => ({
          id: product.id,
          label: `${product.product_code || ""} ${product.product_name || "Unnamed product"}`.trim(),
          detail: [
            product.size,
            product.product_date ? `Date: ${String(product.product_date).slice(0, 10)}` : null,
            product.expiry_date ? `Expires: ${String(product.expiry_date).slice(0, 10)}` : null,
            product.client_name,
          ].filter(Boolean).join(' · '),
        }))}
      />

      {(error || success) && (
        <div style={{ marginBottom: '16px' }}>
          {error && <div className="empty-state">{error}</div>}
          {success && (
            <div className="empty-state" style={{ borderColor: '#10b981', background: '#ecfdf5', color: '#065f46' }}>
              {success}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card card-form">
        <div className="card-header">
          <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Product Code *</label>
              <input type="text" value={form.product_code} onChange={handleChange('product_code')} required />
            </div>
            <div className="form-group">
              <label>Product Name *</label>
              <select value={form.product_name} onChange={handleChange('product_name')} required>
                <option value="">-- Select Fragrance --</option>
                {productNameOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Size *</label>
              <input type="text" value={form.size} onChange={handleChange('size')} placeholder="e.g. 100ml, 500g, Custom" required />
            </div>
            <div className="form-group">
              <label>Manufacture Date</label>
              <input type="date" value={form.product_date} onChange={handleChange('product_date')} />
            </div>
            <div className="form-group">
              <label>Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={handleChange('expiry_date')} min={form.product_date || undefined} />
            </div>
            <div className="form-group">
              <label>Selling Price *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.selling_price}
                onChange={handleChange('selling_price')}
                required
              />
            </div>
            <div className="form-group">
              <label>Client</label>
              <select value={form.client_id} onChange={handleChange('client_id')}>
                <option value="">General product (no client)</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.client_name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea rows="3" value={form.description} onChange={handleChange('description')} />
            </div>
          </div>
        </div>

        <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </form>

    </div>
  );
};

export default ProductsPage;
