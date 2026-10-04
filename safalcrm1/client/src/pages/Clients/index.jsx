import React, { useState, useEffect } from 'react';
import { fetchJson, postJson, putJson, deleteJson } from '../../services/api';
import PageIntro from '../../components/PageIntro';

const emptyClient = {
  client_name: '',
  company_name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
};

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyClient);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const cityOptions = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune', 'Jaipur', 'Chennai', 'Ahmedabad', 'Kolkata', 'Lucknow'];

  const loadClients = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson('/clients');
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = clients.filter((client) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      client.client_name,
      client.company_name,
      client.phone,
      client.email,
      client.address,
      client.city,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const resetForm = () => {
    setForm(emptyClient);
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await putJson(`/clients/${editingId}`, form);
        setSuccess('Client updated successfully.');
      } else {
        await postJson('/clients', form);
        setSuccess('Client added successfully.');
      }
      resetForm();
      await loadClients();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client) => {
    setForm({
      client_name: client.client_name || '',
      company_name: client.company_name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
    });
    setEditingId(client.id);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (client) => {
    const confirmed = window.confirm(`Delete client ${client.client_name}?`);
    if (!confirmed) return;
    setError('');
    setSuccess('');
    try {
      await deleteJson(`/clients/${client.id}`);
      setSuccess('Client deleted successfully.');
      if (editingId === client.id) {
        resetForm();
      }
      await loadClients();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageIntro eyebrow="Customer workspace" title="Clients" description="Manage your customers and business contacts." />

      <div className="toolbar">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn primary" onClick={resetForm}>
            {editingId ? 'New Client' : 'Add Client'}
          </button>
          <input
            className="search"
            placeholder="Search clients"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {(error || success) && (
        <div style={{ marginBottom: '16px' }}>
          {error && (
            <div className="empty-state" style={{ borderStyle: 'solid', borderColor: '#FCA5A5', background: '#FEF2F2', color: '#B91C1C' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="empty-state" style={{ borderStyle: 'solid', borderColor: '#A7F3D0', background: '#ECFDF5', color: '#166534' }}>
              {success}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card card-form">
        <div className="card-header">
          <h2>{editingId ? 'Edit Client' : 'Add Client'}</h2>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Client Name *</label>
              <input type="text" value={form.client_name} onChange={handleChange('client_name')} required />
            </div>
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" value={form.company_name} onChange={handleChange('company_name')} />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input type="text" value={form.phone} onChange={handleChange('phone')} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={handleChange('email')} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input type="text" value={form.address} onChange={handleChange('address')} />
            </div>
            <div className="form-group">
              <label>City</label>
              <select value={form.city} onChange={handleChange('city')}>
                <option value="">-- Select City --</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Client' : 'Save Client'}
          </button>
        </div>
      </form>

      <section>
        {loading ? (
          <div className="empty-state">Loading clients…</div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">No clients found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.client_name}</td>
                    <td>{client.company_name || '—'}</td>
                    <td>{client.phone}</td>
                    <td>{client.email || '—'}</td>
                    <td>{client.address || '—'}</td>
                    <td>{client.city || '—'}</td>
                    <td>
                      <button type="button" className="btn" onClick={() => handleEdit(client)}>
                        Edit
                      </button>
                      <button type="button" className="btn danger" onClick={() => handleDelete(client)}>
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

export default ClientsPage;
