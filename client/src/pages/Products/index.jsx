import React, { useState, useEffect } from 'react';
import { fetchJson, postJson, putJson, deleteJson } from '../../services/api';

const emptyProduct = {
  product_code: '',
  product_name: '',
  size: '',
  description: '',
  selling_price: '',
};

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);

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
        description: form.description.trim(),
        selling_price: Number(form.selling_price),
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

  const handleEdit = (product) => {
    setForm({
      product_code: product.product_code || '',
      product_name: product.product_name || '',
      size: product.size || '',
      description: product.description || '',
      selling_price: product.selling_price != null ? String(product.selling_price) : '',
    });
    setEditingId(product.id);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`Delete product ${product.product_code}?`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await deleteJson(`/products/${product.id}`);
      setSuccess('Product deleted successfully.');
      if (editingId === product.id) {
        resetForm();
      }
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProducts = products.filter((product) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    return [
      product.product_code,
      product.product_name,
      product.size,
      product.description,
      product.selling_price,
    ]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(q));
  });

  return (
    <div>
      <header className="page-header">
        <h1>Products</h1>
        <p className="muted">Manage your product catalog and pricing.</p>
      </header>

      <div className="toolbar">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn primary" onClick={resetForm}>
            {editingId ? 'New Product' : 'Add Product'}
          </button>
          <input
            className="search"
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

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
              <input type="text" value={form.product_name} onChange={handleChange('product_name')} required />
            </div>
            <div className="form-group">
              <label>Size *</label>
              <input type="text" value={form.size} onChange={handleChange('size')} required />
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

      <section className="page-body">
        {loading ? (
          <div className="empty-state">Loading products…</div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">No products found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Selling Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id || product.product_code}>
                    <td>{product.product_code || '—'}</td>
                    <td>{product.product_name || '—'}</td>
                    <td>{product.size || '—'}</td>
                    <td>
                      {product.selling_price != null
                        ? Number(product.selling_price).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </td>
                    <td>
                      <button type="button" className="btn" onClick={() => handleEdit(product)}>
                        Edit
                      </button>
                      <button type="button" className="btn danger" onClick={() => handleDelete(product)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductsPage;
