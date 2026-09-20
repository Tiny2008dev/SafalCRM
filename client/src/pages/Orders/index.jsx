import React, { useEffect, useState } from 'react';
import { fetchJson, postJson, putJson, deleteJson } from '../../services/api';

const emptyOrder = {
  client_id: '',
  product_id: '',
  quantity: '1',
  total_amount: '',
  order_date: new Date().toISOString().slice(0, 10),
  status: 'Pending',
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyOrder);
  const [editingId, setEditingId] = useState(null);

  const loadClients = async () => {
    try {
      const data = await fetchJson('/clients');
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load clients.');
    }
  };

  const loadProducts = async () => {
    try {
      const data = await fetchJson('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load products.');
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson('/orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadProducts();
    loadOrders();
  }, []);

  useEffect(() => {
    const product = products.find((item) => String(item.id) === String(form.product_id));
    const quantity = Number(form.quantity || 0);

    if (!product || !Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    const computedAmount = (Number(product.selling_price || 0) * quantity).toFixed(2);
    setForm((current) => ({ ...current, total_amount: computedAmount }));
  }, [form.product_id, form.quantity, products]);

  const resetForm = () => {
    setForm({
      ...emptyOrder,
      order_date: new Date().toISOString().slice(0, 10),
    });
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const validateForm = () => {
    if (!form.client_id || Number(form.client_id) <= 0) {
      return 'Client is required.';
    }
    if (!form.product_id || Number(form.product_id) <= 0) {
      return 'Product is required.';
    }

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return 'Quantity must be greater than 0.';
    }

    const total = Number(form.total_amount);
    if (!Number.isFinite(total) || total < 0) {
      return 'Amount cannot be negative.';
    }

    if (!form.status) {
      return 'Status is required.';
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
        client_id: Number(form.client_id),
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        total_amount: Number(form.total_amount),
        order_date: form.order_date || new Date().toISOString().slice(0, 10),
        status: form.status,
      };

      if (editingId) {
        await putJson(`/orders/${editingId}`, payload);
        setSuccess('Order updated successfully.');
      } else {
        await postJson('/orders', payload);
        setSuccess('Order added successfully.');
      }

      resetForm();
      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (order) => {
    setForm({
      client_id: String(order.client_id || ''),
      product_id: String(order.product_id || ''),
      quantity: String(order.quantity || '1'),
      total_amount: String(order.total_amount ?? ''),
      order_date: order.order_date || new Date().toISOString().slice(0, 10),
      status: order.status || 'Pending',
    });
    setEditingId(order.id);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (order) => {
    const confirmed = window.confirm(`Delete order ${order.id}?`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await deleteJson(`/orders/${order.id}`);
      setSuccess('Order deleted successfully.');
      if (editingId === order.id) {
        resetForm();
      }
      await loadOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [
      order.id,
      order.client_name,
      order.product_name,
      order.status,
      order.order_date,
      order.quantity,
      order.total_amount,
    ]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(query));
  });

  return (
    <div>
      <header className="page-header">
        <h1>Orders</h1>
        <p className="muted">Manage customer orders and fulfillment status.</p>
      </header>

      <div className="toolbar">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn primary" onClick={resetForm}>
            {editingId ? 'New Order' : 'Add Order'}
          </button>
          <input
            className="search"
            placeholder="Search orders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          <h2>{editingId ? 'Edit Order' : 'Add Order'}</h2>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Client *</label>
              <select value={form.client_id} onChange={handleChange('client_id')} required>
                <option value="">-- Select Client --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.client_name || client.name || client.company_name || 'Client'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Product *</label>
              <select value={form.product_id} onChange={handleChange('product_id')} required>
                <option value="">-- Select Product --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity *</label>
              <input type="number" min="1" step="1" value={form.quantity} onChange={handleChange('quantity')} required />
            </div>

            <div className="form-group">
              <label>Total Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total_amount}
                onChange={handleChange('total_amount')}
                required
              />
            </div>

            <div className="form-group">
              <label>Order Date</label>
              <input type="date" value={form.order_date} onChange={handleChange('order_date')} />
            </div>

            <div className="form-group">
              <label>Status *</label>
              <select value={form.status} onChange={handleChange('status')} required>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Order' : 'Save Order'}
          </button>
        </div>
      </form>

      <section className="page-body">
        {loading ? (
          <div className="empty-state">Loading orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">No orders found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Client</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.client_name || '—'}</td>
                    <td>{order.product_name || '—'}</td>
                    <td>{order.quantity}</td>
                    <td>
                      {Number(order.total_amount ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>{order.order_date || '—'}</td>
                    <td>
                      <span className={`status-badge ${String(order.status || 'Pending').toLowerCase().replace(/\s+/g, '-')}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn secondary" onClick={() => handleEdit(order)}>
                        Edit
                      </button>
                      <button type="button" className="btn danger" onClick={() => handleDelete(order)}>
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

export default OrdersPage;
