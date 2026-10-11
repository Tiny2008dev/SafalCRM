import React, { useEffect, useState } from 'react';
import { fetchJson, postJson, putJson } from '../../services/api';
import PageIntro from '../../components/PageIntro';

const emptyForm = {
  product_id: '',
  quantity: '1',
};

const ProductionPage = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [bomPreview, setBomPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);

  const loadProducts = async () => {
    try {
      const data = await fetchJson('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load products.');
    }
  };

  const loadMaterials = async () => {
    try {
      const data = await fetchJson('/materials');
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((current) => current || (err.message || 'Unable to load materials.'));
    }
  };

  const loadOrders = async () => {
    try {
      const data = await fetchJson('/production');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load production orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadMaterials();
    loadOrders();
  }, []);

  useEffect(() => {
    const productId = selectedProduct || form.product_id;
    if (!productId) {
      setBomPreview([]);
      return;
    }

    const parsedQty = Number(quantity || 0);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setBomPreview([]);
      return;
    }

    let mounted = true;
    fetchJson(`/bom/${productId}`)
      .then((data) => {
        if (!mounted) return;
        const bomRows = Array.isArray(data) ? data : [];
        const materialMap = new Map(materials.map((material) => [material.id, material]));
        const preview = bomRows.map((item) => {
          const material = materialMap.get(item.material_id);
          const required = Number(item.quantity_required || 0) * parsedQty;
          const available = Number(material?.current_stock || 0);
          const shortage = Math.max(0, required - available);

          return {
            ...item,
            material_name: item.material_name || material?.material_name || 'Unknown Material',
            unit: item.unit || material?.unit || '',
            required_quantity: required,
            available_stock: available,
            shortage,
            stock_status: required <= available ? 'Sufficient' : 'Insufficient',
          };
        });
        setBomPreview(preview);
      })
      .catch(() => {
        if (mounted) {
          setBomPreview([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedProduct, quantity, form.product_id, materials]);

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedProduct('');
    setQuantity('1');
    setSuccess('');
    setError('');
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === 'product_id') {
      setSelectedProduct(value);
    }
  };

  const validationMessage = () => {
    if (!form.product_id || Number(form.product_id) <= 0) {
      return 'Product is required.';
    }
    const parsedQty = Number(quantity || form.quantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      return 'Production quantity must be greater than 0.';
    }
    if (!bomPreview.length) {
      return 'Product must have a BOM before production can be created.';
    }
    if (bomPreview.some((item) => item.shortage > 0)) {
      return 'Insufficient stock for one or more materials.';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validationMessage();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        product_id: Number(form.product_id || selectedProduct),
        quantity: Number(quantity || form.quantity),
        production_date: new Date().toISOString().slice(0, 10),
      };

      await postJson('/production', payload);
      setSuccess('Production order created successfully.');
      resetForm();
      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (orderId, nextStatus) => {
    try {
      setError('');
      setSuccess('');
      await putJson(`/production/${orderId}`, { status: nextStatus });
      setSuccess(`Production order ${orderId} marked as ${nextStatus}.`);
      await loadOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  const overallStatus = bomPreview.length > 0 && bomPreview.some((item) => item.shortage > 0)
    ? 'Insufficient Stock'
    : bomPreview.length > 0
      ? 'Ready for Production'
      : 'No BOM Available';

  return (
    <div>
      <PageIntro title="Production" />
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
          <h2>Create Production Order</h2>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Product *</label>
              <select name="product_id" value={form.product_id} onChange={handleFieldChange} required>
                <option value="">-- Select Product --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Production Quantity *</label>
              <input
                type="number"
                min="1"
                step="1"
                name="quantity"
                value={quantity || form.quantity}
                onChange={(event) => {
                  const value = event.target.value;
                  setQuantity(value);
                  setForm((current) => ({ ...current, quantity: value }));
                }}
                required
              />
            </div>
          </div>
        </div>

        <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn primary" disabled={saving || !form.product_id || !bomPreview.length}>
            {saving ? 'Creating…' : 'Create Production'}
          </button>
        </div>
      </form>

      <section className="page-body" style={{ marginTop: '24px' }}>
        {!form.product_id ? (
          <div className="empty-state">Select a product to preview material requirements.</div>
        ) : bomPreview.length === 0 ? (
          <div className="empty-state">This product does not have a BOM yet.</div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <h2>Material Requirement Preview</h2>
              </div>
              <div className="card-body">
                <p><strong>Product:</strong> {products.find((product) => String(product.id) === String(form.product_id))?.product_name || '—'}</p>
                <p><strong>Quantity:</strong> {Number(quantity || form.quantity || 0)}</p>
                <p><strong>Stock Status:</strong> {overallStatus}</p>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Required</th>
                        <th>Available</th>
                        <th>Shortage</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomPreview.map((item) => (
                        <tr key={item.id || item.material_id}>
                          <td>{item.material_name}</td>
                          <td>{item.required_quantity} {item.unit || ''}</td>
                          <td>{item.available_stock} {item.unit || ''}</td>
                          <td>{item.shortage} {item.unit || ''}</td>
                          <td>{item.stock_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="page-body" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h2>Production Orders</h2>
        </div>

        {loading ? (
          <div className="empty-state">Loading production orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No production orders found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Production ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.product_name || '—'}</td>
                    <td>{order.quantity}</td>
                    <td>{order.production_date || '—'}</td>
                    <td>
                      <span className={`status-badge ${String(order.status || 'Pending').toLowerCase().replace(/\s+/g, '-')}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      {order.status !== 'Completed' && (
                        <button type="button" className="btn primary" onClick={() => handleStatusUpdate(order.id, 'Completed')}>
                          Mark Completed
                        </button>
                      )}
                      {order.status !== 'Cancelled' && (
                        <button type="button" className="btn danger" onClick={() => handleStatusUpdate(order.id, 'Cancelled')}>
                          Cancel
                        </button>
                      )}
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

export default ProductionPage;
