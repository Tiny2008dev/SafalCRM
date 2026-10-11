import React, { useState, useEffect, useCallback } from 'react';
import { fetchJson, postJson, putJson } from '../../services/api';
import PageIntro from '../../components/PageIntro';
import SearchResults from '../../components/SearchResults';

const emptyClient = {
  client_name: '',
  company_name: '',
  gstin: '',
  office_address: '',
  godown_address: '',
  phone: '',
  email: '',
  city: '',
};

const ClientsPage = ({ editRecord, onEditConsumed }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
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
    const query = appliedSearch.trim().toLowerCase();
    if (!query) return true;
    return [
      client.client_name,
      client.company_name,
      client.gstin,
      client.office_address,
      client.godown_address,
      client.phone,
      client.email,
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

  const handleEdit = useCallback((client) => {
    setForm({
      client_name: client.client_name || '',
      company_name: client.company_name || '',
      gstin: client.gstin || '',
      office_address: client.office_address || client.address || '',
      godown_address: client.godown_address || '',
      phone: client.phone || '',
      email: client.email || '',
      city: client.city || '',
    });
    setEditingId(client.id);
    setError('');
    setSuccess('');
  }, []);

  useEffect(() => {
    if (editRecord?.type === 'Clients') {
      handleEdit(editRecord.value);
      onEditConsumed?.();
    }
  }, [editRecord, handleEdit, onEditConsumed]);

  return (
    <div>
      <PageIntro title="Clients" />
      <div className="toolbar search-toolbar">
        <div className="toolbar-actions">
          <button type="button" className="btn primary" onClick={resetForm}>
            {editingId ? 'New Client' : 'Add Client'}
          </button>
          <form className="search-control" onSubmit={(event) => { event.preventDefault(); setAppliedSearch(search); }}>
          <input
            type="search"
            className="search"
            aria-label="Search clients"
            placeholder="Search clients by name, company, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
            <button type="submit" className="btn secondary search-submit">Search</button>
          </form>
        </div>
      </div>

      <SearchResults
        query={appliedSearch}
        title="Client search results"
        loading={loading}
        results={filteredClients.map((client) => ({
          id: client.id,
          label: client.client_name || 'Unnamed client',
          detail: [client.company_name, client.gstin, client.phone, client.city].filter(Boolean).join(' · '),
        }))}
      />

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
              <label>GSTIN</label>
              <input type="text" value={form.gstin} onChange={handleChange('gstin')} placeholder="27ABCDE1234F1Z5" />
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
              <label>Office Address</label>
              <input type="text" value={form.office_address} onChange={handleChange('office_address')} />
            </div>
            <div className="form-group">
              <label>Godown Address</label>
              <input type="text" value={form.godown_address} onChange={handleChange('godown_address')} />
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

    </div>
  );
};

export default ClientsPage;
