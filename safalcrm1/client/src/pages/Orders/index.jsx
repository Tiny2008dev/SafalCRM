import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchJson, postJson, putJson, deleteJson } from '../../services/api';
import PageIntro from '../../components/PageIntro';

const newOrder = () => ({
  client_id: '',
  order_date: new Date().toISOString().slice(0, 16),
  status: 'Pending',
  items: [{ product_id: '', quantity: '1', unit_price: '' }],
});
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityLabel = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [bomByProduct, setBomByProduct] = useState({});
  const [form, setForm] = useState(newOrder);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const bomRequests = useRef({});

  const load = async () => {
    setLoading(true);
    try {
      const [orderData, clientData, productData, materialData] = await Promise.all([
        fetchJson('/orders'),
        fetchJson('/clients'),
        fetchJson('/products'),
        fetchJson('/materials'),
      ]);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
      setProducts(Array.isArray(productData) ? productData : []);
      setMaterials(Array.isArray(materialData) ? materialData : []);
      setMaterialsLoaded(true);
    } catch (err) {
      setError(err.message || 'Unable to load orders and inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ensureBom = (productId) => {
    if (!productId || bomByProduct[productId]) return Promise.resolve(bomByProduct[productId] || []);
    if (!bomRequests.current[productId]) {
      bomRequests.current[productId] = fetchJson(`/bom/${productId}`)
        .then((data) => {
          const rows = Array.isArray(data) ? data : [];
          setBomByProduct((current) => ({ ...current, [productId]: rows }));
          return rows;
        })
        .catch((err) => {
          setError(err.message || 'Unable to calculate material availability.');
          return [];
        })
        .finally(() => {
          delete bomRequests.current[productId];
        });
    }
    return bomRequests.current[productId];
  };

  const total = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0),
    [form.items]
  );

  const materialCheck = useMemo(() => {
    const requirements = new Map();
    const missingBom = [];
    let pending = !materialsLoaded;

    form.items.forEach((item) => {
      if (!item.product_id) return;
      const rows = bomByProduct[item.product_id];
      if (!rows) {
        pending = true;
        return;
      }
      if (!rows.length) {
        const product = products.find((entry) => String(entry.id) === String(item.product_id));
        missingBom.push(product?.product_name || 'Selected product');
        return;
      }
      rows.forEach((row) => {
        const materialId = Number(row.material_id);
        const material = materials.find((entry) => Number(entry.id) === materialId);
        const current = requirements.get(materialId) || {
          name: row.material_name || material?.material_name || 'Unknown material',
          unit: row.unit || material?.unit || '',
          required: 0,
          available: Number(material?.current_stock || 0),
        };
        current.required += Number(row.quantity_required || 0) * Number(item.quantity || 0);
        requirements.set(materialId, current);
      });
    });

    const requirementsList = Array.from(requirements.values());
    return {
      pending,
      missingBom: [...new Set(missingBom)],
      materials: requirementsList,
      shortages: requirementsList.filter((material) => material.required > material.available),
    };
  }, [bomByProduct, form.items, materials, materialsLoaded, products]);

  const maxForLine = (lineIndex) => {
    const item = form.items[lineIndex];
    if (!materialsLoaded || !item.product_id || !bomByProduct[item.product_id]) return null;
    const bomRows = bomByProduct[item.product_id];
    if (!bomRows.length) return 0;

    let limit = Infinity;
    for (const row of bomRows) {
      const material = materials.find((entry) => Number(entry.id) === Number(row.material_id));
      const perUnit = Number(row.quantity_required || 0);
      if (!material || perUnit <= 0) return 0;
      const usedByOtherLines = form.items.reduce((sum, other, otherIndex) => {
        if (otherIndex === lineIndex || !other.product_id) return sum;
        const otherBom = bomByProduct[other.product_id] || [];
        const matching = otherBom.find((otherRow) => Number(otherRow.material_id) === Number(row.material_id));
        return sum + Number(matching?.quantity_required || 0) * Number(other.quantity || 0);
      }, 0);
      limit = Math.min(limit, Math.floor((Number(material.current_stock || 0) - usedByOtherLines) / perUnit));
    }
    return Math.max(0, Number.isFinite(limit) ? limit : 0);
  };

  const reset = () => {
    setForm(newOrder());
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const updateItem = (index, field, value) => {
    setForm((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'product_id') {
        const product = products.find((entry) => String(entry.id) === String(value));
        if (product) items[index].unit_price = String(product.selling_price ?? '');
      }
      return { ...current, items };
    });
    if (field === 'product_id' && value) ensureBom(value);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const invalid = !form.client_id || !form.items.length || form.items.some((item) => !item.product_id || Number(item.quantity) <= 0 || Number(item.unit_price) < 0);
    if (invalid) return setError('Select a client and enter a product, quantity, and unit price for every item.');
    if (form.status !== 'Cancelled') {
      if (materialCheck.pending) return setError('Wait for material availability to finish loading.');
      if (materialCheck.missingBom.length) return setError(`Add a bill of materials for ${materialCheck.missingBom.join(', ')} before ordering.`);
      if (materialCheck.shortages.length) {
        const shortage = materialCheck.shortages[0];
        return setError(`Insufficient ${shortage.name} stock: ${quantityLabel(shortage.required)} ${shortage.unit} required, ${quantityLabel(shortage.available)} ${shortage.unit} available.`);
      }
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: Number(form.client_id),
        items: form.items.map((item) => ({ product_id: Number(item.product_id), quantity: Number(item.quantity), unit_price: Number(item.unit_price) })),
      };
      if (editingId) await putJson(`/orders/${editingId}`, payload);
      else await postJson('/orders', payload);
      setSuccess(editingId ? 'Order updated successfully.' : 'Order created successfully.');
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (order) => {
    const items = (order.items || []).map((item) => ({ product_id: String(item.product_id), quantity: String(item.quantity), unit_price: String(item.unit_price) }));
    setEditingId(order.id);
    setForm({
      client_id: String(order.client_id),
      order_date: String(order.order_date || '').replace(' ', 'T').slice(0, 16),
      status: order.status || 'Pending',
      items,
    });
    items.forEach((item) => ensureBom(item.product_id));
    setError('');
    setSuccess('');
  };

  const remove = async (order) => {
    if (!window.confirm(`Delete order #${order.id}?`)) return;
    try {
      await deleteJson(`/orders/${order.id}`);
      setSuccess('Order deleted successfully.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const visible = orders.filter((order) => JSON.stringify(order).toLowerCase().includes(search.toLowerCase()));
  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, { product_id: '', quantity: '1', unit_price: '' }] }));
  const removeItem = (lineIndex) => setForm((current) => ({ ...current, items: current.items.filter((_, index) => index !== lineIndex) }));

  return (
    <div>
      <PageIntro eyebrow="Sales workspace" title="Orders" description="Create orders with one or more products and keep a complete fulfilment record." />
      <div className="toolbar">
        <div className="toolbar-actions">
          <button className="btn primary" type="button" onClick={reset}>{editingId ? 'New Order' : 'Add Order'}</button>
          <input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders" />
        </div>
      </div>

      {(error || success) && <div className="empty-state" role={error ? 'alert' : 'status'}>{error || success}</div>}

      <form className="card card-form" onSubmit={submit}>
        <div className="card-header">
          <h2>{editingId ? 'Edit Order' : 'New Order'}</h2>
          {editingId && <button type="button" className="btn" onClick={reset}>Cancel</button>}
        </div>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Client *</label>
              <select value={form.client_id} onChange={(event) => setForm({ ...form, client_id: event.target.value })} required>
                <option value="">-- Select Client --</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.client_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Order Date &amp; Time *</label>
              <input type="datetime-local" value={form.order_date} onChange={(event) => setForm({ ...form, order_date: event.target.value })} required />
            </div>
            <div className="form-group">
              <label>Status *</label>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option>Pending</option><option>Completed</option><option>Cancelled</option>
              </select>
            </div>
          </div>

          <div className="card-header order-items-heading">
            <h2>Order Items</h2>
            <button type="button" className="btn secondary" onClick={addItem}>Add Product</button>
          </div>
          <div className="table-responsive">
            <table className="table order-items-table">
              <thead><tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th><th /></tr></thead>
              <tbody>
                {form.items.map((item, index) => {
                  const lineLimit = maxForLine(index);
                  const bomRows = bomByProduct[item.product_id];
                  return (
                    <tr key={index}>
                      <td>
                        <select value={item.product_id} onChange={(event) => updateItem(index, 'product_id', event.target.value)} required>
                          <option value="">-- Select Product --</option>
                          {products.filter((product) => !product.client_id || String(product.client_id) === String(form.client_id)).map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
                        </select>
                        {item.product_id && bomRows?.length === 0 && <small className="quantity-limit unavailable">BOM required</small>}
                      </td>
                      <td>
                        <input type="number" min="1" step="1" max={lineLimit ?? undefined} value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required />
                        {lineLimit !== null && <small className="quantity-limit">Available limit: {lineLimit} units</small>}
                        {item.product_id && lineLimit === null && <small className="quantity-limit">Checking stock…</small>}
                      </td>
                      <td><input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} required /></td>
                      <td>₹{money(Number(item.quantity) * Number(item.unit_price))}</td>
                      <td>{form.items.length > 1 && <button type="button" className="btn danger" onClick={() => removeItem(index)}>Remove</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section className="order-stock-summary" aria-live="polite">
            <div className="section-heading">
              <div><p className="eyebrow">Inventory check</p><h2>Material availability</h2></div>
              <span className={`section-count ${materialCheck.shortages.length ? 'stock-short' : ''}`}>
                {materialCheck.pending ? 'Checking stock' : materialCheck.shortages.length ? 'Stock limit exceeded' : 'Within stock limit'}
              </span>
            </div>
            {materialCheck.missingBom.length > 0 && <p className="stock-summary-note">BOM required for: {materialCheck.missingBom.join(', ')}.</p>}
            {materialCheck.materials.length > 0 ? (
              <div className="stock-check-list">
                {materialCheck.materials.map((material) => (
                  <div className="stock-check-row" key={material.name}>
                    <strong>{material.name}</strong>
                    <span>{quantityLabel(material.required)} {material.unit} required</span>
                    <span>{quantityLabel(material.available)} {material.unit} available</span>
                    <span className={material.required > material.available ? 'stock-short' : 'stock-ok'}>
                      {material.required > material.available ? `${quantityLabel(material.required - material.available)} ${material.unit} short` : 'Available'}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="stock-summary-note">Choose a product to see its material-based order limit.</p>}
          </section>

          <div className="card-footer order-form-footer">
            <strong>Order Total: ₹{money(total)}</strong>
            <button className="btn primary" disabled={saving || (form.status !== 'Cancelled' && (materialCheck.pending || materialCheck.shortages.length > 0 || materialCheck.missingBom.length > 0))}>
              {saving ? 'Saving…' : editingId ? 'Update Order' : 'Save Order'}
            </button>
          </div>
        </div>
      </form>

      <section className="page-body">
        {loading ? <div className="empty-state">Loading orders…</div> : !visible.length ? <div className="empty-state">No orders found.</div> : (
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>ID</th><th>Client</th><th>Products</th><th>Amount</th><th>Date &amp; Time</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {visible.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td><td>{order.client_name}</td>
                    <td>{order.items?.map((item) => `${item.product_name} × ${item.quantity}`).join(', ')}</td>
                    <td>₹{money(order.total_amount)}</td><td>{order.order_date}</td>
                    <td><span className={`status-badge ${String(order.status).toLowerCase()}`}>{order.status}</span></td>
                    <td><button type="button" className="btn secondary" onClick={() => edit(order)}>Edit</button> <button type="button" className="btn danger" onClick={() => remove(order)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
