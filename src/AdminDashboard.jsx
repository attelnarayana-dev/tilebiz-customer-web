import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Users, UserPlus, Search, RefreshCw, LogOut,
  Building2, CheckCircle2, XCircle, AlertCircle, X, ShieldCheck
} from 'lucide-react';
import './AdminDashboard.css';

const API = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://tilebiz-manager.onrender.com/api'
    : 'http://localhost:5001/api');

const emptyForm = {
  businessName: '',
  username: '',
  password: '',
  businessCode: '',
  ownerName: '',
  mobile: '',
  email: '',
  address: '',
  plan: 'basic'
};

export default function AdminDashboard({ token, user, onLogout }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }, [token]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/admin/customers');
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (err) {
      setError(err.message || 'Unable to load customers.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const counts = useMemo(() => ({
    total: customers.length,
    active: customers.filter(item =>
      (item.business?.status || item.user?.status) === 'active'
    ).length,
    inactive: customers.filter(item =>
      (item.business?.status || item.user?.status) === 'inactive'
    ).length
  }), [customers]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter(item => {
      const b = item.business || {};
      const u = item.user || {};
      return [
        b.businessName, b.businessCode, b.ownerName, b.mobile,
        b.email, b.plan, u.username
      ].some(value => String(value || '').toLowerCase().includes(term));
    });
  }, [customers, search]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
  }

  async function createCustomer(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const result = await request('/admin/customers', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      setNotice(result.message || 'Customer account created successfully.');
      setForm(emptyForm);
      setShowForm(false);
      await loadCustomers();
    } catch (err) {
      setError(err.message || 'Unable to create customer.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item) {
    const business = item.business || {};
    const businessId = business.id;
    const currentStatus = business.status || item.user?.status;
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    if (!businessId) {
      setError('Business ID is missing for this customer.');
      return;
    }

    setError('');
    setNotice('');
    try {
      await request(`/admin/customers/${businessId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      setNotice(`Customer ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`);
      await loadCustomers();
    } catch (err) {
      setError(err.message || 'Unable to update customer status.');
    }
  }

  async function changePlan(item, plan) {
    const businessId = item.business?.id;
    if (!businessId || !plan) return;

    setError('');
    setNotice('');
    try {
      await request(`/admin/customers/${businessId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan })
      });
      setNotice('Customer plan updated.');
      await loadCustomers();
    } catch (err) {
      setError(err.message || 'Unable to update plan.');
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">T</div>
          <div>
            <strong>TileBiz</strong>
            <span>MANAGER</span>
          </div>
        </div>

        <div className="admin-side-label">ADMINISTRATION</div>
        <div className="admin-nav-item active">
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>
        <div className="admin-nav-item">
          <Users size={18} />
          <span>Customers</span>
        </div>

        <div className="admin-sidebar-bottom">
          <div className="admin-user">
            <div className="admin-avatar"><ShieldCheck size={19} /></div>
            <div className="admin-user-info">
              <strong>{user?.username || 'Administrator'}</strong>
              <span>Super Admin</span>
            </div>
          </div>
          <button className="admin-logout" onClick={onLogout}>
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="admin-eyebrow">TILEBIZ CONTROL CENTER</div>
            <h1>Super Admin Dashboard</h1>
            <p>Manage customer businesses and their subscriptions.</p>
          </div>
          <div className="admin-top-actions">
            <button className="admin-refresh" onClick={loadCustomers} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'admin-spin' : ''} />
              Refresh
            </button>
            <button className="admin-mobile-logout" onClick={onLogout}>
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {error && (
          <div className="admin-alert error">
            <AlertCircle size={18} /> <span>{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button>
          </div>
        )}
        {notice && (
          <div className="admin-alert success">
            <CheckCircle2 size={18} /> <span>{notice}</span>
            <button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16} /></button>
          </div>
        )}

        <section className="admin-welcome">
          <div>
            <span className="admin-welcome-kicker">OVERVIEW</span>
            <h2>Business Accounts</h2>
            <p>View, create and manage all registered TileBiz businesses.</p>
          </div>
          <button className="admin-primary-btn" onClick={() => {
            setForm(emptyForm);
            setShowForm(true);
            setError('');
          }}>
            <UserPlus size={17} /> Create Customer
          </button>
        </section>

        <section className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-icon"><Building2 size={20} /></div>
            <span>Total Customers</span>
            <strong>{counts.total}</strong>
            <small>Registered businesses</small>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon active"><CheckCircle2 size={20} /></div>
            <span>Active Accounts</span>
            <strong>{counts.active}</strong>
            <small>Currently active</small>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon inactive"><XCircle size={20} /></div>
            <span>Inactive Accounts</span>
            <strong>{counts.inactive}</strong>
            <small>Currently inactive</small>
          </div>
        </section>

        <section className="admin-customer-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Customer Businesses</h2>
              <p>Manage business accounts, status and subscription plans.</p>
            </div>
            <div className="admin-search">
              <Search size={17} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search customers..."
              />
            </div>
          </div>

          {loading ? (
            <div className="admin-empty"><RefreshCw className="admin-spin" /> Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="admin-empty">
              <Users size={30} />
              <strong>{search ? 'No matching customers' : 'No customers yet'}</strong>
              <span>{search ? 'Try another search term.' : 'Create your first customer business account.'}</span>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>BUSINESS / OWNER</th>
                    <th>LOGIN USERNAME</th>
                    <th>CONTACT</th>
                    <th>PLAN</th>
                    <th>STATUS</th>
                    <th>ACCOUNT ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((item, index) => {
                    const b = item.business || {};
                    const u = item.user || {};
                    const status = b.status || u.status || 'inactive';

                    return (
                      <tr key={b.id || u.id || index}>
                        <td>
                          <div className="admin-business-name">{b.businessName || '—'}</div>
                          <div className="admin-muted">{b.ownerName || 'Owner not specified'}</div>
                          {b.businessCode && <div className="admin-code">{b.businessCode}</div>}
                        </td>
                        <td><strong className="admin-username">{u.username || '—'}</strong></td>
                        <td>
                          <div>{b.mobile || '—'}</div>
                          <div className="admin-muted">{b.email || ''}</div>
                        </td>
                        <td>
                          <select
                            className="admin-plan-select"
                            value={b.plan || 'basic'}
                            onChange={event => changePlan(item, event.target.value)}
                          >
                            <option value="basic">Basic</option>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                          </select>
                        </td>
                        <td>
                          <span className={`admin-status ${status}`}>
                            <i /> {status}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`admin-status-btn ${status === 'active' ? 'deactivate' : 'activate'}`}
                            onClick={() => changeStatus(item)}
                          >
                            {status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-table-footer">
            Showing {filteredCustomers.length} of {customers.length} customer accounts
          </div>
        </section>
      </main>

      {showForm && (
        <div className="admin-modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget) setShowForm(false);
        }}>
          <section className="admin-modal">
            <div className="admin-modal-heading">
              <div>
                <span>NEW ACCOUNT</span>
                <h2>Create Customer Business</h2>
                <p>Create a business and its owner login account.</p>
              </div>
              <button className="admin-close-btn" onClick={() => setShowForm(false)}><X /></button>
            </div>

            <form onSubmit={createCustomer}>
              <div className="admin-form-grid">
                <label>
                  Business Name *
                  <input name="businessName" value={form.businessName} onChange={updateForm} required />
                </label>
                <label>
                  Owner Name
                  <input name="ownerName" value={form.ownerName} onChange={updateForm} />
                </label>
                <label>
                  Login Username *
                  <input name="username" value={form.username} onChange={updateForm} required autoComplete="off" />
                </label>
                <label>
                  Temporary Password *
                  <input name="password" type="password" value={form.password} onChange={updateForm} required minLength={6} autoComplete="new-password" />
                </label>
                <label>
                  Mobile Number
                  <input name="mobile" value={form.mobile} onChange={updateForm} inputMode="numeric" />
                </label>
                <label>
                  Email Address
                  <input name="email" type="email" value={form.email} onChange={updateForm} />
                </label>
                <label>
                  Business Code
                  <input name="businessCode" value={form.businessCode} onChange={updateForm} />
                </label>
                <label>
                  Subscription Plan
                  <select name="plan" value={form.plan} onChange={updateForm}>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </label>
                <label className="admin-form-full">
                  Business Address
                  <textarea name="address" value={form.address} onChange={updateForm} rows={2} />
                </label>
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="admin-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="admin-primary-btn" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
