import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard, Package, Users, ShoppingCart, Truck, Handshake, CreditCard,
  ReceiptText, Settings, LogOut, Menu, X, Search, Plus, RefreshCw,
  Eye, EyeOff, Boxes, TrendingUp, AlertTriangle, ArrowUpRight,
  ChevronRight, Building2, LockKeyhole, CircleUserRound, CheckCircle2,
  XCircle, LoaderCircle, Wallet, FilePlus2, UserRoundPlus, WalletCards, PackagePlus, ClipboardList, CalendarClock, CircleAlert} from 'lucide-react';

import AdminDashboard from './AdminDashboard';

const API = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://tilebiz-manager.onrender.com/api'
    : 'http://localhost:5001/api');

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Stock / Inventory', icon: Package },
  { id: 'suppliers', label: 'Suppliers', icon: Building2 },
  { id: 'purchases', label: 'Purchases', icon: ReceiptText },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'sales', label: 'Billing', icon: ShoppingCart },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'drivers', label: 'Drivers', icon: Users },
  { id: 'deliveries', label: 'Delivery', icon: Truck },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
];

const emptyProduct = {
  productCode: '', name: '', category: '', brand: '', unit: '',
  purchasePrice: '', sellingPrice: '', stockQuantity: '',
  lowStockLimit: '', description: ''
};

const emptyCustomer = {
  customerCode: '', name: '', mobile: '', whatsapp: '',
  email: '', address: '', gstin: '', creditLimit: '',
  openingBalance: '', notes: ''
};

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function dateLabel(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
}

function displayName(value) {
  return String(value || '').trim().toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase()) || 'Unnamed supplier';
}

function dateKey(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function listFrom(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeIndianPhoneInput(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  return digits.slice(0, 10);
}

function App() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting =
    currentTime.getHours() < 12 ? 'Good Morning' :
    currentTime.getHours() < 17 ? 'Good Afternoon' :
    currentTime.getHours() < 21 ? 'Good Evening' :
    'Good Night';

  const [token, setToken] = useState(() => localStorage.getItem('tilebiz_customer_token') || '');
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(true);

  useEffect(() => {
    localStorage.setItem('tilebiz_rail_collapsed', String(railCollapsed));
  }, [railCollapsed]);
  const [openNavGroup, setOpenNavGroup] = useState('inventory');

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [lastSuccessfulRefresh, setLastSuccessfulRefresh] = useState(null);
  const [lastRefreshAttempt, setLastRefreshAttempt] = useState(null);
  const [refreshStatus, setRefreshStatus] = useState('idle');
  const [refreshError, setRefreshError] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [profileSavedPopup, setProfileSavedPopup] = useState(false);
  const [salesChartHover, setSalesChartHover] = useState(null);
  const [chartFrom, setChartFrom] = useState('');
  const [chartTo, setChartTo] = useState('');
  const [chartRange, setChartRange] = useState('month');
  const [showChartCustom, setShowChartCustom] = useState(false);
  const [dashboardPeriod, setDashboardPeriod] = useState('today');
  const [dashboardFrom, setDashboardFrom] = useState('');
  const [dashboardTo, setDashboardTo] = useState('');

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!profileSavedPopup) return undefined;
    const timer = setTimeout(() => setProfileSavedPopup(false), 5000);
    return () => clearTimeout(timer);
  }, [profileSavedPopup]);
  const [search, setSearch] = useState('');
  const [productNameFilter, setProductNameFilter] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productPurchaseFilter, setProductPurchaseFilter] = useState('');
  const [productSellingFilter, setProductSellingFilter] = useState('');
  const [productStockFilter, setProductStockFilter] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');

  useEffect(() => {
    setProductPage(1);
  }, [
    productNameFilter,
    productCategoryFilter,
    productPurchaseFilter,
    productSellingFilter,
    productStockFilter,
    productStatusFilter
  ]);
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);
  const [listPagination, setListPagination] = useState({});
  const [supplierPeriod, setSupplierPeriod] = useState('all');
  const [supplierFrom, setSupplierFrom] = useState('');
  const [supplierTo, setSupplierTo] = useState('');
  const [products, setProducts] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [purchasePreview, setPurchasePreview] = useState(null);
  const [selectedSupplierProfile, setSelectedSupplierProfile] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverFormOpen, setDriverFormOpen] = useState(false);
  const [driverEditingId, setDriverEditingId] = useState(null);
  const [driverForm, setDriverForm] = useState({ name: '', phone: '' });
  const [savingDriver, setSavingDriver] = useState(false);
  const [updatingDeliveryId, setUpdatingDeliveryId] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deliveryAssignmentForm, setDeliveryAssignmentForm] = useState({
    driverName: '',
    driverPhone: '',
    vehicleNumber: ''
  });
  const [savingDeliveryAssignment, setSavingDeliveryAssignment] = useState(false);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [savedSettingsSnapshot, setSavedSettingsSnapshot] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [billForm, setBillForm] = useState({
    customerId: '',
    discount: '0',
    paid: '',
    paymentMethod: 'Cash',
    items: [{ productId: '', quantity: '', sellingPrice: '', gst: '0' }]
  });
  const [billError, setBillError] = useState('');
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    items: [{
      productId: '', name: '', brand: '', category: '', size: '',
      unit: 'pcs', quantity: '', purchasePrice: '',
      sellingPrice: '', gst: '', lowStockLimit: '',
      finish: '', tilesPerBox: '', storageLocation: '',
      productImage: '', description: ''
    }],
    discount: '',
    paid: '',
    paymentMethod: 'Cash'
  });
  const [paymentForm, setPaymentForm] = useState({
    type: 'customer',
    partyId: '',
    amount: '',
    paymentMethod: 'Cash',
    paymentDate: new Date().toLocaleDateString('en-CA'),
    reference: '',
    note: ''
  });
  const [editingId, setEditingId] = useState(null);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem('tilebiz_customer_token');
      setToken('');
      setUser(null);
      setBusiness(null);
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem('tilebiz_customer_token');
    setToken('');
    setUser(null);
    setBusiness(null);
    setProducts([]);
    setCustomers([]);
    setSales([]);
    setPurchases([]);
    setSuppliers([]);
    setDeliveries([]);
    setDrivers([]);
    setPayments([]);
    setSettings(null);
    setPage('dashboard');
    setPageError('');
    setNotice('');
  }, []);

  const loadBusiness = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setPageError('');
    try {
      const me = await request('/me');
      setUser(me.user || null);
      setBusiness(me.business || null);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setLoading(false);
    }
  }, [token, request]);

  const loadPageData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setPageError('');
    setLastRefreshAttempt(new Date());
    setRefreshStatus('refreshing');
    setRefreshError('');
    try {
      if (page === 'dashboard' || page === 'products' || page === 'bill') {
        const data = await request('/products');
        setProducts(listFrom(data, 'products'));
      }
      if (page === 'dashboard' || page === 'customers' || page === 'bill') {
        const data = await request('/customers');
        setCustomers(listFrom(data, 'customers'));
      }
      if (page === 'dashboard') {
        const results = await Promise.allSettled([
          request('/purchases'),
          request('/payments'),
          request('/deliveries')
        ]);
        if (results[0].status === 'fulfilled') {
          setPurchases(listFrom(results[0].value, 'purchases'));
        }
        if (results[1].status === 'fulfilled') {
          setPayments(listFrom(results[1].value, 'payments'));
        }
        if (results[2].status === 'fulfilled') {
          setDeliveries(listFrom(results[2].value, 'deliveries'));
        }
      }
      if (page === 'dashboard' || page === 'sales' || page === 'customers') {
        try {
          const data = await request('/sales');
          setSales(listFrom(data, 'sales'));
        } catch (error) {
          if (page === 'sales' || page === 'customers') throw error;
        }
      }
      if (page === 'purchases' || page === 'record-purchase') {
        const [purchaseData, supplierData, productData] = await Promise.all([
          request('/purchases'),
          request('/suppliers'),
          request('/products')
        ]);
        setPurchases(listFrom(purchaseData, 'purchases'));
        setSuppliers(listFrom(supplierData, 'suppliers'));
        setProducts(listFrom(productData, 'products'));
      }
      if (page === 'suppliers') {
        const [supplierData, purchaseData, paymentData] = await Promise.all([
          request('/suppliers'),
          request('/purchases'),
          request('/payments')
        ]);
        setSuppliers(listFrom(supplierData, 'suppliers'));
        setPurchases(listFrom(purchaseData, 'purchases'));
        setPayments(listFrom(paymentData, 'payments'));
      }
      if (page === 'deliveries') {
        const data = await request('/deliveries');
        setDeliveries(listFrom(data, 'deliveries'));
      }
      if (page === 'drivers') {
        const data = await request('/drivers');
        setDrivers(listFrom(data, 'drivers'));
      }
      if (page === 'record-payment') {
        const [customerData, supplierData, paymentData] = await Promise.all([
          request('/customers'),
          request('/suppliers'),
          request('/payments')
        ]);
        setCustomers(listFrom(customerData, 'customers'));
        setSuppliers(listFrom(supplierData, 'suppliers'));
        setPayments(listFrom(paymentData, 'payments'));
      }
      if (page === 'payments') {
        const data = await request('/payments');
        setPayments(listFrom(data, 'payments'));
      }
      if (page === 'settings') {
        const data = await request('/settings');
        const loadedSettings = data.settings || data;
        setSettings(loadedSettings);
        setSavedSettingsSnapshot(JSON.stringify(loadedSettings));
      }
      setLastSuccessfulRefresh(new Date());
      setRefreshStatus('success');
      setRefreshError('');
    } catch (error) {
      setPageError(error.message);
      setRefreshStatus('error');
      setRefreshError(error.message || 'Unable to refresh data');
    } finally {
      setLoading(false);
    }
  }, [token, page, request]);

  useEffect(() => {
    const supplierId = purchaseForm.supplierId;
    let active = true;

    setSupplierProducts([]);
    if (!token || !supplierId || page !== 'record-purchase') {
      return () => { active = false; };
    }

    request(`/purchases/supplier/${encodeURIComponent(supplierId)}/products`)
      .then(data => {
        if (active) setSupplierProducts(listFrom(data, 'products'));
      })
      .catch(error => {
        if (active) {
          setSupplierProducts([]);
          setPageError(error.message || 'Unable to load this supplier’s products.');
        }
      });

    return () => { active = false; };
  }, [token, page, purchaseForm.supplierId, request]);

  useEffect(() => {
    if (token) loadBusiness();
  }, [token, loadBusiness]);

  useEffect(() => {
    if (token && business && user?.role !== 'admin') loadPageData();
  }, [token, business, user, loadPageData]);

  async function handleLogin(event) {
    event.preventDefault();
    setForgotPasswordMessage('');
    setPageError('');

    const identifier = loginName.trim();

    if (!identifier) {
      setPageError('Enter your email or mobile number.');
      return;
    }

    setLoginLoading(true);
    setPageError('');
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginName.trim(), password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) {
        throw new Error(data.message || 'Unable to log in. Check your credentials.');
      }
      localStorage.setItem('tilebiz_customer_token', data.token);
      setUser(data.user || null);
      setBusiness(data.business || null);
      setToken(data.token);
      setPassword('');
      setPageError('');
    } catch (error) {
      setPageError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  function goTo(id) {
    setNotice('');
    if (id === 'products') setProductStatusFilter('all');
    if (id === 'deliveries') setPendingDeliveriesOnly(false);
    setPage(id);
    setSearch('');
    setPageError('');
    setNotice('');
    setMobileOpen(false);
    setModal(null);
  }

  function openNewDriver() {
    setDriverEditingId(null);
    setDriverForm({ name: '', phone: '' });
    setDriverFormOpen(true);
    setPageError('');
    setNotice('');
  }

  function openEditDriver(driver) {
    setDriverEditingId(driver.id);
    setDriverForm({
      name: driver.name || '',
      phone: driver.phone || ''
    });
    setDriverFormOpen(true);
    setPageError('');
    setNotice('');
  }

  async function saveDriver(event) {
    event.preventDefault();

    const name = String(driverForm.name || '').trim();
    const phone = String(driverForm.phone || '').trim();

    if (!name || name.length > 150) {
      setPageError('Enter a valid driver name.');
      return;
    }

    if (!/^[0-9+() -]{7,20}$/.test(phone)) {
      setPageError('Enter a valid driver phone number.');
      return;
    }

    setSavingDriver(true);
    setPageError('');

    try {
      const editing = Boolean(driverEditingId);
      const path = editing
        ? `/drivers/${encodeURIComponent(driverEditingId)}`
        : '/drivers';

      await request(path, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({ name, phone })
      });

      const data = await request('/drivers');
      setDrivers(listFrom(data, 'drivers'));
      setDriverFormOpen(false);
      setDriverEditingId(null);
      setDriverForm({ name: '', phone: '' });
      setNotice(editing ? 'Driver updated successfully.' : 'Driver added successfully.');
    } catch (error) {
      setPageError(error.message || 'Could not save driver.');
    } finally {
      setSavingDriver(false);
    }
  }

  async function toggleDriverStatus(driver) {
    const nextStatus =
      String(driver.status || 'active').toLowerCase() === 'active'
        ? 'inactive'
        : 'active';

    setPageError('');

    try {
      await request(`/drivers/${encodeURIComponent(driver.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await request('/drivers');
      setDrivers(listFrom(data, 'drivers'));
      setNotice(nextStatus === 'active'
        ? 'Driver activated successfully.'
        : 'Driver deactivated successfully.');
    } catch (error) {
      setPageError(error.message || 'Could not update driver status.');
    }
  }

  function goToLowStock() {
    goTo('products');
    setProductStatusFilter('low-stock');
  }

  function goToPendingDeliveries() {
    goTo('deliveries');
    setPendingDeliveriesOnly(true);
  }

  function openCreate(type) {
    setNotice('');
    setEditingId(null);
    const emptySupplier = { supplierCode: '', name: '', company: '', gstin: '', phone: '', address: '' };
    setForm(type === 'product' ? { ...emptyProduct } : type === 'supplier' ? emptySupplier : { ...emptyCustomer });
    if (type === 'purchase') {
      setPurchaseForm({
        supplierId: '',
        items: [{
          productId: '', name: '', brand: '', category: '', size: '',
          unit: 'pcs', quantity: '', purchasePrice: '',
          sellingPrice: '', gst: '', lowStockLimit: '',
          finish: '', tilesPerBox: '', storageLocation: '', productImage: '', description: ''
        }],
        discount: '',
        paid: '',
        paymentMethod: 'Cash'
      });
    }
    setModal(type);
    setPageError('');
  }

  function openNewCustomerPage() {
    setNotice('');
    setEditingId(null);
    setForm({ ...emptyCustomer });
    setModal('customer');
    setPageError('');
    setSearch('');
    setPage('customer-new');
    setMobileOpen(false);
  }

  function openNewSupplierPage() {
    setNotice('');
    setEditingId(null);
    setForm({ supplierCode: '', name: '', company: '', gstin: '', phone: '', address: '' });
    setModal('supplier');
    setSupplierFormOpen(false);
    setPageError('');
    setSearch('');
    setPage('supplier-new');
    setMobileOpen(false);
  }

  function openEdit(type, item) {
    setNotice('');
    setEditingId(item.id);
    if (type === 'product') {
      setForm({
        productCode: item.product_code || '',
        name: item.name || '',
        category: item.category || '',
        brand: item.brand || '',
        unit: item.unit || 'pcs',
        purchasePrice: item.purchase_price ?? '0',
        sellingPrice: item.selling_price ?? '0',
        stockQuantity: item.stock_quantity ?? '0',
        lowStockLimit: item.low_stock_limit ?? '0',
        description: item.description || ''
      });
    } else if (type === 'supplier') {
      setForm({
        supplierCode: item.supplier_code || '',
        name: item.name || '',
        company: item.company || '',
        gstin: item.gstin || item.gst_number || '',
        phone: item.phone || '',
        address: item.address || ''
      });
    } else {
      setForm({
        customerCode: item.customer_code || '',
        name: item.name || '',
        mobile: item.mobile || '',
        whatsapp: item.whatsapp || '',
        email: item.email || '',
        address: item.address || '',
        gstin: item.gstin || '',
        creditLimit: item.credit_limit ?? '0',
        openingBalance: item.opening_balance ?? '0',
        notes: item.notes || ''
      });
    }
    setModal(type);
    setPageError('');
  }

  async function saveBill(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setBillError('');
    setNotice('');

    try {
      const customer = customers.find(
        c => String(c.id) === String(billForm.customerId)
          && String(c.status || 'active').toLowerCase() === 'active'
      ) || null;

      if (!billForm.items.length) {
        throw new Error('Add at least one product.');
      }

      const items = billForm.items.map((row, index) => {
        const product = products.find(
          p => String(p.id) === String(row.productId)
            && String(p.status || 'active').toLowerCase() === 'active'
        );
        if (!product) throw new Error(`Select a valid product for item ${index + 1}.`);

        const quantity = Number(row.quantity);
        const sellingPrice = Number(row.sellingPrice);
        const gst = Number(row.gst);
        const stock = Number(product.stock_quantity);

        if (String(row.quantity ?? '').trim() === '') {
          throw new Error(`Item ${index + 1}: quantity is required.`);
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(`Item ${index + 1}: quantity must be greater than zero.`);
        }
        if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
          throw new Error(`Item ${index + 1}: selling price is invalid.`);
        }
        if (!Number.isFinite(gst) || gst < 0 || gst > 100) {
          throw new Error(`Item ${index + 1}: GST must be between 0 and 100%.`);
        }
        if (quantity > stock) {
          throw new Error(`${product.name}: only ${stock} units are available in stock.`);
        }

        const base = quantity * sellingPrice;
        const itemGst = base * gst / 100;

        return {
          productId: product.id,
          name: product.name,
          brand: product.brand || '',
          unit: product.unit || 'pcs',
          quantity,
          purchasePrice: Number(product.purchase_price) || 0,
          sellingPrice,
          gst,
          total: Number((base + itemGst).toFixed(2))
        };
      });

      const subtotal = Number(items.reduce(
        (sum, item) => sum + item.quantity * item.sellingPrice, 0
      ).toFixed(2));

      const gstTotal = Number(items.reduce(
        (sum, item) => sum + item.quantity * item.sellingPrice * item.gst / 100, 0
      ).toFixed(2));

      const discount = String(billForm.discount ?? '').trim() === ''
        ? 0
        : Number(billForm.discount);
      if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
        throw new Error('Discount must be between ₹0 and the subtotal.');
      }

      const total = Number((subtotal - discount + gstTotal).toFixed(2));
      if (String(billForm.paid ?? '').trim() === '') {
        throw new Error('Amount paid is required.');
      }
      const paid = Number(billForm.paid);

      if (!Number.isFinite(paid) || paid < 0 || paid > total) {
        throw new Error('Amount paid must be between ₹0 and the invoice total.');
      }

      const due = Number((total - paid).toFixed(2));

      await request('/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer?.id || null,
          customerName: customer?.name || 'Walk-in Customer',
          customerPhone: customer?.mobile || '',
          items,
          subtotal,
          discount,
          gst: gstTotal,
          total,
          paid,
          due,
          paymentMethod: billForm.paymentMethod
        })
      });

      setBillForm({
        customerId: '',
        discount: '0',
        paid: '',
        paymentMethod: 'Cash',
        items: [{ productId: '', quantity: '', sellingPrice: '', gst: '0' }]
      });
      setNotice('Invoice saved successfully. Refreshing invoice and stock data.');

      const [salesData, productsData] = await Promise.all([
        request('/sales'),
        request('/products')
      ]);
      setSales(listFrom(salesData, 'sales'));
      setProducts(listFrom(productsData, 'products'));
      setNotice('Invoice saved successfully. Invoice list and stock are refreshed.');
    } catch (error) {
      const message = String(error?.message || '');
      const isUserValidation = /Add at least one product|Select a valid product|quantity is required|quantity must be greater than zero|selling price is invalid|GST must be between|units are available in stock|Discount must be between|Amount paid is required|Amount paid must be between/i.test(message);
      setBillError(isUserValidation ? message : 'We could not save this invoice. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function savePayment(event) {
    event.preventDefault();
    setPageError('');
    setNotice('');

    const partyList = paymentForm.type === 'customer' ? customers : suppliers;
    const party = partyList.find(x => String(x.id) === String(paymentForm.partyId));
    const amount = Number(paymentForm.amount);

    if (!party) {
      setPageError(`Please select a ${paymentForm.type}.`);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPageError('Enter a payment amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      const result = await request('/payments', {
        method: 'POST',
        body: JSON.stringify({
          type: paymentForm.type,
          partyId: party.id,
          partyName: party.name || party.company || '',
          amount,
          paymentMethod: paymentForm.paymentMethod,
          paymentDate: paymentForm.paymentDate || null,
          reference: paymentForm.reference.trim(),
          note: paymentForm.note.trim()
        })
      });

      const paymentData = await request('/payments');
      setPayments(listFrom(paymentData, 'payments'));

      if (paymentForm.type === 'supplier') {
        const supplierData = await request('/suppliers');
        setSuppliers(listFrom(supplierData, 'suppliers'));
      }

      setPaymentForm({
        type: 'customer',
        partyId: '',
        amount: '',
        paymentMethod: 'Cash',
        paymentDate: new Date().toLocaleDateString('en-CA'),
        reference: '',
        note: ''
      });
      setNotice(
        paymentForm.type === 'customer'
          ? `Customer payment saved successfully! ${money(amount)} received from ${party.name || party.company || 'customer'}.`
          : `Supplier payment saved successfully! ${money(amount)} paid to ${party.name || party.company || 'supplier'}.`
      );
    } catch (error) {
      setPageError(error.message || 'Unable to record payment.');
    } finally {
      setSaving(false);
    }
  }

  async function saveRecord(event) {
    event.preventDefault();
    setPageError('');

    if (modal === 'customer' || page === 'customer-new') {
      const customerName = String(form.name ?? '').trim();
      const mobile = String(form.mobile ?? '').trim();
      const whatsapp = String(form.whatsapp ?? '').trim();
      const email = String(form.email ?? '').trim();
      const gstin = String(form.gstin ?? '').trim().toUpperCase();
      const mobilePattern = /^[6-9]\d{9}$/;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

      if (!customerName) {
        setPageError('Please enter customer name.');
        return;
      }
      if (!mobile) {
        setPageError('Please enter mobile number.');
        return;
      }
      if (!mobilePattern.test(mobile)) {
        setPageError('Enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (whatsapp && !mobilePattern.test(whatsapp)) {
        setPageError('Enter a valid 10-digit WhatsApp number.');
        return;
      }
      if (email && !emailPattern.test(email)) {
        setPageError('Enter a valid email address, or leave it blank.');
        return;
      }
      if (gstin && !gstinPattern.test(gstin)) {
        setPageError('Enter a valid 15-character GSTIN, or leave it blank.');
        return;
      }
      if (gstin !== String(form.gstin ?? '')) {
        setForm(prev => ({ ...prev, gstin }));
      }
    }

    if (modal === 'supplier' || page === 'supplier-new') {
      const supplierName = String(form.name ?? '').trim();
      const supplierPhone = String(form.phone ?? '').trim();

      if (!supplierName && !supplierPhone) {
        setPageError('Please enter Supplier Name and Phone Number.');
        return;
      }

      if (!supplierName) {
        setPageError('Please enter Supplier Name.');
        return;
      }

      if (!supplierPhone) {
        setPageError('Please enter Supplier Phone Number.');
        return;
      }

      if (!/^[6-9]\d{9}$/.test(supplierPhone)) {
        setPageError('Enter a valid 10-digit Indian mobile number.');
        return;
      }
    }

    setSaving(true);
    try {
      if (modal === 'purchase' || page === 'record-purchase') {
        const supplier = suppliers.find(x => String(x.id) === String(purchaseForm.supplierId)) || null;

        const items = purchaseForm.items.map((item, index) => {
          const quantityText = String(item.quantity ?? '').trim();
          const tilesPerBoxText = String(item.tilesPerBox ?? '').trim();
          const lowStockText = String(item.lowStockLimit ?? '').trim();
          const gstText = String(item.gst ?? '').trim();
          const storageLocation = String(item.storageLocation ?? '').trim();

          if (quantityText === '') throw new Error(`Item ${index + 1}: Please enter Quantity / Stock.`);
          if (tilesPerBoxText === '') throw new Error(`Item ${index + 1}: Please enter Tiles per Box (enter 0 if not applicable).`);
          if (lowStockText === '') throw new Error(`Item ${index + 1}: Please enter Low Stock Alert Level (enter 0 if not applicable).`);
          if (gstText === '') throw new Error(`Item ${index + 1}: Please enter GST % (enter 0 if not applicable).`);
          if (!storageLocation) throw new Error(`Item ${index + 1}: Please enter Storage Location.`);

          const quantity = Number(quantityText);
          const tilesPerBox = Number(tilesPerBoxText);
          const lowStockLimit = Number(lowStockText);
          const gst = Number(gstText);

          if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Item ${index + 1}: Quantity must be greater than 0.`);
          if (!Number.isFinite(tilesPerBox) || tilesPerBox < 0) throw new Error(`Item ${index + 1}: Tiles per Box must be 0 or greater.`);
          if (!Number.isFinite(lowStockLimit) || lowStockLimit < 0) throw new Error(`Item ${index + 1}: Low Stock Alert Level must be 0 or greater.`);
          if (!Number.isFinite(gst) || gst < 0) throw new Error(`Item ${index + 1}: GST % must be 0 or greater.`);

          const purchasePrice = Number(item.purchasePrice) || 0;
          const sellingPrice = Number(item.sellingPrice) || 0;
          return {
            productId: item.productId || null,
            name: String(item.name || '').trim() || 'Unnamed Product',
            brand: String(item.brand || '').trim(),
            category: String(item.category || '').trim(),
            size: String(item.size || '').trim(),
            unit: item.unit || 'pcs',
            finish: item.finish || '',
            tilesPerBox,
            storageLocation,
            productImage: item.productImage || '',
            description: String(item.description || '').trim(),
            quantity,
            purchasePrice,
            sellingPrice,
            gst,
            lowStockLimit,
            total: quantity * purchasePrice
          };
        });

        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const gstTotal = items.reduce((sum, item) => sum + item.total * (Number(item.gst) || 0) / 100, 0);
        const discount = String(purchaseForm.discount ?? '').trim() === ''
          ? 0
          : Number(purchaseForm.discount);
        if (!Number.isFinite(discount) || discount < 0 || discount > subtotal + gstTotal) {
          throw new Error('Discount must be between ₹0 and the purchase total.');
        }
        const total = Math.max(0, subtotal + gstTotal - discount);
        const paid = String(purchaseForm.paid ?? '').trim() === ''
          ? 0
          : Number(purchaseForm.paid);
        if (!Number.isFinite(paid) || paid < 0 || paid > total) {
          throw new Error('Amount paid must be between ₹0 and the purchase total.');
        }

        await request('/purchases', {
          method: 'POST',
          body: JSON.stringify({
            supplierId: supplier?.id || null,
            supplierName: supplier?.name || 'Walk-in Supplier',
            supplierPhone: supplier?.phone || '',
            items,
            subtotal,
            gst: gstTotal,
            discount,
            total,
            paid,
            due: total - paid,
            paymentMethod: purchaseForm.paymentMethod
          })
        });

        setModal(null);
        goTo('purchases');
        setNotice('Purchase recorded successfully. Stock and supplier balances have been updated.');
        await Promise.all([
          request('/purchases').then(data => setPurchases(listFrom(data, 'purchases'))),
          request('/products').then(data => setProducts(listFrom(data, 'products'))),
          request('/suppliers').then(data => setSuppliers(listFrom(data, 'suppliers')))
        ]);
        return;
      }

      const isProduct = modal === 'product';
      const isSupplier = modal === 'supplier';
      const endpoint = isProduct ? '/products' : isSupplier ? '/suppliers' : '/customers';
      const body = isProduct ? {
        ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        stockQuantity: Number(form.stockQuantity) || 0,
        lowStockLimit: Number(form.lowStockLimit) || 0
      } : isSupplier ? {
        supplierCode: form.supplierCode,
        name: String(form.name ?? '').trim(),
        company: form.company,
        phone: String(form.phone ?? '').trim(),
        address: form.address
      } : {
        ...form,
        name: String(form.name ?? '').trim() || 'Unnamed Customer',
        mobile: String(form.mobile ?? '').trim(),
        creditLimit: Number(form.creditLimit) || 0,
        openingBalance: Number(form.openingBalance) || 0
      };
      await request(editingId ? `${endpoint}/${editingId}` : endpoint, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      setModal(null);
      setNotice(`${isProduct ? 'Product' : isSupplier ? 'Supplier' : 'Customer'} ${editingId ? 'updated' : 'created'} successfully.`);
      if (page === 'customer-new') setPage('customers');
      if (page === 'supplier-new') {
        setSupplierFormOpen(false);
        setPage('suppliers');
      }
      await loadPageData();
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function deleteRecord(type, item) {
    setPageError('');
    setNotice('');
    setDeleteTarget({ type, item });
  }

  async function confirmDeleteRecord() {
    if (!deleteTarget || deleting) return;

    const { type, item } = deleteTarget;
    setDeleting(true);
    setPageError('');

    try {
      const endpoint = type === 'product' ? 'products' : type === 'supplier' ? 'suppliers' : 'customers';
      await request(`/${endpoint}/${item.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setNotice(`${type === 'product' ? 'Product' : type === 'supplier' ? 'Supplier' : 'Customer'} deleted successfully.`);
      await loadPageData();
    } catch (error) {
      setPageError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  const lowStock = useMemo(
    () => products.filter(p => Number(p.stock_quantity) <= Number(p.low_stock_limit)),
    [products]
  );

  const filteredProducts = useMemo(() => products.filter(item => {
    const matchesText = (value, query) =>
      String(value ?? '').toLowerCase().includes(query.trim().toLowerCase());

    const stock = Number(item.stock_quantity || 0);
    const lowLimit = Number(item.low_stock_limit || 0);
    const isLowStock = stock <= lowLimit;
    const status = String(item.status || 'active').toLowerCase();

    return (
      matchesText(`${item.name || ''} ${item.product_code || ''}`, productNameFilter) &&
      matchesText(`${item.category || ''} ${item.brand || ''}`, productCategoryFilter) &&
      matchesText(item.purchase_price, productPurchaseFilter) &&
      matchesText(item.selling_price, productSellingFilter) &&
      matchesText(item.stock_quantity, productStockFilter) &&
      (
        productStatusFilter === 'all' ||
        (productStatusFilter === 'low-stock' && isLowStock) ||
        (productStatusFilter === 'active' && status === 'active' && !isLowStock) ||
        (productStatusFilter === 'inactive' && status === 'inactive')
      )
    );
  }), [
    products,
    productNameFilter,
    productCategoryFilter,
    productPurchaseFilter,
    productSellingFilter,
    productStockFilter,
    productStatusFilter
  ]);

  const filteredCustomers = useMemo(() => customers.filter(item =>
    [item.name, item.customer_code, item.mobile, item.email]
      .some(value => String(value || '').toLowerCase().includes(search.toLowerCase()))
  ), [customers, search]);

  const [salesColumnFilters, setSalesColumnFilters] = useState({
    invoice: '',
    customer: '',
    total: '',
    paid: '',
    due: '',
    date: ''
  });

  const [purchaseColumnFilters, setPurchaseColumnFilters] = useState({
    supplier: '',
    productCount: '',
    total: '',
    paid: '',
    due: '',
    method: '',
    date: ''
  });

  const [supplierColumnFilters, setSupplierColumnFilters] = useState({
    name: '',
    purchases: '',
    paid: '',
    due: '',
    lastPurchase: ''
  });

  const [customerColumnFilters, setCustomerColumnFilters] = useState({
    name: '',
    mobile: '',
    email: '',
    balance: '',
    status: ''
  });

  const [pendingDeliveriesOnly, setPendingDeliveriesOnly] = useState(false);

  const [deliveryColumnFilters, setDeliveryColumnFilters] = useState({
    delivery: '',
    customer: '',
    driver: '',
    driverPhone: '',
    vehicle: '',
    status: '',
    date: ''
  });

  const [paymentColumnFilters, setPaymentColumnFilters] = useState({
    type: '',
    name: '',
    method: '',
    amount: '',
    date: ''
  });


  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState('');
  const [selectedPaymentSupplier, setSelectedPaymentSupplier] = useState('');
  const [paymentCalendarMonth, setPaymentCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  function getListPagination(key, total) {
    const config = listPagination[key] || {};
    const size = Number(config.size) || 10;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const pageNumber = Math.min(Number(config.page) || 1, totalPages);
    const start = (pageNumber - 1) * size;

    const controls = total > 10 ? (
      <div className="inventory-pagination">
        <div className="inventory-pagination-info">
          Showing {total ? start + 1 : 0}–{Math.min(start + size, total)} of {total} records
        </div>
        <div className="inventory-pagination-controls">

          <button
            type="button"
            className="secondary-button"
            disabled={pageNumber <= 1}
            onClick={() => setListPagination(prev => ({
              ...prev,
              [key]: { ...(prev[key] || {}), size, page: Math.max(1, pageNumber - 1) }
            }))}
          >
            Previous
          </button>
          <input
            aria-label="Go to page"
            className="inventory-go-page-input"
            type="number"
            min="1"
            max={totalPages}
            defaultValue={pageNumber}
            key={`${key}-${pageNumber}-${totalPages}`}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const target = Math.min(totalPages, Math.max(1, Number(e.currentTarget.value) || 1));
                setListPagination(prev => ({
                  ...prev,
                  [key]: { ...(prev[key] || {}), size, page: target }
                }));
              }
            }}
          />
          <button
            type="button"
            className="secondary-button"
            disabled={pageNumber >= totalPages}
            onClick={() => setListPagination(prev => ({
              ...prev,
              [key]: { ...(prev[key] || {}), size, page: Math.min(totalPages, pageNumber + 1) }
            }))}
          >
            Next
          </button>
        </div>
      </div>
    ) : null;

    return {
      start,
      visible: total > 10 ? Math.min(size, total - start) : total,
      controls
    };
  }

  if (!token) {
    return (
      <div className="login-screen">
        <div className="login-image" />
        <div className="login-shade" />
        <div className="login-top"><div className="brand-mark tile-logo-diamond" aria-label="TileBiz tile logo">
  <span className="tile-green"></span>
  <span className="tile-cream"></span>
  <span className="tile-gold"></span>
  <span className="tile-charcoal"></span>
</div><div className="brand-word">Tile<span>Biz</span><small>MANAGER</small></div></div>
        <main className="login-layout">
          <section className="login-copy">
            <div className="eyebrow"><span /> BUILT FOR TILE BUSINESSES</div>
            <h1>Your business.<br /><em>Beautifully</em> managed.</h1>
            <p>Keep your inventory, customers and daily business operations in one organised place.</p>
            <div className="login-benefits"><span><CheckCircle2 size={17} /> Inventory control</span><span><CheckCircle2 size={17} /> Sales overview</span><span><CheckCircle2 size={17} /> Business insights</span></div>
          </section>
          <section className="login-card">
            <div className="login-icon"><Building2 size={23} /></div>
            <h2><span className="welcome-white">Welcome </span><span className="welcome-gold">Back</span></h2>
            <p className="muted">Sign in to your TileBiz account</p>
            <form onSubmit={handleLogin}>
              <label>Username <span className="required-mark">*</span></label>
              <div className="input-wrap"><input type="text" value={loginName} onChange={e => { setLoginName(e.target.value); setPageError(''); }} placeholder="Username" autoComplete="username" required /></div>
              <label>Password <span className="required-mark">*</span></label>
              <div className="input-wrap"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setPageError(''); setForgotPasswordMessage(''); }} placeholder="Password" autoComplete="current-password" required /><button className="eye-button" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              <button className="primary-button login-button" disabled={loginLoading}>{loginLoading ? <><LoaderCircle className="spin" size={18} /> Signing in…</> : <>Sign in to TileBiz </>}</button>
              <div
                className="login-forgot-password"
                role="button"
                tabIndex={0}
                onClick={() => { setPageError(''); setForgotPasswordMessage('Please contact your administrator to reset your password.'); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPageError('');
                    setForgotPasswordMessage('Please contact your administrator to reset your password.');
                  }
                }}
              >
                Forgot Password?
              </div>
              {forgotPasswordMessage && (
                <div className="forgot-password-error" role="alert">
                  <span>{forgotPasswordMessage}</span>
                  <button
                    type="button"
                    aria-label="Dismiss error message"
                    onClick={() => setForgotPasswordMessage('')}
                    style={{
                      marginLeft: 'auto',
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '20px',
                      lineHeight: 1,
                      padding: '0 4px'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              {pageError && (
                <div className="forgot-password-error" role="alert">
                  <span>{pageError}</span>
                  <button
                    type="button"
                    aria-label="Dismiss error message"
                    onClick={() => setPageError('')}
                    style={{
                      marginLeft: 'auto',
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '20px',
                      lineHeight: 1,
                      padding: '0 4px'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </form>
            <div className="login-secure"><LockKeyhole size={13} /> Secure business access</div>
          </section>
        </main>
        <div className="login-tagline-gold">TILES. SPACES. POSSIBILITIES.</div>
        <footer className="login-footer"></footer>
      </div>
    );
  }

  const currentNav = navigation.find(n => n.id === page)
    || (page === 'record-purchase' ? { id: 'record-purchase', label: 'New Purchase', icon: ReceiptText } : null)
    || (page === 'record-payment' ? { id: 'record-payment', label: 'Record Payment', icon: CreditCard } : null)
    || (page === 'delivery-assignment' ? { id: 'delivery-assignment', label: 'Assign Driver & Vehicle', icon: Truck } : null)
    || navigation[0];
  const PageIcon = currentNav.icon;

  function statCard(label, value, note, Icon, tone, targetPage) {
    return <div className="stat-card" key={label}>
      <div className={`stat-icon ${tone}`}><Icon size={20} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
      <button type="button" className="stat-view-details" onClick={() => goTo(targetPage)}>
        View Details <span aria-hidden="true">→</span>
      </button>
    </div>;
  }

  function table(headers, rows, emptyText = 'No records found.') {
    return <div className="table-wrap"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows : <tr><td colSpan={headers.length} className="empty-cell">{emptyText}</td></tr>}</tbody></table></div>;
  }

  function purchasesTable(headers, rows, emptyText = 'No invoices found.') {
    const filters = [
      ['supplier', 'Search supplier...'],
      ['productCount', 'Search number of products...'],
      ['total', 'Search purchase total...'],
      ['paid', 'Search amount paid...'],
      ['due', 'Search outstanding due...'],
      ['method', 'Search payment mode...'],
      ['date', 'Search date...']
    ];

    return <div className="table-wrap"><table className="products-filter-table">
      <thead>
        <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
        <tr className="column-filter-row">
          {filters.map(([key, placeholder]) => <th key={key}>
            <input type="search"
              aria-label={placeholder}
              placeholder={placeholder}
              value={purchaseColumnFilters[key]}
              onChange={e => setPurchaseColumnFilters(prev => ({...prev, [key]: e.target.value}))}
            />
          </th>)}
          {headers.length > filters.length && <th aria-label="Actions" />}
        </tr>
      </thead>
      <tbody>{rows.length ? rows : <tr><td colSpan={headers.length} className="empty-cell">{emptyText}</td></tr>}</tbody>
    </table></div>;
  }

  function suppliersTable(headers, rows, emptyText = 'No suppliers found.') {
    const filters = [
      ['name', 'Search supplier name...'],
      ['purchases', 'Search purchases...'],
      ['paid', 'Search paid amount...'],
      ['due', 'Search outstanding...'],
      ['lastPurchase', 'Search last purchase date...']
    ];

    return <div className="table-wrap"><table className="products-filter-table supplier-filter-table">
      <thead>
        <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
        <tr className="column-filter-row">
          {filters.map(([key, placeholder]) => <th key={key}>
            <input
              type="search"
              aria-label={placeholder}
              placeholder={placeholder}
              value={supplierColumnFilters[key]}
              onChange={e => setSupplierColumnFilters(prev => ({...prev, [key]: e.target.value}))}
            />
          </th>)}
          {headers.length > filters.length && <th aria-label="Actions" />}
        </tr>
      </thead>
      <tbody>{rows.length ? rows : <tr><td colSpan={headers.length} className="empty-cell">{emptyText}</td></tr>}</tbody>
    </table></div>;
  }

  function renderProducts() {
    const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
    const safeProductPage = Math.min(productPage, totalProductPages);
    const productStartIndex = (safeProductPage - 1) * productPageSize;
    const visibleProducts = filteredProducts.slice(
      productStartIndex,
      productStartIndex + productPageSize
    );
    const activeProducts = products.filter(
      p => String(p.status || 'active').toLowerCase() === 'active'
    );

    const availableProducts = activeProducts.filter(p =>
      Number(p.stock_quantity || 0) > Number(p.low_stock_limit || 0)
    ).length;

    const lowStockProducts = activeProducts.filter(p => {
      const stock = Number(p.stock_quantity || 0);
      const limit = Number(p.low_stock_limit || 0);
      return stock > 0 && stock <= limit;
    }).length;

    const outOfStockProducts = activeProducts.filter(p =>
      Number(p.stock_quantity || 0) <= 0
    ).length;

    const productRows = visibleProducts.map(p => (
      <tr key={p.id}>
        <td>
          <div className="stock-product-cell">
            <div>
              <strong>{p.name || '—'}</strong>
              <small>{p.product_code || 'No product code'}</small>
            </div>
          </div>
        </td>
        <td>{p.category || '—'}<small>{p.brand || '—'}</small></td>
        <td>{money(p.purchase_price)}</td>
        <td>{money(p.selling_price)}</td>
        <td>
          <strong>{Number(p.stock_quantity || 0).toLocaleString('en-IN')}</strong>
          <small>{p.unit || 'pcs'}</small>
        </td>
        <td>
          <span className={`status ${Number(p.stock_quantity || 0) <= Number(p.low_stock_limit || 0) ? 'warning' : 'success'}`}>
            {Number(p.stock_quantity || 0) <= Number(p.low_stock_limit || 0)
              ? 'Low stock'
              : (p.status || 'active')}
          </span>
        </td>
      </tr>
    ));

    return <>
      <div className="section-toolbar">
        <div>
          <h2>🧱 Stocks / Inventory</h2>
        </div>
      </div>
      <div className="stats-grid stock-kpi-grid">
        <div className="stat-card">
          <div className="stat-icon green"><Package size={18} /></div>
          <div className="stat-label">Total Stock Value</div>
          <div className="stat-value">
            {money(products.reduce((total, p) =>
              total + ((Number(p.stock_quantity) || 0) * (Number(p.purchase_price) || 0)), 0
            ))}
          </div>
          <div className="stat-note">Available stock quantity × purchase price</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Package size={18} /></div>
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{products.length.toLocaleString('en-IN')}</div>
          <div className="stat-note">All products</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue"><Boxes size={18} /></div>
          <div className="stat-label">Available Products</div>
          <div className="stat-value">{availableProducts.toLocaleString('en-IN')}</div>
          <div className="stat-note">Active products in stock</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon gold"><AlertTriangle size={18} /></div>
          <div className="stat-label">Low Stock</div>
          <div className="stat-value">{lowStockProducts.toLocaleString('en-IN')}</div>
          <div className="stat-note">Needs restocking</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon rose"><XCircle size={18} /></div>
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value">{outOfStockProducts.toLocaleString('en-IN')}</div>
          <div className="stat-note">Zero quantity</div>
        </div>
      </div>

      <div className="panel products-filter-panel">
        <div className="products-filter-summary">
          <span className="count-label">{filteredProducts.length} of {products.length} products</span>
          
        </div>
        <div className="table-wrap">
          <table className="products-filter-table">
            <thead>
              <tr>
                <th>Product / Code</th>
                <th>Category / Brand</th>
                <th>Purchase price</th>
                <th>Selling price</th>
                <th>Stock quantity / Unit</th>
                <th>Status</th>
              </tr>
              <tr className="column-filter-row">
                <th>
                  <input type="search" aria-label="Search product name or code" placeholder="Search product / code…" value={productNameFilter} onChange={e => setProductNameFilter(e.target.value)} />
                </th>
                <th>
                  <input type="search" aria-label="Search category or brand" placeholder="Search category / brand…" value={productCategoryFilter} onChange={e => setProductCategoryFilter(e.target.value)} />
                </th>
                <th>
                  <input type="search" aria-label="Search purchase price" inputMode="decimal" placeholder="Search purchase price…" value={productPurchaseFilter} onChange={e => setProductPurchaseFilter(e.target.value)} />
                </th>
                <th>
                  <input type="search" aria-label="Search selling price" inputMode="decimal" placeholder="Search selling price…" value={productSellingFilter} onChange={e => setProductSellingFilter(e.target.value)} />
                </th>
                <th>
                  <input type="search" aria-label="Search stock quantity" inputMode="decimal" placeholder="Search stock quantity…" value={productStockFilter} onChange={e => setProductStockFilter(e.target.value)} />
                </th>
                <th>
                  <select aria-label="Filter product status" value={productStatusFilter} onChange={e => setProductStatusFilter(e.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="low-stock">Low stock</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </th>
              </tr>
            </thead>
            <tbody>
              {productRows.length
                ? productRows
                : <tr><td colSpan={6} className="empty-cell">No products match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {filteredProducts.length > 10 && <div className="inventory-pagination">
          <div className="inventory-pagination-info">
            Showing {filteredProducts.length ? productStartIndex + 1 : 0}–
            {Math.min(productStartIndex + productPageSize, filteredProducts.length)}
            {" "}of {filteredProducts.length} products
          </div>
          <div className="inventory-pagination-controls">

            <button
              type="button"
              className="secondary-button"
              disabled={safeProductPage <= 1}
              onClick={() => setProductPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <input
              aria-label="Go to page"
              className="inventory-go-page-input"
              type="number"
              min="1"
              max={totalProductPages}
              defaultValue={safeProductPage}
              key={`${safeProductPage}-${totalProductPages}`}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setProductPage(Math.min(totalProductPages, Math.max(1, Number(e.currentTarget.value) || 1)));
                }
              }}
            />
            <button
              type="button"
              className="secondary-button"
              disabled={safeProductPage >= totalProductPages}
              onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>}
      </div>
    </>;
  }

  function renderNewCustomer() {
    return <>
      <div className="purchase-page-intro customer-page-intro">
        
        <h2>New Customer</h2>
      </div>
      <section className="panel record-modal customer-inline-form supplier-inline-form">
        <form onSubmit={saveRecord}>
          <div className="form-grid">
            {[
              ['Customer name', 'name', true],
              ['Mobile (+91)', 'mobile', true],
              ['WhatsApp (+91)', 'whatsapp'],
              ['Email', 'email'],
              ['GSTIN', 'gstin'],
              ['Address', 'address', true],
            ].map(([label, key, required]) => (
              <label
                key={key}
                className={['address', 'notes'].includes(key) ? 'field-wide' : ''}
              >
                {label}
                {['address', 'notes'].includes(key) ? (
                  <textarea
                    rows={3}
                    value={form[key] ?? ''}
                    onChange={e => {
                      setForm(prev => ({ ...prev, [key]: e.target.value }));
                      setPageError('');
                    }}
                  />
                ) : (
                  <input
                    type={['mobile', 'whatsapp'].includes(key) ? 'tel' : 'text'}
                    inputMode={['mobile', 'whatsapp'].includes(key) ? 'numeric' : undefined}
                    maxLength={['mobile', 'whatsapp'].includes(key) ? 10 : undefined}
                    value={form[key] ?? ''}
                    
                    onChange={e => {
                      setForm(prev => ({
                        ...prev,
                        [key]: ['mobile', 'whatsapp'].includes(key)
                          ? normalizeIndianPhoneInput(e.target.value)
                          : e.target.value
                      }));
                      setPageError('');
                    }}
                  />
                )}
              </label>
            ))}
          </div>
          {pageError && <div className="alert error">{pageError}</div>}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => { setModal(null); setPageError(''); goTo('customers'); }}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : 'Create customer'}
            </button>
          </div>
        </form>
      </section>
    </>;
  }

  function renderNewSupplier() {
    return <>
      <div className="purchase-page-intro new-supplier-intro">
        <h2>New Supplier</h2>
        <p>Enter the supplier's contact and business details.</p>
      </div>
      <section className="panel record-modal customer-inline-form supplier-inline-form">
        <form onSubmit={saveRecord}>
          <div className="form-grid">
            {[
              ['Supplier name', 'name', true],
              ['Company name', 'company'],
              ['Supplier code', 'supplierCode'],
              ['Phone number (+91)', 'phone', true],
              ['Address', 'address']
            ].map(([label, key, required]) => (
              <label key={key} className={key === 'address' ? 'field-wide' : ''}>
                {label}
                <input
                  type={key === 'phone' ? 'tel' : 'text'}
                  inputMode={key === 'phone' ? 'numeric' : undefined}
                  maxLength={key === 'phone' ? 10 : undefined}
                  value={form[key] ?? ''}
                  
                  onChange={e => {
                    setForm(prev => ({
                      ...prev,
                      [key]: key === 'phone'
                        ? normalizeIndianPhoneInput(e.target.value)
                        : e.target.value
                    }));
                    setPageError('');
                  }}
                  placeholder={key === 'phone' ? '10-digit number' : label}
                />
              </label>
            ))}
          </div>
          {pageError && <div className="alert error">{pageError}</div>}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => { setModal(null); setPageError(''); goTo('suppliers'); }}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </section>
    </>;
  }

  function renderCustomers() {
    const totalCustomerSales = sales.reduce(
      (sum, sale) => sum + Number(sale.total || 0), 0
    );

    const totalCustomerOutstanding = sales.reduce(
      (sum, sale) => sum + Math.max(
        0,
        Number(sale.due ?? (Number(sale.total || 0) - Number(sale.paid || 0)))
      ),
      0
    );

    const matches = (value, filter) =>
      String(value ?? '').toLowerCase().includes(filter.trim().toLowerCase());

    const customerRows = filteredCustomers.filter(c =>
      matches(`${c.name || ''} ${c.customer_code || ''}`, customerColumnFilters.name) &&
      matches(c.mobile, customerColumnFilters.mobile) &&
      matches(c.email, customerColumnFilters.email) &&
      matches(c.opening_balance, customerColumnFilters.balance) &&
      matches(c.status || 'active', customerColumnFilters.status)
    );
    const customerPagination = getListPagination('customers', customerRows.length);
    const visibleCustomerRows = customerRows.slice(
      customerPagination.start,
      customerPagination.start + customerPagination.visible
    );

    const customerFilters = [
      ['name', 'Search customer...'],
      ['mobile', 'Search mobile...'],
      ['email', 'Search email...'],
      ['balance', 'Search balance...'],
      ['status', 'Search status...'],
      [null, '']
    ];

    return <>
      <div className="section-toolbar"><div><h2>👥 Customers</h2><p>📋 Keep your customer details and account information organised.</p></div>{!(modal === 'customer' && page === 'customers' && editingId) && <button className="primary-button" onClick={openNewCustomerPage}><Plus size={17} /> Add customer</button>}</div>

      <div className="customer-stats">
        <div className="customer-stat customer-stat-total">
          <span>👥 Total Customers</span>
          <strong>{customers.length.toLocaleString('en-IN')}</strong>
          <small>Registered customers</small>
        </div>
        <div className="customer-stat customer-stat-sales">
          <span>💰 Total Sales</span>
          <strong>{money(totalCustomerSales)}</strong>
          <small>{sales.length} sales records · All time</small>
        </div>
        <div className="customer-stat customer-stat-due">
          <span>⏳ Outstanding Due</span>
          <strong>{money(totalCustomerOutstanding)}</strong>
          <small>Pending sales balance · All time</small>
        </div>
      </div>

      
      {modal === 'customer' && page === 'customers' && (
        <section className="panel record-modal supplier-inline-form customer-inline-form">
          <div className="modal-header">
            <div>
              <span className="modal-kicker">{editingId ? 'UPDATE RECORD' : 'NEW RECORD'}</span>
              <h2>{modalTitle}</h2>
            </div>
          </div>
          <form onSubmit={saveRecord}>
            <div className="form-grid">
              {[
                ['Customer name', 'name', true],
                ['Mobile (+91)', 'mobile', true],
                ['WhatsApp (+91)', 'whatsapp'],
                ['Email', 'email'],
                ['GSTIN', 'gstin', true],
                ['Address', 'address', true],
                ['Notes', 'notes']
              ].map(([label, key, required]) => (
                <label
                  key={key}
                  className={['address', 'notes'].includes(key) ? 'field-wide' : ''}
                >
                  {label}
                  {['address', 'notes'].includes(key) ? (
                    <textarea
                      value={form[key] ?? ''}
                      
                      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  ) : (
                    <input
                      type={['mobile', 'whatsapp'].includes(key) ? 'tel' : 'text'}
                      inputMode={['mobile', 'whatsapp'].includes(key) ? 'numeric' : (['creditLimit', 'openingBalance'].includes(key) ? 'decimal' : undefined)}
                      maxLength={['mobile', 'whatsapp'].includes(key) ? 10 : undefined}
                      value={form[key] ?? ''}
                      
                      onChange={e => setForm(prev => ({
                        ...prev,
                        [key]: ['mobile', 'whatsapp'].includes(key)
                          ? normalizeIndianPhoneInput(e.target.value)
                          : e.target.value
                      }))}
                    />
                  )}
                </label>
              ))}
            </div>
            {pageError && <div className="alert error">{pageError}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => { setModal(null); setPageError(''); }}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create customer'}
              </button>
            </div>
          </form>
        </section>
      )}
      {!(modal === 'customer' && page === 'customers') && (
        <div className="panel">
        <div className="panel-toolbar">
          <span className="count-label">{customerRows.length} customers</span>
        </div>
        <div className="table-wrap">
          <table className="products-filter-table">
            <thead>
              <tr>
                <th>👤 Customer</th>
                <th>📱 Mobile</th>
                <th>✉️ Email</th>
                <th>💰 Opening balance</th>
                <th>🟢 Status</th>
                <th>⚙️ Actions</th>
              </tr>
              <tr className="column-filter-row">
                {customerFilters.map(([key, placeholder], index) => (
                  <th key={key || `actions-${index}`}>
                    {key ? <input type="search"
                      aria-label={placeholder}
                      placeholder={placeholder}
                      value={customerColumnFilters[key]}
                      onChange={e => setCustomerColumnFilters(prev => ({ ...prev, [key]: e.target.value }))}
                    /> : <span className="filter-not-available"></span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customerRows.length ? visibleCustomerRows.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.mobile || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{money(c.opening_balance)}</td>
                  <td><span className={`status ${c.status === 'inactive' ? 'warning' : 'success'}`}>{c.status || 'active'}</span></td>
                  <td><div className="actions"><button onClick={() => openEdit('customer', c)}>Edit</button><button className="danger-text" onClick={() => deleteRecord('customer', c)}>Delete</button></div></td>
                </tr>
              )) : <tr><td colSpan={6} className="empty-cell">No customers match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {customerPagination.controls}
        </div>
      )}
    </>;
  }

  function renderDashboard() {
    const dashboardNow = new Date();
    const dateKey = date => [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');

    const todayKey = dateKey(dashboardNow);
    const weekStart = new Date(dashboardNow);
    weekStart.setDate(dashboardNow.getDate() - ((dashboardNow.getDay() + 6) % 7));

    let periodFrom = '';
    let periodTo = todayKey;

    if (dashboardPeriod === 'today') {
      periodFrom = todayKey;
    } else if (dashboardPeriod === 'week') {
      periodFrom = dateKey(weekStart);
    } else if (dashboardPeriod === 'month') {
      periodFrom = dateKey(new Date(dashboardNow.getFullYear(), dashboardNow.getMonth(), 1));
    } else if (dashboardPeriod === 'year') {
      periodFrom = `${dashboardNow.getFullYear()}-01-01`;
    } else if (dashboardPeriod === 'custom') {
      periodFrom = dashboardFrom;
      periodTo = dashboardTo;
    }

    function dateInDashboardRange(raw) {
      if (dashboardPeriod === 'all') return true;
      if (!raw || (periodFrom && periodTo && periodFrom > periodTo)) return false;

      let key = '';
      if (typeof raw === 'string') {
        const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) key = match[1];
      }
      if (!key) {
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return false;
        key = dateKey(parsed);
      }

      return (!periodFrom || key >= periodFrom) &&
             (!periodTo || key <= periodTo);
    }

    const dashboardSales = sales.filter(s =>
      dateInDashboardRange(
        s.created_at || s.sale_date || s.invoice_date ||
        s.date || s.createdAt || s.invoiceDate
      )
    );

    const dashboardPayments = payments.filter(payment =>
      dateInDashboardRange(
        payment.created_at || payment.payment_date ||
        payment.date || payment.createdAt
      )
    );

    const revenue = dashboardSales.reduce(
      (sum, s) => sum + Number(s.total || 0), 0
    );
    const paymentsCollected = dashboardPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0), 0
    );
    const dues = revenue - paymentsCollected;
    const stockValue = products.reduce(
      (sum, p) => sum + Number(p.stock_quantity || 0) * Number(p.purchase_price || 0), 0
    );

    // Build the chart from actual sales, using available date fields.
    const getSaleDate = s =>
      s.created_at || s.sale_date || s.invoice_date ||
      s.date || s.createdAt || s.invoiceDate || null;

    // Keep the two summary figures aligned with the graph's date range.
    function isWithinChartRange(raw) {
      if (!raw) return !chartFrom && !chartTo;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return !chartFrom && !chartTo;

      const day = dateKey(date);
      return (!chartFrom || day >= chartFrom) &&
             (!chartTo || day <= chartTo);
    }

    const chartRevenue = sales.reduce((sum, sale) => {
      if (!isWithinChartRange(getSaleDate(sale))) return sum;
      return sum + Number(sale.total || 0);
    }, 0);

    const chartPaymentsReceived = payments.reduce((sum, payment) => {
      if (String(payment.type || '').toLowerCase() !== 'customer') return sum;
      const rawDate = payment.created_at || payment.payment_date ||
        payment.date || payment.createdAt || null;
      if (!isWithinChartRange(rawDate)) return sum;
      return sum + Number(payment.amount || 0);
    }, 0);

    const monthlyTotals = new Map();
    let undatedRevenue = 0;
    let undatedCount = 0;
    let undatedCollected = 0;
    let undatedPaymentCount = 0;

    sales.forEach(s => {
      const rawDate = getSaleDate(s);
      const date = rawDate ? new Date(rawDate) : null;
      const amount = Number(s.total || 0);

      if ((!date || Number.isNaN(date.getTime())) && (chartFrom || chartTo)) return;
      if (date && !Number.isNaN(date.getTime())) {
        const fromDate = chartFrom ? new Date(`${chartFrom}T00:00:00`) : null;
        const toDate = chartTo ? new Date(`${chartTo}T23:59:59.999`) : null;
        if ((fromDate && date < fromDate) || (toDate && date > toDate)) return;
      }

      if (!date || Number.isNaN(date.getTime())) {
        undatedRevenue += amount;
        undatedCount += 1;
        return;
      }

      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      const label = date.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
      });

      if (!monthlyTotals.has(key)) {
        monthlyTotals.set(key, {
          key, label, revenue: 0, collected: 0, count: 0, paymentCount: 0, year, month,
        });
      }

      const bucket = monthlyTotals.get(key);
      bucket.revenue += amount;
      bucket.count += 1;
    });

    // Add actual recorded customer payments to their payment months.
    payments
      .filter(payment => String(payment.type || '').toLowerCase() === 'customer')
      .forEach(payment => {
      const rawDate = payment.created_at || payment.payment_date ||
        payment.date || payment.createdAt || null;
      const date = rawDate ? new Date(rawDate) : null;
      const amount = Number(payment.amount || 0);

      if ((!date || Number.isNaN(date.getTime())) && (chartFrom || chartTo)) return;
      if (date && !Number.isNaN(date.getTime())) {
        const fromDate = chartFrom ? new Date(`${chartFrom}T00:00:00`) : null;
        const toDate = chartTo ? new Date(`${chartTo}T23:59:59.999`) : null;
        if ((fromDate && date < fromDate) || (toDate && date > toDate)) return;
      }

      if (!date || Number.isNaN(date.getTime())) {
        undatedCollected += amount;
        undatedPaymentCount += 1;
        return;
      }

      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      const label = date.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
      });

      if (!monthlyTotals.has(key)) {
        monthlyTotals.set(key, {
          key, label, revenue: 0, collected: 0, count: 0,
          paymentCount: 0, year, month,
        });
      }

      const bucket = monthlyTotals.get(key);
      bucket.collected += amount;
      bucket.paymentCount += 1;
    });

    // Show 6 previous months, the current month, and 6 future months.
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let salesMonths;

    // Keep undated records separate; never assign them to an invented month.
    if (monthlyTotals.size === 0 && (undatedCount > 0 || undatedPaymentCount > 0)) {
      salesMonths = [{
        key: 'undated',
        label: 'No date',
        revenue: undatedRevenue,
        collected: undatedCollected,
        count: undatedCount,
        paymentCount: undatedPaymentCount,
      }];
    } else {
      salesMonths = Array.from({ length: 13 }, (_, i) => {
        const date = new Date(currentYear, currentMonth - 6 + i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}`;
        const existing = monthlyTotals.get(key);

        return existing || {
          key,
          label: date.toLocaleDateString('en-IN', {
            month: 'short',
            year: '2-digit',
          }),
          revenue: 0,
          collected: 0,
          count: 0,
          paymentCount: 0,
          year,
          month,
        };
      });
    }

    const rawMaxChartAmount = Math.max(
      ...salesMonths.flatMap(m => [m.revenue, m.collected || 0]),
      1
    );
    // Rounded axis ceiling with headroom for the highest chart point.
    const chartMagnitude = 10 ** Math.floor(Math.log10(rawMaxChartAmount));
    const maxChartAmount = Math.max(
      chartMagnitude,
      Math.ceil((rawMaxChartAmount * 1.12) / chartMagnitude) * chartMagnitude
    );

    const chartPoints = salesMonths.map((m, i) => ({
      ...m,
      x: salesMonths.length === 1
        ? 300
        : 60 + i * (480 / (salesMonths.length - 1)),
    }));

    const chartCoords = chartPoints.map(m => ({
      x: m.x,
      y: 164 - (m.revenue / maxChartAmount) * 125,
    }));

    const chartLinePath = chartCoords.length
      ? chartCoords.reduce((path, point, i, points) => {
          if (i === 0) return `M ${point.x} ${point.y}`;
          const prev = points[i - 1];
          const midX = (prev.x + point.x) / 2;
          return `${path} C ${midX} ${prev.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
        }, "")
      : "";

    const chartAreaPath = chartCoords.length
      ? `${chartLinePath} L ${chartCoords[chartCoords.length - 1].x} 164 L ${chartCoords[0].x} 164 Z`
      : "";

    const paymentChartCoords = chartPoints.map(m => ({
      x: m.x,
      y: 164 - ((m.collected || 0) / maxChartAmount) * 125,
    }));

    const paymentChartLinePath = paymentChartCoords.length
      ? paymentChartCoords.reduce((path, point, i, points) => {
          if (i === 0) return `M ${point.x} ${point.y}`;
          const prev = points[i - 1];
          const midX = (prev.x + point.x) / 2;
          return `${path} C ${midX} ${prev.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
        }, "")
      : "";

    return <>
      <div className="td-dashboard">
        <div className="supplier-filter-row dashboard-kpi-filter">
          <select
            aria-label="Dashboard KPI timeframe"
            value={dashboardPeriod}
            onChange={e => {
              const nextPeriod = e.target.value;
              if (nextPeriod === 'custom') {
                setDashboardFrom('');
                setDashboardTo('');
              }
              setDashboardPeriod(nextPeriod);
            }}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="custom">Custom range</option>
          </select>
          {dashboardPeriod === 'custom' && <>
            <label className="supplier-date-filter">From
              <input type="date" value={dashboardFrom}
                max={todayKey}
                onChange={e => setDashboardFrom(e.target.value)} />
            </label>
            <label className="supplier-date-filter">To
              <input type="date" value={dashboardTo}
                min={dashboardFrom || undefined}
                max={todayKey}
                onChange={e => setDashboardTo(e.target.value)} />
            </label>
          </>}
        </div>
        <section className="td-kpis">
          <article className="td-kpi"><div className="td-kpi-top"><span>Total Stock Value</span><span className="td-icon td-purple">📦</span></div><strong>{money(stockValue)}</strong><button onClick={() => goTo('products')}>View stock →</button></article>
          <article className="td-kpi"><div className="td-kpi-top"><span>Total Sales</span><span className="td-icon td-blue">📈</span></div><strong>{money(revenue)}</strong><button onClick={() => goTo('sales')}>View sales →</button></article>
          <article className="td-kpi"><div className="td-kpi-top"><span>Payments Collected</span><span className="td-icon td-green">💰</span></div><strong>{money(paymentsCollected)}</strong><button onClick={() => goTo('record-payment')}>View payments →</button></article>
          <article className="td-kpi"><div className="td-kpi-top"><span>Outstanding Dues</span><span className="td-icon td-orange">⏳</span></div><strong>{money(dues)}</strong><button onClick={() => goTo('sales')}>View dues→</button></article>
        </section>

        <section className="td-middle">
          <article className="td-panel">
            <div className="td-panel-heading"><div><h2>Quick Actions</h2><p>Common tasks, right at your fingertips</p></div></div>
            <div className="td-actions-grid">
              <button onClick={() => goTo('products')}><span className="td-action-icon td-teal">📦</span><span><b>View Stock</b><small>Check inventory</small></span><i>›</i></button>
              <button onClick={() => { openCreate('purchase'); setModal(null); goTo('record-purchase'); }}><span className="td-action-icon td-orange">🛒</span><span><b>Add Purchase</b><small>Record new stock</small></span><i>›</i></button>
              <button onClick={openNewCustomerPage}><span className="td-action-icon td-green">👥</span><span><b>Add Customer</b><small>Register a customer</small></span><i>›</i></button>
              <button onClick={() => goTo('bill')}><span className="td-action-icon td-blue">🧾</span><span><b>Create Bill</b><small>Create a new sale</small></span><i>›</i></button>
              <button onClick={() => goTo('payments')}><span className="td-action-icon td-purple">💰</span><span><b>Record Payment</b><small>Track a payment</small></span><i>›</i></button>
              <button onClick={() => goTo('reports')}><span className="td-action-icon td-pink">📊</span><span><b>View Reports</b><small>Business insights</small></span><i>›</i></button>
            </div>
          </article>

          <article className="td-panel">
            <div className="td-panel-heading"><div><h2>Need Attention</h2><p>Items that may need your action</p></div><span className="td-alert-mark">!</span></div>
            <button className="td-attention-row" onClick={() => goTo('sales')}><span className="td-attention-icon td-orange">💰</span><span><b>Outstanding Invoices</b><small>Payments still due</small></span><strong>{sales.filter(x => Number(x.due || 0) > 0).length}</strong><i>›</i></button>
            <button className="td-attention-row" onClick={goToPendingDeliveries}><span className="td-attention-icon td-blue">🚚</span><span><b>Pending Deliveries</b><small>Orders to be delivered</small></span><strong>{deliveries.filter(x => !/^(completed|delivered|cancelled)$/i.test(String(x.status || '').trim())).length}</strong><i>›</i></button>
            <button className="td-attention-row" onClick={goToLowStock}><span className="td-attention-icon td-pink">⚠️</span><span><b>Low Stock Products</b><small>Check inventory levels</small></span><strong>{lowStock.length}</strong><i>›</i></button>
          </article>
        </section>

        <section className="td-bottom">
          <article className="td-panel td-sales-panel">
            <div className="td-panel-heading"><div><h2>◴ &nbsp;Sales Overview</h2><p>Track sales performance over time</p></div></div>
            <div className="td-chart-tabs">
              <button className={chartRange === 'today' ? 'active' : ''} onClick={() => {
                const d = new Date();
                const f = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
                setChartRange('today'); setShowChartCustom(false); setChartFrom(f(d)); setChartTo(f(d));
              }}>Today</button>
              <button className={chartRange === 'week' ? 'active' : ''} onClick={() => {
                const d = new Date();
                const monday = new Date(d);
                monday.setDate(d.getDate() - ((d.getDay()+6)%7));
                const f = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
                setChartRange('week'); setShowChartCustom(false); setChartFrom(f(monday)); setChartTo(f(d));
              }}>This Week</button>
              <button className={chartRange === 'month' ? 'active' : ''} onClick={() => {
                const d = new Date();
                const f = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
                setChartRange('month'); setShowChartCustom(false);
                setChartFrom(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`);
                setChartTo(f(d));
              }}>This Month</button>
              <button className={chartRange === 'year' ? 'active' : ''} onClick={() => {
                const d = new Date();
                const f = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
                setChartRange('year'); setShowChartCustom(false);
                setChartFrom(`${d.getFullYear()}-01-01`); setChartTo(f(d));
              }}>This Year</button>
              <button className={chartRange === 'custom' ? 'active' : ''} onClick={() => {
                setChartFrom('');
                setChartTo('');
                setChartRange('custom');
                setShowChartCustom(true);
              }}>Custom ▦</button>
            </div>
            {showChartCustom && <div className="td-chart-custom">
              <label>From <input type="date" value={chartFrom} onChange={e => setChartFrom(e.target.value)} /></label>
              <label>To <input type="date" value={chartTo} onChange={e => setChartTo(e.target.value)} /></label>
              <button onClick={() => {
                if (!chartFrom || !chartTo || chartFrom > chartTo) {
                  window.alert('Please select a valid date range.');
                  return;
                }
                setChartRange('custom');
              }}>Apply</button>
            </div>}
            <div className="td-sales-summary"><div><small>Sales Revenue</small><strong>{money(chartRevenue)}</strong><em>↗ &nbsp;Sales recorded</em></div><div><small>Payments Received</small><strong>{money(chartPaymentsReceived)}</strong><em>✓ &nbsp;Payments received</em></div></div>
            <div className="td-chart td-chart-premium">
              {sales.length ? (() => {
                const items = [...sales]
                  .filter(x => {
                    if (!Number.isFinite(Number(x.total))) return false;
                    const raw = x.created_at || x.sale_date || x.invoice_date || x.date || x.createdAt || x.invoiceDate;
                    if (!raw) return false;
                    const d = new Date(raw);
                    if (Number.isNaN(d.getTime())) return false;
                    const day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    return (!chartFrom || day >= chartFrom) && (!chartTo || day <= chartTo);
                  })
                  .sort((a, b) => new Date(a.created_at || a.sale_date || a.invoice_date || a.date || 0) - new Date(b.created_at || b.sale_date || b.invoice_date || b.date || 0))
                  .slice(-12);
                const values = items.map(x => Math.max(0, Number(x.total || 0)));
                const maxValue = values.length ? Math.max(...values) : 0;
                const step = maxValue / 4;
                const coords = values.map((value, i) => ({
                  x: values.length < 2 ? 310 : 48 + i * 532 / (values.length - 1),
                  y: maxValue > 0 ? 166 - (value / maxValue) * 126 : 166,
                  value,
                  label: items[i].created_at
                    ? new Date(items[i].created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : `Sale ${i + 1}`,
                  invoice: items[i].invoice_number || `Sale ${i + 1}`,
                }));
                const line = coords.length
                  ? coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
                  : 'M 48 166 L 580 166';
                const area = coords.length
                  ? `${line} L ${coords[coords.length - 1].x} 166 L ${coords[0].x} 166 Z`
                  : '';
                const shortLabel = label => label.length > 11 ? label.slice(0, 9) + '…' : label;
                return (
                  <svg viewBox="0 0 620 225" preserveAspectRatio="none" role="img" aria-label="Sales revenue trend">
                    <defs>
                      <linearGradient id="tdRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#12b8a6" stopOpacity=".23" />
                        <stop offset="100%" stopColor="#12b8a6" stopOpacity=".015" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3, 4].map(i => {
                      const y = 166 - i * 31.5;
                      return <g key={i}>
                        <line x1="45" y1={y} x2="608" y2={y} stroke="#e5ebf3" strokeDasharray="3 5" />
                        <text x="38" y={y + 4} textAnchor="end" fontSize="10" fill="#7b8798">
                          {money(step * i)}
                        </text>
                      </g>;
                    })}
                    <path d={area} fill="url(#tdRevenueFill)" />
                    <path d={line} fill="none" stroke="#0eaa9b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {coords.map((point, i) => (
                      <g key={`sales-point-${i}`} className="td-chart-point">
                        <title>{`${point.label === point.invoice ? point.invoice : `${point.label} · ${point.invoice}`} · ${money(point.value)}`}</title>
                        <circle cx={point.x} cy={point.y} r="12" fill="transparent" />
                        <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#0eaa9b" strokeWidth="2.5" className="td-chart-dot" />
                        <text x={point.x} y="190" textAnchor="middle" fontSize="10" fill="#718096">
                          {shortLabel(point.label)}
                        </text>
                      </g>
                    ))}
                  </svg>
                );
              })() : <div className="td-empty-chart">Sales activity will appear here when records are available.</div>}
            </div>
            
          </article>

          <article className="td-panel">
            <div className="td-panel-heading"><div><h2>Recent Activity</h2><p>Your latest sales transactions</p></div><button className="td-view-all" onClick={() => goTo('sales')}>View All →</button></div>
            <div className="td-activity-list">
              {sales.slice(0, 7).map((sale, i) => <div className="td-activity" key={sale.id || i}>
                <span className={`td-activity-icon ${Number(sale.due || 0) > 0 ? 'td-orange' : 'td-green'}`}>{Number(sale.due || 0) > 0 ? '₹' : '✓'}</span>
                <span className="td-activity-copy">
                  <b
                    className="td-activity-customer-link"
                    role="button"
                    tabIndex={0}
                    title="Open billing"
                    onClick={() => {
                      if (sale.id) openInvoice(sale);
                      else setPageError('This sale has no invoice ID.');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (sale.id) openInvoice(sale);
                        else setPageError('This sale has no invoice ID.');
                      }
                    }}
                  >{sale.customer_name || sale.customerName || sale.name || sale.customer?.name || 'Walk-in customer'}</b>
                  <small>Invoice: {sale.invoice_number || sale.invoiceNumber || sale.invoice_no || sale.invoiceNo || sale.bill_number || sale.billNumber || 'Invoice number unavailable'} · {dateLabel(sale.created_at || sale.createdAt || sale.sale_date || sale.invoice_date || sale.date)}</small>
                </span>
                <strong>{money(sale.total)}</strong>
              </div>)}
              {!sales.length && <div className="td-empty-chart">No recent sales to display yet.</div>}
            </div>
            
          </article>
        </section>
      </div>
    </>;
  }

  async function updateDeliveryStatus(delivery, nextStatus) {
    if (!delivery?.id || updatingDeliveryId !== null) return;

    setUpdatingDeliveryId(delivery.id);
    setNotice('');
    setPageError('');
    try {
      const data = await request(
        `/deliveries/${encodeURIComponent(delivery.id)}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus })
        }
      );

      const updated = data.delivery;
      if (updated) {
        setDeliveries(current =>
          current.map(item => String(item.id) === String(updated.id) ? updated : item)
        );
      } else {
        const refreshed = await request('/deliveries');
        setDeliveries(listFrom(refreshed, 'deliveries'));
      }

      setNotice(data.message || `Delivery status updated to ${nextStatus}`);
    } catch (error) {
      setPageError(error.message || 'Unable to update delivery status');
    } finally {
      setUpdatingDeliveryId(null);
    }
  }



  async function openDeliveryAssignment(delivery) {
    const status = String(delivery.status || 'Pending').trim().toLowerCase();

    setSelectedDelivery(delivery);
    setDeliveryAssignmentForm({
      driverName: delivery.assigned_driver_name || delivery.delivery_person || '',
      driverPhone: delivery.assigned_driver_phone || delivery.driver_phone || '',
      vehicleNumber: ''
    });
    goTo('delivery-assignment');

    if (status !== 'pending') return;

    try {
      const data = await request('/drivers');
      setDrivers(listFrom(data, 'drivers'));
    } catch (error) {
      setPageError(error.message || 'Unable to load registered drivers.');
    }
  }

  async function saveDeliveryAssignment(event) {
    event.preventDefault();
    if (!selectedDelivery?.id || savingDeliveryAssignment) return;

    const driverName = deliveryAssignmentForm.driverName.trim();
    const driverPhone = deliveryAssignmentForm.driverPhone.trim();
    const vehicleNumber = deliveryAssignmentForm.vehicleNumber.trim().toUpperCase();

    if (!driverName || !/^[0-9+() -]{7,20}$/.test(driverPhone) || !vehicleNumber) {
      setPageError('Enter a valid driver name, phone number and vehicle number.');
      return;
    }

    setSavingDeliveryAssignment(true);
    setPageError('');
    setNotice('');

    try {
      const data = await request(
        `/deliveries/${encodeURIComponent(selectedDelivery.id)}/assign`,
        {
          method: 'PATCH',
          body: JSON.stringify({ driverName, driverPhone, vehicleNumber })
        }
      );

      const refreshed = await request('/deliveries');
      setDeliveries(listFrom(refreshed, 'deliveries'));
      setSelectedDelivery(null);
      goTo('deliveries');
      setNotice(data.message || 'Driver and vehicle assigned successfully.');
    } catch (error) {
      setPageError(error.message || 'Unable to assign driver and vehicle.');
    } finally {
      setSavingDeliveryAssignment(false);
    }
  }

  function renderDeliveryAssignment() {
    if (!selectedDelivery) {
      return <div className="panel"><p>Select a Pending delivery from the Deliveries list.</p>
        <button type="button" className="secondary-button" onClick={() => goTo('deliveries')}>Back to Deliveries</button>
      </div>;
    }

    const fieldStyle = {
      width: '100%',
      minHeight: '44px',
      padding: '10px 12px',
      border: '1px solid var(--border, #dedede)',
      borderRadius: '9px',
      font: 'inherit',
      background: 'var(--surface, #fff)',
      color: 'inherit',
      boxSizing: 'border-box'
    };
    const labelStyle = {
      display: 'block',
      marginBottom: '7px',
      fontWeight: 600,
      fontSize: '13px'
    };

    const deliveryStatus = String(selectedDelivery.status || 'Pending').trim().toLowerCase();

    if (deliveryStatus === 'assigned') {
      return <div className="delivery-assignment-page">
        <div className="panel" style={{ maxWidth: '760px' }}>
          <div style={{ marginBottom: '22px' }}>
            <span className="modal-kicker">DELIVERY MANAGEMENT</span>
            <h2 style={{ margin: '8px 0' }}>View Assignment</h2>
            <p style={{ margin: 0, color: 'var(--muted, #777)' }}>
              Invoice: <strong>{selectedDelivery.invoice_number || '—'}</strong>
              {' · '}
              Customer: <strong>{selectedDelivery.customer_name || '—'}</strong>
            </p>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <strong>Delivery Status</strong>
              <p><span className="status warning">Assigned</span></p>
            </div>
            <div>
              <strong>Assigned Driver</strong>
              <p>{selectedDelivery.assigned_driver_name || selectedDelivery.delivery_person || '—'}</p>
            </div>
            <div>
              <strong>Driver Phone</strong>
              <p>{selectedDelivery.assigned_driver_phone || selectedDelivery.driver_phone || '—'}</p>
            </div>
            <div>
              <strong>Vehicle Number</strong>
              <p>{selectedDelivery.assigned_vehicle_number || selectedDelivery.vehicle_number || '—'}</p>
            </div>
            {selectedDelivery.assigned_vehicle_type && (
              <div>
                <strong>Vehicle Type</strong>
                <p>{selectedDelivery.assigned_vehicle_type}</p>
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="secondary-button" onClick={() => goTo('deliveries')}>
              Back to Deliveries
            </button>
          </div>
        </div>
      </div>;
    }

    return <div className="delivery-assignment-page">
      <div className="panel" style={{ maxWidth: '760px' }}>
        <div style={{ marginBottom: '22px' }}>
          <span className="modal-kicker">DELIVERY MANAGEMENT</span>
          <h2 style={{ margin: '8px 0' }}>Assign Driver &amp; Vehicle</h2>
          <p style={{ margin: 0, color: 'var(--muted, #777)' }}>
            Invoice: <strong>{selectedDelivery.invoice_number || '—'}</strong>
            {' · '}
            Customer: <strong>{selectedDelivery.customer_name || '—'}</strong>
          </p>
        </div>

        <form onSubmit={saveDeliveryAssignment}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
            <label style={{ gridColumn: '1 / -1' }}>
              <span style={labelStyle}>Select Registered Driver</span>
              <select
                required
                style={fieldStyle}
                value={deliveryAssignmentForm.driverPhone}
                onChange={e => {
                  const selected = drivers.find(driver => String(driver.phone) === String(e.target.value));
                  setDeliveryAssignmentForm(current => ({
                    ...current,
                    driverName: selected?.name || '',
                    driverPhone: selected?.phone || ''
                  }));
                }}
              >
                <option value="">Select an available driver</option>
                {drivers
                  .filter(driver => {
                    const active = String(driver.status || 'active').trim().toLowerCase() === 'active';
                    const assigned = driver.is_assigned === true ||
                      driver.is_assigned === 1 ||
                      ['true', '1', 'yes'].includes(String(driver.is_assigned ?? '').trim().toLowerCase());
                    return active && !assigned;
                  })
                  .map(driver => (
                    <option key={driver.id} value={driver.phone}>
                      {driver.name} — {driver.phone}
                    </option>
                  ))}
              </select>
              {!drivers.some(driver => {
                const active = String(driver.status || 'active').trim().toLowerCase() === 'active';
                const assigned = driver.is_assigned === true ||
                  driver.is_assigned === 1 ||
                  ['true', '1', 'yes'].includes(String(driver.is_assigned ?? '').trim().toLowerCase());
                return active && !assigned;
              }) && (
                <small style={{ display: 'block', marginTop: '7px', color: 'var(--muted, #777)' }}>
                  No available active drivers. Register or activate a driver in the Drivers page.
                </small>
              )}
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              <span style={labelStyle}>Vehicle Number</span>
              <input
                type="text"
                required
                maxLength={30}
                placeholder="e.g. AP 39 AB 1234"
                style={fieldStyle}
                value={deliveryAssignmentForm.vehicleNumber}
                onChange={e => setDeliveryAssignmentForm(current => ({ ...current, vehicleNumber: e.target.value.toUpperCase() }))}
              />
            </label>
          </div>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="secondary-button" disabled={savingDeliveryAssignment} onClick={() => goTo('deliveries')}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={savingDeliveryAssignment}>
              {savingDeliveryAssignment ? 'Saving…' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>;
  }

  function salesTable(headers, rows, emptyText = 'No invoices found.') {
    const filters = [
      ['invoice', 'Search invoice...'],
      ['customer', 'Search customer...'],
      ['total', 'Search total...'],
      ['paid', 'Search paid...'],
      ['due', 'Search due...'],
      ['date', 'Search date...']
    ];

    return <div className="table-wrap">
      <table className="products-filter-table">
        <thead>
          <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
          <tr className="column-filter-row">
            {filters.map(([key, placeholder]) => (
              <th key={key}>
                <input type="search"
                  aria-label={placeholder}
                  placeholder={placeholder}
                  value={salesColumnFilters[key]}
                  onChange={e => setSalesColumnFilters(prev => ({
                    ...prev,
                    [key]: e.target.value
                  }))}
                />
              </th>
            ))}
            {headers.length > filters.length && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows : (
            <tr><td colSpan={headers.length} className="empty-cell">{emptyText}</td></tr>
          )}
        </tbody>
      </table>
    </div>;
  }

  function deliveriesTable(headers, rows, emptyText = 'No invoices found.') {
    const filters = [
      ['delivery', 'Search delivery...'],
      ['customer', 'Search customer...'],
      ['driver', 'Search driver...'],
      ['driverPhone', 'Search phone...'],
      ['vehicle', 'Search vehicle...'],
      ['status', 'Search status...'],
      ['date', 'Search date...'],
      [null, '']
    ];

    return <div className="table-wrap">
      <table className="products-filter-table">
        <thead>
          <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
          <tr className="column-filter-row">
            {filters.map(([key, placeholder], index) => (
              <th key={key || `actions-${index}`}>
                {key ? (
                  <input type="search"
                    aria-label={placeholder}
                    placeholder={placeholder}
                    value={deliveryColumnFilters[key]}
                    onChange={e => setDeliveryColumnFilters(prev => ({
                      ...prev,
                      [key]: e.target.value
                    }))}
                  />
                ) : <span className="filter-not-available">—</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows : (
            <tr><td colSpan={headers.length} className="empty-cell">{emptyText}</td></tr>
          )}
        </tbody>
      </table>
    </div>;
  }

  function paymentsTable(headers, rows, emptyText = 'No invoices found.') {
    const filters = [
      ['type', 'Search type...'],
      ['name', 'Search name...'],
      ['method', 'Search method...'],
      ['amount', 'Search amount...'],
      ['date', 'Search date...']
    ];

    return <div className="table-wrap">
      <table className="products-filter-table">
        <thead>
          <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
          <tr className="column-filter-row">
            {filters.map(([key, placeholder]) => (
              <th key={key}>
                {key === 'type' ? (
                  <select
                    aria-label="Filter payment type"
                    value={paymentColumnFilters.type}
                    onChange={e => setPaymentColumnFilters(prev => ({
                      ...prev,
                      type: e.target.value
                    }))}
                  >
                    <option value="">All</option>
                    <option value="Customer">Customer</option>
                    <option value="Supplier">Supplier</option>
                  </select>
                ) : (
                  <input
                    type="search"
                    aria-label={placeholder}
                    placeholder={placeholder}
                    value={paymentColumnFilters[key]}
                    onChange={e => setPaymentColumnFilters(prev => ({
                      ...prev,
                      [key]: e.target.value
                    }))}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows : (
            <tr><td colSpan={headers.length} className="empty-cell">{emptyText}</td></tr>
          )}
        </tbody>
      </table>
    </div>;
  }


  async function openInvoice(item) {
    setInvoiceLoading(true);
    setPageError('');
    try {
      const result = await request(`/sales/${encodeURIComponent(item.id)}`);
      if (!result.sale) throw new Error('Invoice details were not returned by the server.');
      setInvoicePreview(result.sale);
    } catch (error) {
      setPageError(error.message || 'Unable to load invoice details.');
    } finally {
      setInvoiceLoading(false);
    }
  }

  function invoiceShareMessage(invoice) {
    const lines = [
      `Invoice: ${invoice.invoiceNumber || invoice.invoice_number || '—'}`,
      `Business: ${settings?.business_name || business?.business_name || business?.name || 'TileBiz'}`,
      `Customer: ${invoice.customerName || invoice.customer_name || '—'}`,
      `Total: ${money(invoice.total)}`,
      `Paid: ${money(invoice.paid)}`,
      `Due: ${money(invoice.due)}`,
      'Thank you for your business.'
    ];
    return lines.join('\n');
  }

  function invoiceWhatsApp(invoice) {
    const rawPhone = String(invoice.customerPhone || invoice.customer_phone || '').replace(/\D/g, '');
    if (!rawPhone) {
      setPageError('This invoice has no customer mobile number.');
      return;
    }
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(invoiceShareMessage(invoice))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function invoiceEmail(invoice) {
    const customerId = invoice.customerId || invoice.customer_id ||
      invoice.customer?.id || invoice.customer?.customer_id;

    const customerPhone = String(
      invoice.customerPhone || invoice.customer_phone || invoice.customer?.mobile || ''
    ).replace(/\D/g, '');

    const customer = customers.find(c =>
      (customerId && String(c.id) === String(customerId)) ||
      (customerPhone && String(c.mobile || '').replace(/\D/g, '') === customerPhone)
    );

    const email = String(
      invoice.customerEmail ||
      invoice.customer_email ||
      invoice.customer?.email ||
      invoice.email ||
      customer?.email ||
      ''
    ).trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPageError('No valid email address is available for this customer. Please update the customer email and try again.');
      return;
    }

    setPageError('');
    const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || '';
    const subject = `Invoice ${invoiceNumber}`;
    const body = invoiceShareMessage(invoice);
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  }

  function renderGenericList(title, subtitle, items, kind) {
    const fields = {
      sales: [['🧾 Invoice', 'invoiceNumber'], ['👤 Customer', 'customerName'], ['💰 Total', 'total'], ['✅ Paid', 'paid'], ['⏳ Due', 'due'], ['📅 Date', 'date'], ['Actions', '__invoice_actions']],
      purchases: [['Supplier Name', 'supplier_name'], ['No. of Products', '__product_count'], ['Purchase Total', 'total'], ['Amount Paid', 'paid'], ['Outstanding Due', 'due'], ['Payment Mode', 'payment_method'], ['Date', 'created_at'], ['Actions', '__purchase_actions']],
      suppliers: [['Supplier', 'name'], ['Mobile', 'mobile'], ['Email', 'email'], ['Status', 'status']],
      deliveries: [['🧾 Invoice', 'invoice_number'], ['Customer', 'customer_name'], ['Driver Name', 'assigned_driver_name'], ['Driver Phone Number', 'assigned_driver_phone'], ['Vehicle Number', 'assigned_vehicle_number'], ['Status', 'status'], ['Date', 'created_at'], ['⚙️ Actions', '__actions']],
      payments: [['Payment Type', '__payment_type'], ['Name', '__payment_name'], ['Method', 'payment_method'], ['Amount', 'amount'], ['Date', '__payment_date']]
    }[kind] || [];
    const filteredItems = items.filter(item => {
          const matchesTopSearch = JSON.stringify(item).toLowerCase().includes(search.trim().toLowerCase());
          const matches = (value, filter) =>
            String(value ?? '').toLowerCase().includes(filter.trim().toLowerCase());

          if (kind === 'sales') {
            const total = Number(item.total) || 0;
            const paid = Number(item.paid) || 0;
            const due = item.due ?? Math.max(0, total - paid);
            const dateValue = item.date ?? item.created_at;
            const dateText = dateValue ? String(dateLabel(dateValue)) : '';

            return matches(item.invoiceNumber ?? item.invoice_number, salesColumnFilters.invoice)
              && matches(item.customerName ?? item.customer_name, salesColumnFilters.customer)
              && matches(item.total, salesColumnFilters.total)
              && matches(item.paid, salesColumnFilters.paid)
              && matches(due, salesColumnFilters.due)
              && matches(dateText, salesColumnFilters.date)
              && matchesTopSearch;
          }

          if (kind === 'deliveries') {
            const dateText = item.created_at ? String(dateLabel(item.created_at)) : '';
            const isPending = !/^(completed|delivered|cancelled)$/i.test(
              String(item.status || '').trim()
            );

            return (!pendingDeliveriesOnly || isPending)
              && matches(item.invoice_number || item.delivery_number, deliveryColumnFilters.delivery)
              && matches(item.customer_name, deliveryColumnFilters.customer)
              && matches(item.assigned_driver_name || item.delivery_person || item.driver_name, deliveryColumnFilters.driver)
              && matches(item.assigned_driver_phone || item.driver_phone || item.driverPhone, deliveryColumnFilters.driverPhone)
              && matches(item.assigned_vehicle_number || item.vehicle_number || item.registration_number, deliveryColumnFilters.vehicle)
              && matches(item.status || 'Pending', deliveryColumnFilters.status)
              && matches(dateText, deliveryColumnFilters.date)
              && matchesTopSearch;
          }

          if (kind === 'payments') {
            const rawType = String(item.type || '').toLowerCase();
            const paymentType = ['customer', 'receive'].includes(rawType)
              ? 'Customer'
              : ['supplier', 'pay'].includes(rawType) ? 'Supplier' : '';
            const paymentName = item.party_name || '';
            const dateValue = item.payment_date || item.created_at;
            const dateText = dateValue ? String(dateLabel(dateValue)) : '';

            return matches(paymentType, paymentColumnFilters.type)
              && matches(paymentName, paymentColumnFilters.name)
              && matches(item.payment_method, paymentColumnFilters.method)
              && matches(item.amount, paymentColumnFilters.amount)
              && matches(dateText, paymentColumnFilters.date)
              && matchesTopSearch;
          }

          if (kind !== 'purchases') return matchesTopSearch;

          const total = Number(item.total) || 0;
          const paid = Number(item.paid) || 0;
          const due = Math.max(0, total - paid);
          const supplier = String(item.supplier_name || '').toLowerCase();
          const totalText = String(item.total ?? '');
          const paidText = String(item.paid ?? 0);
          const dueText = String(due);
          const methodText = String(item.payment_method || item.paymentMethod || '').toLowerCase();
          const dateText = item.created_at ? String(dateLabel(item.created_at)).toLowerCase() : '';
          const productRows = item.items || item.purchase_items || item.purchaseItems || item.products;
          const productCount = Array.isArray(productRows)
            ? productRows.reduce((sum, row) => sum + (Number(row.quantity) > 0 ? Number(row.quantity) : 1), 0)
            : (item.product_count ?? item.productCount ?? item.items_count ?? item.itemsCount ?? '');
          return matches(supplier, purchaseColumnFilters.supplier)
            && matches(productCount, purchaseColumnFilters.productCount)
            && matches(totalText, purchaseColumnFilters.total)
            && matches(paidText, purchaseColumnFilters.paid || '')
            && matches(dueText, purchaseColumnFilters.due || '')
            && matches(methodText, purchaseColumnFilters.method || '')
            && matches(dateText, purchaseColumnFilters.date)
            && matchesTopSearch;
        });
    const listPage = getListPagination(kind, filteredItems.length);
    const visibleItems = filteredItems.slice(
      listPage.start,
      listPage.start + listPage.visible
    );

    const paymentFeatures = kind === 'payments' ? (() => {
      const getDate = payment => {
        const raw = payment.payment_date || payment.created_at;
        if (!raw) return null;
        const text = String(raw);
        const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const d = match
          ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
          : new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
      };

      const dayKey = d => [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
      ].join('-');

      const recent = [...items].sort((a, b) =>
        (getDate(b)?.getTime() || 0) - (getDate(a)?.getTime() || 0)
      ).slice(0, 10);

      const selectedCustomer = customers.find(c =>
        String(c.id) === String(selectedPaymentCustomer)
      );

      const customerInvoices = selectedCustomer ? sales.filter(s => {
        const id = s.customerId || s.customer_id ||
          s.customer?.id || s.customer?.customer_id;
        const name = s.customerName || s.customer_name || s.customer?.name || '';
        return (id && String(id) === String(selectedCustomer.id)) ||
          (!id && String(name).trim().toLowerCase() ===
            String(selectedCustomer.name || '').trim().toLowerCase());
      }) : [];

      const customerHistory = selectedCustomer ? items.filter(payment => {
        const type = String(payment.type || '').toLowerCase();
        if (!['customer', 'receive'].includes(type)) return false;
        const sameId = payment.party_id &&
          String(payment.party_id) === String(selectedCustomer.id);
        const sameName = String(payment.party_name || '').trim().toLowerCase() ===
          String(selectedCustomer.name || '').trim().toLowerCase();
        return sameId || sameName;
      }).sort((a, b) =>
        (getDate(b)?.getTime() || 0) - (getDate(a)?.getTime() || 0)
      ) : [];

      const billed = customerInvoices.reduce((sum, invoice) =>
        sum + (Number(invoice.total) || 0), 0);
      const invoicePaid = customerInvoices.reduce((sum, invoice) =>
        sum + (Number(invoice.paid) || 0), 0);
      const outstanding = customerInvoices.reduce((sum, invoice) => {
        const total = Number(invoice.total) || 0;
        const paid = Number(invoice.paid) || 0;
        return sum + Math.max(0, Number(invoice.due ?? (total - paid)) || 0);
      }, 0);

      const selectedSupplier = suppliers.find(s =>
        String(s.id) === String(selectedPaymentSupplier)
      );

      const supplierPurchases = selectedSupplier ? purchases.filter(p => {
        const id = p.supplier_id ?? p.supplierId;
        const name = p.supplier_name || p.supplierName || '';
        return (id && String(id) === String(selectedSupplier.id)) ||
          (!id && String(name).trim().toLowerCase() ===
            String(selectedSupplier.name || selectedSupplier.company || '').trim().toLowerCase());
      }) : [];

      const supplierHistory = selectedSupplier ? items.filter(payment => {
        const type = String(payment.type || '').toLowerCase();
        if (!['supplier', 'pay'].includes(type)) return false;
        const sameId = payment.party_id &&
          String(payment.party_id) === String(selectedSupplier.id);
        const supplierName = selectedSupplier.name || selectedSupplier.company || '';
        const sameName = String(payment.party_name || '').trim().toLowerCase() ===
          String(supplierName).trim().toLowerCase();
        return sameId || sameName;
      }).sort((a, b) =>
        (getDate(b)?.getTime() || 0) - (getDate(a)?.getTime() || 0)
      ) : [];

      const supplierPurchaseTotal = supplierPurchases.reduce((sum, p) =>
        sum + (Number(p.total) || 0), 0);
      const supplierPurchasePaid = supplierPurchases.reduce((sum, p) =>
        sum + (Number(p.paid) || 0), 0);
      const supplierPaymentTotal = supplierHistory.reduce((sum, p) =>
        sum + (Number(p.amount) || 0), 0);
      const supplierTotalPaid = supplierPurchasePaid + supplierPaymentTotal;
      const supplierOutstanding = Math.max(0,
        supplierPurchaseTotal - supplierTotalPaid
      );

      const year = paymentCalendarMonth.getFullYear();
      const month = paymentCalendarMonth.getMonth();

      const monthPayments = items.filter(payment => {
        const d = getDate(payment);
        return d && d.getFullYear() === year && d.getMonth() === month;
      });

      const customerPaidThisMonth = monthPayments
        .filter(payment => ['customer', 'receive'].includes(
          String(payment.type || '').toLowerCase()
        ))
        .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

      const supplierPaidThisMonth = monthPayments
        .filter(payment => ['supplier', 'pay'].includes(
          String(payment.type || '').toLowerCase()
        ))
        .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const calendarCells = Array.from(
        { length: firstDay + daysInMonth },
        (_, index) => {
          if (index < firstDay) return null;
          const day = index - firstDay + 1;
          const key = dayKey(new Date(year, month, day));
          const dayPayments = items.filter(payment => {
            const d = getDate(payment);
            return d && dayKey(d) === key;
          });
          return {
            day,
            count: dayPayments.length,
            amount: dayPayments.reduce((sum, payment) =>
              sum + (Number(payment.amount) || 0), 0)
          };
        }
      );

      return {
        recent, selectedCustomer, customerHistory,
        billed, invoicePaid, outstanding,
        selectedSupplier, supplierHistory,
        supplierPurchaseTotal, supplierTotalPaid, supplierOutstanding,
        customerPaidThisMonth, supplierPaidThisMonth,
        calendarCells,
        monthLabel: paymentCalendarMonth.toLocaleDateString('en-IN', {
          month: 'long', year: 'numeric'
        })
      };
    })() : null;




    return <><div className="section-toolbar"><div className={kind === 'sales' ? 'billing-heading' : undefined}><h2>{title}</h2><p>{subtitle}</p></div><div className="dashboard-page-actions">{kind === 'purchases' && <button className="primary-button" onClick={() => { openCreate('purchase'); setModal(null); goTo('record-purchase'); }}><Plus size={17} /> Record New Purchase</button>}{kind === 'payments' && <button className="primary-button" onClick={() => goTo('record-payment')}><Plus size={17} /> Record Payment</button>}</div></div>
    {kind === 'payments' && paymentFeatures && <div style={{display:'grid',gap:18,marginBottom:20}}>

      <section className="panel payment-profile-panel" style={{padding:18}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div>
            <h3 className="payment-section-title" style={{margin:'0 0 5px'}}>Customer Payment Profile</h3>
            <p style={{margin:0,color:'var(--muted,#777)'}}>Select a customer to view invoices, payments and balance</p>
          </div>
          <select className="payment-customer-select" aria-label="Select customer payment profile"
            value={selectedPaymentCustomer}
            onChange={e=>setSelectedPaymentCustomer(e.target.value)}
            style={{minWidth:210,maxWidth:'100%',padding:10}}>
            <option value="">Select customer</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {paymentFeatures.selectedCustomer && <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginTop:16}}>
            <div className="payment-summary-card" style={{padding:13,background:'var(--surface-secondary,#f7f7f7)',borderRadius:9}}>
              <small>Total billed</small><strong style={{display:'block',fontSize:19}}>{money(paymentFeatures.billed)}</strong>
            </div>
            <div className="payment-summary-card" style={{padding:13,background:'var(--surface-secondary,#f7f7f7)',borderRadius:9}}>
              <small>Invoice paid</small><strong style={{display:'block',fontSize:19}}>{money(paymentFeatures.invoicePaid)}</strong>
            </div>
            <div className="payment-summary-card" style={{padding:13,background:'var(--surface-secondary,#f7f7f7)',borderRadius:9}}>
              <small>Remaining balance</small><strong style={{display:'block',fontSize:19}}>{money(paymentFeatures.outstanding)}</strong>
            </div>
          </div>
          <h4 style={{margin:'18px 0 8px'}}>Payment History</h4>
          {paymentFeatures.customerHistory.length ? <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
            <tbody>{paymentFeatures.customerHistory.map((payment,index)=><tr key={payment.id||index}>
              <td>{dateLabel(payment.payment_date||payment.created_at)}</td>
              <td>{payment.payment_method||'—'}</td>
              <td>{money(payment.amount)}</td>
            </tr>)}</tbody>
          </table></div> : <p>No customer payment records found.</p>}
          <small style={{display:'block',marginTop:8,color:'var(--muted,#777)'}}>Invoice totals are calculated from recorded sales. Payment history is shown separately to avoid double counting.</small>
        </>}
      </section>

      <section className="panel payment-profile-panel supplier-payment-profile-panel" style={{padding:18}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div>
            <h3 className="payment-section-title" style={{margin:'0 0 5px'}}>Supplier Payment Profile</h3>
            <p style={{margin:0,color:'var(--muted,#777)'}}>View purchases, payments and payable balance</p>
          </div>
          <select className="payment-customer-select" aria-label="Select supplier payment profile"
            value={selectedPaymentSupplier}
            onChange={e=>setSelectedPaymentSupplier(e.target.value)}
            style={{minWidth:210,maxWidth:'100%',padding:10}}>
            <option value="">Select supplier</option>
            {suppliers.map(s=><option key={s.id} value={s.id}>{s.name || s.company || 'Supplier'}</option>)}
          </select>
        </div>
        {paymentFeatures.selectedSupplier && <>
          <div className="supplier-payment-metrics" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginTop:16}}>
            <div className="payment-metric payment-metric-billed">
              <small>Total purchases</small>
              <strong>{money(paymentFeatures.supplierPurchaseTotal)}</strong>
            </div>
            <div className="payment-metric payment-metric-paid">
              <small>Total paid</small>
              <strong>{money(paymentFeatures.supplierTotalPaid)}</strong>
            </div>
            <div className="payment-metric payment-metric-due">
              <small>Remaining payable</small>
              <strong>{money(paymentFeatures.supplierOutstanding)}</strong>
            </div>
          </div>
          <h4 className="payment-history-title" style={{margin:'18px 0 8px'}}>Supplier Payment History</h4>
          {paymentFeatures.supplierHistory.length ? <div className="table-wrap payment-history-table">
            <table>
              <thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
              <tbody>{paymentFeatures.supplierHistory.map((payment,index)=><tr key={payment.id||index}>
                <td>{dateLabel(payment.payment_date||payment.created_at)}</td>
                <td>{payment.payment_method||'—'}</td>
                <td>{money(payment.amount)}</td>
              </tr>)}</tbody>
            </table>
          </div> : <p>No supplier payment records found.</p>}
          <small style={{display:'block',marginTop:8,color:'var(--muted,#777)'}}>
            Purchase paid amounts and supplier payment records are included in the paid total.
          </small>
        </>}
      </section>

      <section className="panel payment-calendar-panel" style={{padding:18}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div>
            <h3 className="payment-section-title" style={{margin:'0 0 5px'}}>Payment Calendar</h3>
            <p style={{margin:0,color:'var(--muted,#777)'}}>Daily payment count and total amount</p>
          </div>
          <div className="payment-calendar-nav" style={{display:'flex',alignItems:'center',gap:10}}>
            <button type="button" onClick={()=>setPaymentCalendarMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}>‹</button>
            <strong>{paymentFeatures.monthLabel}</strong>
            <button type="button" onClick={()=>setPaymentCalendarMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}>›</button>
          </div>
        </div>
        <div className="payment-calendar-grid" style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:5,marginTop:15}}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><strong className="payment-calendar-weekday" key={day} style={{textAlign:'center',fontSize:12,padding:5}}>{day}</strong>)}
          {paymentFeatures.calendarCells.map((cell,index)=>cell ? <div className={`payment-calendar-day ${cell.count ? 'has-payments' : ''}`} key={cell.day} style={{minHeight:76,padding:6,border:'1px solid var(--border,#e5e5e5)',borderRadius:7,background:cell.count?'var(--surface-secondary,#f7f7f7)':'transparent',overflow:'hidden'}}>
            <strong>{cell.day}</strong>
            {cell.count>0 && <>
              <small style={{display:'block',marginTop:5}}>{cell.count} payment{cell.count===1?'':'s'}</small>
              <strong style={{display:'block',fontSize:12,marginTop:3,overflowWrap:'anywhere'}}>{money(cell.amount)}</strong>
            </>}
          </div> : <div className="payment-calendar-blank" key={'blank-'+index} />)}
        </div>

        <div className="payment-monthly-totals" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginTop:16}}>
          <div className="payment-summary-card" style={{padding:15,borderRadius:10,background:'var(--surface-secondary,#f7f7f7)',border:'1px solid var(--border,#e5e5e5)'}}>
            <small style={{display:'block',marginBottom:7}}>Customer Paid</small>
            <strong style={{fontSize:21}}>{money(paymentFeatures.customerPaidThisMonth)}</strong>
          </div>
          <div className="payment-summary-card" style={{padding:15,borderRadius:10,background:'var(--surface-secondary,#f7f7f7)',border:'1px solid var(--border,#e5e5e5)'}}>
            <small style={{display:'block',marginBottom:7}}>Supplier Paid</small>
            <strong style={{fontSize:21}}>{money(paymentFeatures.supplierPaidThisMonth)}</strong>
          </div>
        </div>
      </section>
    </div>}
{kind !== "payments" && <div className={kind === "sales" ? "panel billing-content-panel" : "panel"}><div className="panel-toolbar"><span className="count-label">{filteredItems.length} records</span></div>
        {(kind === 'sales' ? salesTable : kind === 'purchases' ? purchasesTable : kind === 'deliveries' ? deliveriesTable : kind === 'payments' ? paymentsTable : table)(fields.map(f => f[0]), visibleItems.map(item => <tr key={item.id}>{fields.map(([label, key]) => <td key={key}>{kind === 'sales' && key === '__invoice_actions' ? <div className="actions invoice-row-actions">
            <button type="button" onClick={() => openInvoice(item)}>View / Print</button>
          </div> : kind === 'purchases' && key === '__purchase_actions' ? <div className="actions invoice-row-actions"><button type="button" onClick={() => setPurchasePreview(item)}>View Details</button></div> : kind === 'deliveries' && key === '__actions' ? (() => {
            const status = String(item.status || 'Pending').trim().toLowerCase();
            const busy = String(updatingDeliveryId) === String(item.id);

            if (status === 'delivered') {
              return <span className="status success">Delivered ✓</span>;
            }
            if (status === 'cancelled') {
              return <span className="status warning">Cancelled</span>;
            }

            if (status === 'pending') {
              return <div className="actions">
                <button
                  type="button"
                  disabled={updatingDeliveryId !== null}
                  onClick={() => openDeliveryAssignment(item)}
                >
                  Assign Driver &amp; Vehicle
                </button>
              </div>;
            }

            if (status === 'assigned') {
              return <div className="actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={updatingDeliveryId !== null}
                  onClick={() => openDeliveryAssignment(item)}
                >
                  View Assignment
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={updatingDeliveryId !== null}
                  onClick={() => updateDeliveryStatus(item, 'Out for Delivery')}
                >
                  {busy ? 'Updating…' : 'Start Delivery'}
                </button>
              </div>;
            }

            if (status === 'out for delivery') {
              return <div className="actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={updatingDeliveryId !== null}
                  onClick={() => updateDeliveryStatus(item, 'Delivered')}
                >
                  {busy ? 'Updating…' : 'Mark Delivered'}
                </button>
              </div>;
            }

            return <span className="status warning">{item.status || 'Pending'}</span>;
          })() : kind === 'deliveries' && key === 'status' ? (() => {
            const displayStatus = String(item.status || 'Pending').trim().toLowerCase();
            const label = item.status || 'Pending';
            const tone = displayStatus === 'delivered'
              ? 'success'
              : displayStatus === 'cancelled'
                ? 'danger'
                : 'warning';
            return <span className={`status ${tone}`}>{label}</span>;
          })() : kind === 'purchases' && key === 'status' ? (() => {
            const total = Number(item.total) || 0;
            const paid = Number(item.paid) || 0;
            const due = Math.max(0, total - paid);
            const status = total > 0 && due <= 0.005
              ? 'Paid'
              : paid > 0
                ? 'Partial'
                : 'Unpaid';
            const tone = status === 'Paid' ? 'success' : status === 'Partial' ? 'warning' : 'danger';
            return <span className={`status ${tone}`}>{status}</span>;
          })() : kind === 'payments' && key === '__payment_type' ? (
              ['customer', 'receive'].includes(String(item.type || '').toLowerCase())
                ? 'Customer'
                : ['supplier', 'pay'].includes(String(item.type || '').toLowerCase())
                  ? 'Supplier'
                  : '—'
            ) : kind === 'payments' && key === '__payment_name' ? (
              item.party_name ||
              (['supplier', 'pay'].includes(String(item.type || '').toLowerCase())
                ? (
                    suppliers.find(p => String(p.id) === String(item.party_id))?.name ||
                    suppliers.find(p => String(p.id) === String(item.party_id))?.company
                  )
                : customers.find(p => String(p.id) === String(item.party_id))?.name) ||
              'Name unavailable'
            ) : kind === 'payments' && key === '__payment_date' ? (
              dateLabel(item.payment_date || item.created_at)
            ) : key === 'due' && (kind === 'sales' || kind === 'purchases') ? (() => {
              const dueAmount = Number(item.due ?? (Number(item.total || 0) - Number(item.paid || 0))) || 0;
              return <span
                style={dueAmount > 0.005 ? {
                  display: 'inline-block',
                  padding: '4px 9px',
                  borderRadius: '6px',
                  background: '#fff0f0',
                  color: '#b42318',
                  fontWeight: 700
                } : undefined}
              >{money(dueAmount)}</span>;
            })() : key.includes('total') || key === 'paid' || key === 'due' || key === 'amount' ? money(item[key]) : key.includes('created_at') ? dateLabel(item[key]) : kind === 'purchases' && key === 'supplier_name' ? (
              item.supplier_name || item.supplierName ||
              suppliers.find(s => String(s.id) === String(item.supplier_id ?? item.supplierId))?.name ||
              'Supplier unavailable'
            ) : kind === 'purchases' && key === '__product_count' ? (() => {
              const rows = item.items || item.purchase_items || item.purchaseItems || item.products;
              if (Array.isArray(rows)) {
                return rows.reduce((sum, row) => sum + (Number(row.quantity) > 0 ? Number(row.quantity) : 1), 0);
              }
              const count = item.product_count ?? item.productCount ?? item.items_count ?? item.itemsCount;
              return count ?? '—';
            })() : kind === 'deliveries' && key === 'assigned_driver_name' ? (item.assigned_driver_name || item.delivery_person || item.driver_name || '—') : kind === 'deliveries' && key === 'assigned_driver_phone' ? (item.assigned_driver_phone || item.driver_phone || item.driverPhone || '—') : kind === 'deliveries' && key === 'assigned_vehicle_number' ? (item.assigned_vehicle_number || item.vehicle_number || item.registration_number || '—') : (item[key] ?? '—')}</td>)}</tr>), kind === 'sales' ? 'No invoices match these filters.' : 'No invoices found.')}{listPage.controls}</div>}</>;
  }

  function renderDrivers() {
    const filteredDrivers = drivers.filter(driver =>
      `${driver.name || ''} ${driver.phone || ''} ${driver.status || ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );

    const activeCount = drivers.filter(driver =>
      String(driver.status || 'active').toLowerCase() === 'active'
    ).length;

    return <>
      <div className="section-toolbar">
        <div>
          <h2>Drivers</h2>
          <p>Manage delivery drivers and their availability.</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={openNewDriver}
        >
          <Plus size={17} /> Add Driver
        </button>
      </div>

      <div className="supplier-stats">
        <div className="supplier-stat supplier-stat-total">
          <span>Total Drivers</span>
          <strong>{drivers.length}</strong>
          <small>All registered drivers</small>
        </div>
        <div className="supplier-stat supplier-stat-paid">
          <span>Active Drivers</span>
          <strong>{activeCount}</strong>
          <small>Available driver accounts</small>
        </div>
      </div>

      {driverFormOpen && <section className="panel supplier-inline-form">
        <div className="modal-header">
          <div>
            <span className="modal-kicker">DRIVER DETAILS</span>
            <h2>{driverEditingId ? 'Edit Driver' : 'Add New Driver'}</h2>
          </div>
        </div>

        <form onSubmit={saveDriver}>
          <div className="form-grid">
            <label>
              Driver Name *
              <input
                type="text"
                required
                maxLength={150}
                value={driverForm.name}
                onChange={e => setDriverForm(prev => ({
                  ...prev, name: e.target.value
                }))}
                placeholder="Enter driver name"
              />
            </label>

            <label>
              Phone Number *
              <input
                type="tel"
                required
                maxLength={20}
                value={driverForm.phone}
                onChange={e => setDriverForm(prev => ({
                  ...prev, phone: e.target.value
                }))}
                placeholder="Enter phone number"
              />
            </label>
          </div>

          {pageError && <div className="alert error">
            <XCircle size={17} /><span>{pageError}</span>
          </div>}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={savingDriver}
              onClick={() => {
                setDriverFormOpen(false);
                setDriverEditingId(null);
                setPageError('');
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={savingDriver}
            >
              {savingDriver ? 'Saving…' : driverEditingId ? 'Save Changes' : 'Save Driver'}
            </button>
          </div>
        </form>
      </section>}

      <section className="panel supplier-panel">
        <div className="supplier-filter-row">
          <span className="count-label">{filteredDrivers.length} drivers</span>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search driver name or phone..."
            aria-label="Search drivers"
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Assignment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length ? filteredDrivers.map(driver => {
                const active =
                  String(driver.status || 'active').toLowerCase() === 'active';
                const assigned = driver.is_assigned === true ||
                  String(driver.is_assigned).toLowerCase() === 'true';

                return <tr key={driver.id}>
                  <td>{driver.name || '—'}</td>
                  <td>{driver.phone || '—'}</td>
                  <td>{active ? 'Active' : 'Inactive'}</td>
                  <td>{assigned ? 'Assigned' : 'Available'}</td>
                  <td>
                    <div className="supplier-toolbar-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openEditDriver(driver)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={assigned}
                        title={assigned ? 'Driver has an active delivery' : ''}
                        onClick={() => toggleDriverStatus(driver)}
                      >
                        {active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>;
              }) : <tr>
                <td colSpan="5" className="empty-cell">
                  {drivers.length ? 'No matching drivers found.' : 'No drivers registered yet.'}
                </td>
              </tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>;
  }

  function renderSuppliers() {
    const now = new Date();
    const localDayKey = date => [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');

    const todayKey = localDayKey(now);
    const startOfMonthKey = localDayKey(new Date(now.getFullYear(), now.getMonth(), 1));
    const startOfLastMonthKey = localDayKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    function supplierDateKey(value) {
      if (!value) return '';
      if (typeof value === 'string') {
        const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
      }
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '' : localDayKey(date);
    }

    function inSelectedRange(value) {
      const key = supplierDateKey(value);
      if (!key) return false;

      if (supplierPeriod === 'month') return key >= startOfMonthKey && key <= todayKey;
      if (supplierPeriod === 'lastMonth') return key >= startOfLastMonthKey && key < startOfMonthKey;
      if (supplierPeriod === 'today') return key === todayKey;
      if (supplierPeriod === 'custom') {
        if (supplierFrom && supplierTo && supplierFrom > supplierTo) return false;
        return (!supplierFrom || key >= supplierFrom) && (!supplierTo || key <= supplierTo);
      }
      return true;
    }

    const supplierRows = suppliers
      .map(s => {
        const supplierPurchases = purchases.filter(p =>
          (p.supplier_id && String(p.supplier_id) === String(s.id)) ||
          (!p.supplier_id && String(p.supplier_name || '').trim().toLowerCase() === String(s.name || '').trim().toLowerCase())
        );
        const rangedPurchases = supplierPurchases.filter(p => inSelectedRange(p.created_at));
        const supplierPayments = payments.filter(p =>
          String(p.type || '').toLowerCase() === 'supplier' &&
          String(p.party_id || '') === String(s.id) &&
          inSelectedRange(p.payment_date || p.created_at)
        );
        const purchaseTotal = rangedPurchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
        const purchasePaid = rangedPurchases.reduce((sum, p) => sum + Number(p.paid || 0), 0);
        const paymentTotal = supplierPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const lastPurchase = supplierPurchases.reduce((latest, p) => {
          const value = p.created_at ? new Date(p.created_at).getTime() : 0;
          return value > latest ? value : latest;
        }, 0);
        return {
          supplier: s,
          purchaseCount: rangedPurchases.length,
          purchaseTotal,
          paidInRange: purchasePaid + paymentTotal,
          due: Number(s.due || 0),
          hasPeriodActivity: rangedPurchases.length > 0 || supplierPayments.length > 0,
          lastPurchase: lastPurchase ? new Date(lastPurchase) : null
        };
      })
      .filter(row => supplierPeriod === 'all' || row.hasPeriodActivity)
      .filter(row => {
        const supplierName = [
          row.supplier.name,
          row.supplier.company,
          row.supplier.phone,
          row.supplier.supplier_code
        ].filter(Boolean).join(' ').toLowerCase();
        const lastPurchaseText = row.lastPurchase
          ? `${dateLabel(row.lastPurchase)} ${supplierDateKey(row.lastPurchase)}`
          : '';

        const normalize = value => String(value ?? '')
          .toLowerCase()
          .replace(/[₹,\s]/g, '')
          .trim();

        const matches = (value, filter) => {
          const query = normalize(filter);
          return !query || normalize(value).includes(query);
        };

        return matches(supplierName, supplierColumnFilters.name)
          && matches(`${row.purchaseTotal} ${money(row.purchaseTotal)}`, supplierColumnFilters.purchases)
          && matches(`${row.paidInRange} ${money(row.paidInRange)}`, supplierColumnFilters.paid)
          && matches(`${row.due} ${money(row.due)}`, supplierColumnFilters.due)
          && matches(lastPurchaseText, supplierColumnFilters.lastPurchase);
      });

    const supplierPagination = getListPagination('suppliers', supplierRows.length);
    const visibleSupplierRows = supplierRows.slice(
      supplierPagination.start,
      supplierPagination.start + supplierPagination.visible
    );

    const totals = supplierRows.reduce((acc, row) => ({
      purchases: acc.purchases + row.purchaseTotal,
      paid: acc.paid + row.paidInRange,
      due: acc.due + row.due
    }), { purchases: 0, paid: 0, due: 0 });

    return <>
      <div className="supplier-stats">
        <div className="supplier-stat supplier-stat-total">
          <span>Total suppliers</span>
          <strong>{suppliers.length.toLocaleString('en-IN')}</strong>
          <small>All registered suppliers</small>
        </div>
        <div className="supplier-stat supplier-stat-purchases">
          <span>Purchase value</span>
          <strong>{money(totals.purchases)}</strong>
          <small>Purchases within selected period</small>
        </div>
        <div className="supplier-stat supplier-stat-paid">
          <span>Paid in period</span>
          <strong>{money(totals.paid)}</strong>
          <small>Purchase payments + recorded supplier payments</small>
        </div>
        <div className="supplier-stat supplier-stat-due">
          <span>Current outstanding</span>
          <strong>{money(totals.due)}</strong>
          <small>Current supplier ledger balances · All periods</small>
        </div>
      </div>

      <div className="section-toolbar supplier-toolbar">
        <div><h2>Suppliers</h2><p>Track supplier purchases, payments and current outstanding balances.</p></div>
        <div className="supplier-toolbar-actions">
          <div className="supplier-filter-row">
            <select aria-label="Supplier purchase timeframe" value={supplierPeriod} onChange={e => setSupplierPeriod(e.target.value)}>
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="month">This month</option>
              <option value="lastMonth">Last month</option>
              <option value="custom">Custom range</option>
            </select>
            {supplierPeriod === 'custom' && <>
              <label className="supplier-date-filter">From <input type="date" value={supplierFrom} max={new Date().toLocaleDateString("en-CA")} onChange={e => { const value = e.target.value; if (value && value > new Date().toLocaleDateString("en-CA")) return; setSupplierFrom(value); }} /></label>
              <label className="supplier-date-filter">To <input type="date" value={supplierTo} min={supplierFrom || undefined} max={new Date().toLocaleDateString("en-CA")} onChange={e => { const value = e.target.value; if (value && (value > new Date().toLocaleDateString("en-CA") || (supplierFrom && value < supplierFrom))) return; setSupplierTo(value); }} /></label>
            </>}
          </div>
          <button type="button" className="primary-button" onClick={openNewSupplierPage}><Plus size={17} /> Add supplier</button>
        </div>
      </div>

      {supplierFormOpen && page === 'suppliers' && <section className="panel supplier-inline-form">
        <div className="modal-header">
          <div><span className="modal-kicker">SUPPLIER DETAILS</span><h2>{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h2></div>
          
        </div>
        <form onSubmit={async (event) => {
          await saveRecord(event);
          if (!pageError) setSupplierFormOpen(false);
        }}>
          <div className="form-grid">
            {[
              ['Supplier name', 'name', true],
              ['Company name', 'company'],
              ['Supplier code', 'supplierCode'],
              ['Phone number (+91)', 'phone', true],
              ['Address', 'address']
            ].map(([label, key, required]) => <label key={key} className={key === 'address' ? 'field-wide' : ''}>
              {label}
              <input type={key === 'phone' ? 'tel' : 'text'} inputMode={key === 'phone' ? 'numeric' : undefined} maxLength={key === 'phone' ? 10 : undefined} value={form[key] ?? ''}  onChange={e => setForm(prev => ({ ...prev, [key]: key === 'phone' ? normalizeIndianPhoneInput(e.target.value) : e.target.value }))} placeholder={key === 'phone' ? '10-digit number' : label} />
            </label>)}
          </div>
          {pageError && <div className="alert error"><XCircle size={17} /><span>{pageError}</span></div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => { setSupplierFormOpen(false); setEditingId(null); setPageError(''); }} disabled={saving}>Cancel</button>
            <button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save Supplier'}</button>
          </div>
        </form>
      </section>}

      

      <section className="panel supplier-panel">
        <div className="supplier-filter-row">
          <span className="count-label">{supplierRows.length} suppliers</span>
        </div>

        {suppliersTable(
          ['Supplier Name', 'Purchases', 'Paid in Period', 'Outstanding Now', 'Last Purchase', 'Actions'],
          visibleSupplierRows.map(({ supplier: s, purchaseTotal, paidInRange, due, lastPurchase }) => <tr key={s.id}>
            <td>
              <button
                type="button"
                className="supplier-profile-trigger"
                onClick={() => setSelectedSupplierProfile(s)}
              >
                {displayName(s.name)}
              </button>
              <small>{s.company || 'Independent supplier'}{s.phone ? ` · ${s.phone}` : ''}</small>
            </td>
            <td>{money(purchaseTotal)}</td>
            <td>{money(paidInRange)}</td>
            <td>
              <strong style={due > 0 ? {color: '#b45309'} : undefined}>{money(due)}</strong>
            </td>
            <td>{lastPurchase ? dateLabel(lastPurchase) : '—'}</td>
            <td>
              <div className="actions">
                <button type="button" onClick={() => openEdit('supplier', s)}>Edit</button>
                <button type="button" className="danger-text" onClick={() => deleteRecord('supplier', s)}>Delete</button>
              </div>
            </td>
          </tr>),
          supplierColumnFilters.name || supplierColumnFilters.purchases || supplierColumnFilters.paid || supplierColumnFilters.due || supplierColumnFilters.lastPurchase
            ? 'No matching suppliers. Clear the column filters.'
            : supplierPeriod !== 'all'
              ? 'No supplier has been recorded for the selected date'
              : 'No suppliers found. Add a supplier to get started.'
        )}
        {supplierPagination.controls}
      </section>
    </>;
  }

  function renderOwnerProfile() {
    const ownerName = settings?.owner_name || business?.ownerName || user?.username || 'Business Owner';
    const businessName = settings?.business_name || business?.business_name || business?.name || 'TileBiz Business';
    const mobile = settings?.mobile || settings?.whatsapp || business?.mobile || business?.phone || '';
    const email = settings?.email || user?.email || '';
    const address = settings?.address || business?.address || business?.place || '';
    const initial = String(ownerName).trim().charAt(0).toUpperCase() || 'O';

    return (
      <section className="owner-profile-page">
        <div className="owner-profile-cover">
          <div className="owner-profile-cover-content">
            <span className="owner-profile-eyebrow">TILEBIZ MANAGER</span>
            <h1>Owner Profile</h1>
            <p>Your business identity, all in one place.</p>
          </div>
        </div>

        <div className="owner-profile-main">
          <div className="owner-profile-identity">
            <div className="owner-profile-large-avatar" aria-label="Owner avatar">
              {initial}
            </div>
            <div className="owner-profile-identity-text">
              <h2>{ownerName}</h2>
              <span className="owner-profile-role">OWNER</span>
              <p>{businessName}</p>
            </div>
            <button
              type="button"
              className="owner-profile-edit-button"
              onClick={() => goTo('settings')}
            >
              Edit Profile
            </button>
          </div>

          <div className="owner-profile-section">
            <div className="owner-profile-section-title">
              <div>
                <span className="owner-profile-eyebrow">PERSONAL & BUSINESS</span>
                <h3>Profile Information</h3>
              </div>
              <button
                type="button"
                className="owner-profile-secondary-button"
                onClick={() => goTo('settings')}
              >
                Edit details
              </button>
            </div>

            <div className="owner-profile-info-grid">
              <div className="owner-profile-info-item">
                <span>Owner name</span><strong>{ownerName}</strong>
              </div>
              <div className="owner-profile-info-item">
                <span>Mobile number</span><strong>{mobile || 'Not provided'}</strong>
              </div>
              <div className="owner-profile-info-item">
                <span>Email address</span><strong>{email || 'Not provided'}</strong>
              </div>
              <div className="owner-profile-info-item">
                <span>Business name</span><strong>{businessName}</strong>
              </div>
              <div className="owner-profile-info-item owner-profile-address">
                <span>Business location / address</span><strong>{address || 'Not provided'}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderSettings() {
    if (!settings) {
      return <div className="panel">
        <div className="inline-empty">Settings not loaded. Refresh and try again.</div>
      </div>;
    }

    const pairs = [
      ['business_name', 'Business Name', 'text'],
      ['owner_name', 'Owner Name', 'text'],
      ['mobile', 'Mobile Number (+91)', 'tel'],
      ['address', 'Place', 'text']
    ];

    const [unused] = [null];
    return <>
      <div className="section-toolbar">
        <div>
          <h2>Business Settings</h2>
          <p>Edit your business profile and invoice configuration.</p>
        </div>
      </div>
      <div className="panel" style={{ padding: 16 }}>
        <div className="settings-grid">
          {pairs.map(([key, label, type]) => (
            <label className="setting-item" key={key}>
              <span>{label}</span>
              <input
                type={type}
                value={String(settings[key] ?? '')}
                inputMode={type === 'tel' ? 'numeric' : undefined}
                maxLength={type === 'tel' ? 10 : undefined}
                onChange={e => setSettings(current => ({
                  ...current, [key]: type === 'tel' ? normalizeIndianPhoneInput(e.target.value) : e.target.value
                }))}
                style={{ width: '100%', boxSizing: 'border-box', height: 36, padding: '7px 9px', fontSize: 13 }}
              />
            </label>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {[
            ['show_gst', 'Show GST on invoices'],
            ['low_stock_alerts', 'Low-stock alerts'],
            ['payment_reminders', 'Payment reminders'],
            ['delivery_notifications', 'Delivery notifications']
          ].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={e => setSettings(current => ({
                  ...current, [key]: e.target.checked
                }))}
              />
              {label}
            </label>
          ))}
        </div>

        <button
          type="button"
          disabled={savingSettings}
          onClick={async () => {
            if (savedSettingsSnapshot !== null &&
                JSON.stringify(settings) === savedSettingsSnapshot) {
              setPageError('');
              setNotice('No changes have been made to your profile.');
              return;
            }

            setSavingSettings(true);
            setPageError('');
            setNotice('');
            try {
              const payload = {
                businessName: String(settings.business_name ?? '').trim() || 'Unnamed Business',
                ownerName: String(settings.owner_name ?? '').trim(),
                mobile: String(settings.mobile ?? '').trim(),
                email: String(settings.email ?? '').trim(),
                address: String(settings.address ?? '').trim(),
                whatsapp: String(settings.whatsapp ?? '').trim(),
                gstin: String(settings.gstin ?? '').trim(),
                invoicePrefix: String(settings.invoice_prefix ?? 'INV').trim(),
                showGst: Boolean(settings.show_gst),
                invoiceFooter: String(settings.invoice_footer ?? ''),
                upiId: String(settings.upi_id ?? '').trim(),
                lowStockAlerts: Boolean(settings.low_stock_alerts),
                paymentReminders: Boolean(settings.payment_reminders),
                deliveryNotifications: Boolean(settings.delivery_notifications)
              };

              if (payload.mobile && !/^[6-9]\d{9}$/.test(payload.mobile)) {
                throw new Error('Enter a valid 10-digit Indian mobile number, or leave it blank.');
              }
              if (payload.whatsapp && !/^[6-9]\d{9}$/.test(payload.whatsapp)) {
                throw new Error('WhatsApp number must be a valid 10-digit Indian number.');
              }

              const result = await request('/settings', {
                method: 'PUT',
                body: JSON.stringify(payload)
              });
              const refreshed = await request('/settings');
              const savedSettings = refreshed.settings || refreshed;
              setSettings(savedSettings);
              setSavedSettingsSnapshot(JSON.stringify(savedSettings));
              setNotice('');
              setProfileSavedPopup(true);
            } catch (error) {
              setPageError(error.message || 'Unable to save settings.');
            } finally {
              setSavingSettings(false);
            }
          }}
        >
          {savingSettings ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </>;
  }

  function renderCreateBill() {
    const activeCustomers = customers.filter(
      c => String(c.status || 'active').toLowerCase() === 'active'
    );
    const activeProducts = products.filter(
      p => String(p.status || 'active').toLowerCase() === 'active'
    );

    const subtotal = billForm.items.reduce((sum, row) => {
      return sum + (Number(row.quantity) || 0) * (Number(row.sellingPrice) || 0);
    }, 0);
    const gstTotal = billForm.items.reduce((sum, row) => {
      const base = (Number(row.quantity) || 0) * (Number(row.sellingPrice) || 0);
      return sum + base * (Number(row.gst) || 0) / 100;
    }, 0);
    const discount = Math.min(subtotal, Math.max(0, Number(billForm.discount) || 0));
    const total = Math.max(0, subtotal - discount + gstTotal);
    const paid = Math.max(0, Number(billForm.paid) || 0);
    const due = Math.max(0, total - paid);

    function updateBillItem(index, key, value) {
      setBillForm(prev => ({
        ...prev,
        items: prev.items.map((row, i) => {
          if (i !== index) return row;
          if (key === 'productId') {
            const product = activeProducts.find(x => String(x.id) === value);
            return product ? {
              ...row,
              productId: value,
              sellingPrice: String(product.selling_price ?? ''),
              gst: String(product.gst ?? product.gst_percent ?? '')
            } : { ...row, productId: '', sellingPrice: '', gst: '0' };
          }
          return { ...row, [key]: value };
        })
      }));
    }

    return <>
      <div className="section-toolbar">
        <div>
          <h2>Create a Bill</h2>
          <p>Create a customer invoice using available inventory.</p>
        </div>
      </div>

      <form className="create-bill-form" onSubmit={saveBill} noValidate>
        <section className="panel bill-section">
          <div className="panel-heading">
            <div><h3>Customer details</h3><p>Choose the customer for this invoice.</p></div>
          </div>
          <div className="bill-section-body">
            <label className="bill-field">Customer (optional)
              <select value={billForm.customerId}
                onChange={e => setBillForm(prev => ({ ...prev, customerId: e.target.value }))}>
                <option value="">Select customer</option>
                {activeCustomers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.mobile ? ` — ${c.mobile}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint-text">You can save an invoice without selecting a customer.</p>
          </div>
        </section>

        <section className="panel bill-section">
          <div className="panel-heading">
            <div><h3>Invoice items</h3><p>Choose products and enter quantities.</p></div>
            <button type="button" className="secondary-button"
              onClick={() => setBillForm(prev => ({
                ...prev,
                items: [...prev.items, { productId: '', quantity: '', sellingPrice: '', gst: '0' }]
              }))}>
              <Plus size={15}/> Add item
            </button>
          </div>

          <div className="bill-section-body">
            {billForm.items.map((row, index) => {
              const product = activeProducts.find(p => String(p.id) === String(row.productId));
              const qty = Number(row.quantity) || 0;
              const price = Number(row.sellingPrice) || 0;
              const lineBase = qty * price;
              const lineGst = lineBase * (Number(row.gst) || 0) / 100;
              return <div className="bill-item-card" key={index}>
                <div className="bill-item-heading">
                  <strong>Item {index + 1}</strong>
                  {billForm.items.length > 1 && <button type="button"
                    className="bill-remove-item"
                    onClick={() => setBillForm(prev => ({
                      ...prev, items: prev.items.filter((_, i) => i !== index)
                    }))}>Remove</button>}
                </div>
                <div className="bill-fields-grid">
                  <label>Product <span className="required-mark">*</span>
                    <select required value={row.productId}
                      onChange={e => updateBillItem(index, 'productId', e.target.value)}>
                      <option value="">Select product</option>
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — stock: {Number(p.stock_quantity) || 0}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>Available stock <span className="required-mark">*</span>
                    <input readOnly value={product ? `${Number(product.stock_quantity) || 0} ${product.unit || 'pcs'}` : '—'} />
                  </label>
                  <label>Quantity <span className="required-mark">*</span>
                    <input required type="number" min="0.01" step="any"
                      max={product ? Number(product.stock_quantity) : undefined}
                      value={row.quantity}
                      onChange={e => updateBillItem(index, 'quantity', e.target.value)} />
                  </label>
                  <label>Selling price (₹) <span className="required-mark">*</span>
                    <input required type="number" min="0" step="0.01"
                      value={row.sellingPrice}
                      onChange={e => updateBillItem(index, 'sellingPrice', e.target.value)} />
                  </label>
                  <label>GST (%) <span className="required-mark">*</span>
                    <input type="number" min="0" max="100" step="any"
                      value={row.gst}
                      onChange={e => updateBillItem(index, 'gst', e.target.value)} />
                  </label>
                  <label>Item total (₹) <span className="required-mark">*</span>
                    <input readOnly value={(lineBase + lineGst).toFixed(2)} />
                  </label>
                </div>
              </div>;
            })}
            {activeProducts.length === 0 &&
              <p className="hint-text">No active products found. Add inventory before creating a bill.</p>}
          </div>
        </section>

        <section className="panel bill-section">
          <div className="panel-heading">
            <div><h3>Payment summary</h3><p>Review totals before saving.</p></div>
          </div>
          <div className="bill-section-body">
            <div className="bill-fields-grid">
              <label>Discount (₹) <span className="required-mark">*</span>
                <input type="number" min="0" max={subtotal} step="0.01"
                  value={billForm.discount}
                  onChange={e => setBillForm(prev => ({ ...prev, discount: e.target.value }))} />
              </label>
              <label>Payment method <span className="required-mark">*</span>
                <select value={billForm.paymentMethod}
                  onChange={e => setBillForm(prev => ({ ...prev, paymentMethod: e.target.value }))}>
                  <option>Cash</option><option>UPI</option><option>Bank Transfer</option>
                  <option>Card</option><option>Credit</option><option>Other</option>
                </select>
              </label>
              <label>Amount paid (₹) <span className="required-mark">*</span>
                <input required type="number" min="0" max={total} step="0.01"
                  value={billForm.paid}
                  onChange={e => setBillForm(prev => ({ ...prev, paid: e.target.value }))} />
              </label>
            </div>
            <div className="purchase-summary bill-summary">
              <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div><span>GST</span><strong>{money(gstTotal)}</strong></div>
              <div><span>Discount</span><strong>−{money(discount)}</strong></div>
              <div><span>Grand total</span><strong>{money(total)}</strong></div>
              <div><span>Paid</span><strong>{money(paid)}</strong></div>
              <div><span>Balance due</span><strong>{money(due)}</strong></div>
            </div>
            <div className="bill-submit-row">
              <button type="button" className="secondary-button"
                onClick={() => goTo('dashboard')} disabled={saving}>Cancel</button>
              <button type="submit" className="primary-button"
                disabled={saving || activeCustomers.length === 0 || activeProducts.length === 0}>
                {saving ? <><LoaderCircle size={17} className="spin"/> Saving invoice…</>
                  : <><CheckCircle2 size={17}/> Save invoice</>}
              </button>
            </div>
          </div>
        </section>
        {billError && (
          <div className="alert error" role="alert">
            <XCircle size={17} />
            <span>{billError}</span>
          </div>
        )}
      </form>
    </>;
  }

  function renderRecordPayment() {
    const partyList = paymentForm.type === 'customer' ? customers : suppliers;
    const selectedParty = partyList.find(
      x => String(x.id) === String(paymentForm.partyId)
    );

    return <>
      <div className="section-toolbar">
        <div>
          <h2>Record Payment</h2>
          <p>Record a customer receipt or supplier payment.</p>
        </div>
      </div>

      <section className="panel payment-entry-panel">
        <div className="panel-heading">
          <div>
            <h3>Payment Details</h3>
            <p>Fields marked <span className="required-mark">*</span> are required.</p>
          </div>
        </div>

        <form className="payment-entry-form" onSubmit={savePayment}>
          <div className="form-grid">
            <label>
              Payment Type <span className="required-mark">*</span>
              <select
                required
                value={paymentForm.type}
                onChange={e => setPaymentForm({
                  ...paymentForm, type: e.target.value, partyId: ''
                })}
              >
                <option value="customer">Customer Receipt</option>
                <option value="supplier">Supplier Payment</option>
              </select>
            </label>

            <label>
              {paymentForm.type === 'customer' ? 'Customer' : 'Supplier'}
              {' '}<span className="required-mark">*</span>
              <select
                required
                value={paymentForm.partyId}
                onChange={e => setPaymentForm({...paymentForm, partyId: e.target.value})}
              >
                <option value="">Select {paymentForm.type}</option>
                {partyList.map(party => (
                  <option key={party.id} value={party.id}>
                    {party.name || party.company || 'Unnamed'}{party.phone ? ` — ${party.phone}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Amount (₹) <span className="required-mark">*</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="Enter amount"
                value={paymentForm.amount}
                onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
              />
            </label>

            <label>
              Payment Date
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={e => setPaymentForm({...paymentForm, paymentDate: e.target.value})}
              />
            </label>

            <label>
              Payment Method <span className="required-mark">*</span>
              <select
                required
                value={paymentForm.paymentMethod}
                onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Card</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Reference Number
              <input
                type="text"
                maxLength="100"
                placeholder="UPI / transaction reference"
                value={paymentForm.reference}
                onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})}
              />
            </label>

            <label className="field-wide">
              Notes
              <textarea
                rows="3"
                maxLength="1000"
                placeholder="Optional payment notes"
                value={paymentForm.note}
                onChange={e => setPaymentForm({...paymentForm, note: e.target.value})}
              />
            </label>
          </div>

          <div className="payment-entry-actions">
            <button type="button" className="secondary-button" onClick={() => {
              setPaymentForm({
                type: 'customer',
                partyId: '',
                amount: '',
                paymentMethod: 'Cash',
                paymentDate: new Date().toLocaleDateString('en-CA'),
                reference: '',
                note: ''
              });
              setPageError('');
              setNotice('');
            }}>Clear Form</button>
            <button type="submit" className="primary-button" disabled={saving || loading}>
              {saving ? 'Saving Payment…' : 'Save Payment'}
            </button>
          </div>
        </form>
      </section>
    </>;
  }

  function renderReports() {
    const revenue = sales.reduce(
      (sum, sale) => sum + Number(sale.total || 0), 0
    );

    const collected = payments
      .filter(payment => String(payment.type || '').toLowerCase() === 'customer')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const outstanding = sales.reduce(
      (sum, sale) => sum + Math.max(
        0,
        Number(sale.due ?? (Number(sale.total || 0) - Number(sale.paid || 0)))
      ),
      0
    );
    const stockValue = products.reduce(
      (sum, product) =>
        sum + Number(product.stock_quantity || 0) * Number(product.purchase_price || 0),
      0
    );

    const metrics = [
      { label: 'Total Sales', value: money(revenue), detail: `${sales.length} sales records`, tone: 'green', icon: '💰' },
      { label: 'Outstanding Dues', value: money(outstanding), detail: 'Pending sales balance', tone: 'gold', icon: '⏳' },
      { label: 'Payments Collected', value: money(collected), detail: `${payments.length} payment records`, tone: 'blue', icon: '💳' },
      { label: 'Stock Value', value: money(stockValue), detail: `${products.length} products`, tone: 'dark', icon: '📦' },
      { label: 'Customers', value: customers.length.toLocaleString('en-IN'), detail: 'Registered customers', tone: 'rose', icon: '👥' },
    ];

    const overview = [
      { label: 'Total sales records', value: sales.length, icon: '🧾' },
      { label: 'Payment records', value: payments.length, icon: '💳' },
      { label: 'Products in catalogue', value: products.length, icon: '🧱' },
      { label: 'Registered customers', value: customers.length, icon: '🤝' },
    ];

    return <>
      <div className="section-toolbar reports-toolbar">
        <div>
          <span className="reports-eyebrow">BUSINESS PERFORMANCE</span>
          <h2>Business Reports</h2>
          <p>Review your sales, collections, outstanding dues and inventory at a glance.</p>
        </div>
      </div>

      <div className="reports-metrics-grid">
        {metrics.map((metric, index) => (
          <section className={`report-metric-card report-tone-${metric.tone}`} key={metric.label}>
            <div className="report-metric-top">
              <span className="report-metric-icon" role="img" aria-label={metric.label}>{metric.icon}</span>
              <span className="report-metric-index">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <p className="report-metric-label">{metric.label}</p>
            <h3 className="report-metric-value">{metric.value}</h3>
          </section>
        ))}
      </div>

      <section className="panel reports-overview-panel">
        <div className="reports-overview-heading">
          <div>
            
            <h3>Sales &amp; Collection Overview</h3>
            <p>Summary based on records currently loaded in your account.</p>
          </div>
          <span className="reports-overview-mark">OVERVIEW</span>
        </div>
        <div className="reports-overview-grid">
          {overview.map((item, index) => (
            <div className="reports-overview-item" key={item.label}>
              <span className="reports-overview-number" role="img" aria-label={item.label}>{item.icon}</span>
              <div>
                <strong>{item.value.toLocaleString('en-IN')}</strong>
                <p>{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>;
  }

  function renderPage() {
    switch (page) {
      case 'dashboard': return renderDashboard();
      case 'reports': return renderReports();
      case 'products': return renderProducts();
      case 'customers': return renderCustomers();
      case 'customer-new': return renderNewCustomer();
      case 'supplier-new': return renderNewSupplier();
      case 'sales': return <>
        <div className="section-toolbar billing-toolbar">
          <button type="button" className="primary-button" onClick={() => goTo('bill')}>
            <FilePlus2 size={17} /> Create a Bill
          </button>
        </div>
        {renderGenericList('💳 Billing', '📊 Manage bills, invoice totals and outstanding dues.', sales, 'sales')}
      </>;
      case 'bill': return renderCreateBill();
      case 'purchases': return renderGenericList('🛒 Purchases', '📋 Review purchase records.', purchases, 'purchases');
      case 'record-purchase': return <div className="purchase-page-intro purchase-details-intro"><h2>Purchase Details</h2></div>;
      case 'suppliers': return renderSuppliers();
      case 'drivers': return renderDrivers();
      case 'deliveries': return renderGenericList('Deliveries', 'Review delivery records.', deliveries, 'deliveries');
      case 'delivery-assignment': return renderDeliveryAssignment();
      case 'payments': return renderGenericList('💳 Payments', '📋 Review payment records.', payments, 'payments');
      case 'record-payment': return renderRecordPayment();
      case 'owner-profile': return renderOwnerProfile();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  }

  if (token && user?.role === 'admin') {
    return <AdminDashboard token={token} user={user} onLogout={logout} />;
  }

  const modalIsProduct = modal === 'product';
  const modalIsSupplier = modal === 'supplier';
  const modalTitle = editingId ? `Edit ${modalIsProduct ? 'product' : modalIsSupplier ? 'supplier' : 'customer'}` : `Add ${modalIsProduct ? 'product' : modalIsSupplier ? 'supplier' : 'customer'}`;

  return <div className={`app-shell ${railCollapsed ? "rail-is-collapsed" : ""}`}>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""} ${railCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-brand"><div className="brand-mark small tile-logo-diamond" aria-label="TileBiz tile logo">
  <span className="tile-green"></span>
  <span className="tile-cream"></span>
  <span className="tile-gold"></span>
  <span className="tile-charcoal"></span>
</div><div className="brand-word">Tile<span>Biz</span><small>MANAGER</small></div><button className="close-sidebar" onClick={() => setMobileOpen(false)}><X size={19} /></button><button className="rail-toggle" onClick={() => setRailCollapsed(v => !v)} title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronRight size={17} /></button></div>
      <nav className="nav-list">{navigation.map(item => {
        const Icon = item.icon;
        const group = ['products', 'customers', 'sales', 'purchases', 'suppliers', 'deliveries', 'payments'].includes(item.id) ? 'operations' : item.id;
        return <button key={item.id} aria-label={item.label} title={railCollapsed ? item.label : undefined} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => goTo(item.id)}><Icon size={18} /><span>{item.label}</span>{item.id === 'products' && lowStock.length > 0 && <span className="nav-count">{lowStock.length}</span>}</button>;
      })}</nav>

      
      <div className="sidebar-bottom"></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left">{page === 'dashboard' && <div className="dashboard-greeting"><strong>{greeting}! 👋 {settings?.owner_name || business?.ownerName || user?.username || 'Business Owner'}</strong><span>Here's how your business is looking today.</span></div>}<button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={21} /></button><div className="breadcrumbs">{page !== 'dashboard' && <><button type="button" className="breadcrumb-link" onClick={() => goTo('dashboard')}>Dashboard</button><span aria-hidden="true">›</span>{page === 'record-purchase' ? <><button type="button" className="breadcrumb-link" onClick={() => goTo('purchases')}>Purchases</button><span aria-hidden="true">›</span><strong>New Purchase</strong></> : page === 'record-payment' ? <><button type="button" className="breadcrumb-link" onClick={() => goTo('payments')}>Payments</button></> : page === 'bill' ? <><button type="button" className="breadcrumb-link" onClick={() => goTo('sales')}>Billing</button><span aria-hidden="true">›</span><strong>New Bill</strong></> : page === 'customer-new' ? <><button type="button" className="breadcrumb-link" onClick={() => goTo('customers')}>Customer</button><span aria-hidden="true">›</span><strong>New Customer</strong></> : page === 'supplier-new' ? <><button type="button" className="breadcrumb-link" onClick={() => goTo('suppliers')}>Suppliers</button><span aria-hidden="true">›</span><strong>New Supplier</strong></> : page === 'delivery-assignment' ? <><button type="button" className="breadcrumb-link" onClick={() => goTo('deliveries')}>Deliveries</button><span aria-hidden="true">›</span><strong>Assign Driver &amp; Vehicle</strong></> : <strong>{page === 'settings' ? 'Business Settings' : currentNav.label}</strong>}</>}</div></div><div className="topbar-right"><div className="refresh-status-wrap">
          <button
            type="button"
            className={`icon-button refresh-top${refreshStatus === 'refreshing' ? ' is-refreshing' : ''}`}
            onClick={loadPageData}
            title={refreshStatus === 'error' ? `Refresh failed: ${refreshError}. Click to retry.` : 'Refresh data'}
            aria-label="Refresh data"
            disabled={refreshStatus === 'refreshing'}
          >
            <RefreshCw size={17} />
          </button>
          <span className={`refresh-status refresh-status-${refreshStatus}`} aria-live="polite">
            {refreshStatus === 'refreshing'
              ? 'Refreshing…'
              : refreshStatus === 'error'
                ? `Failed ${lastRefreshAttempt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || ''}`
                : lastSuccessfulRefresh
                  ? `Last refreshed ${lastSuccessfulRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'Not refreshed yet'}
          </span>
          {refreshStatus === 'error' && (
            <span className="refresh-error-tooltip" role="status">{refreshError}</span>
          )}
        </div><div className="topbar-user">
          <div
            className="topbar-profile-trigger owner-details-visible"
            role="button"
            tabIndex={0}
            title="Edit owner details"
            onClick={() => setPage('settings')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPage('settings');
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="topbar-profile-avatar">{String(settings?.owner_name || business?.ownerName || user?.username || 'O').trim().charAt(0).toUpperCase()}</span>
            <span className="topbar-profile-labels">
              <strong>{settings?.owner_name || business?.ownerName || user?.username || 'Business user'}</strong>
              <small>OWNER</small>
              <small className="owner-topbar-detail">Phone: {settings?.mobile || settings?.whatsapp || business?.mobile || business?.phone || 'Add in Settings'}</small>
              <small className="owner-topbar-detail">Place: {settings?.address || business?.address || business?.place || 'Add in Settings'}</small>
            </span>
          </div>
        </div><button className="logout-button topbar-logout" title="Log out" onClick={logout}><LogOut size={18} /><span>Logout</span></button></div></header>
      <div className="page-content">
        {pageError && page !== 'customer-new' && page !== 'supplier-new' && page !== 'record-purchase' && modal !== 'purchase' && !supplierFormOpen && modal !== 'customer' && <div className="alert error page-alert"><XCircle size={17} /><span>{pageError}</span><button onClick={() => setPageError('')}><X size={16} /></button></div>}
        {notice && <div className="alert success-alert"><CheckCircle2 size={17} /><span>{notice}</span><button onClick={() => setNotice('')}><X size={16} /></button></div>}
        {loading && <div className="loading-line"><LoaderCircle size={16} className="spin" /> Loading business data…</div>}
        {renderPage()}
        
      </div>
    </main>

    {profileSavedPopup && (
      <div className="profile-save-overlay" role="presentation" onMouseDown={e => {
        if (e.target === e.currentTarget) setProfileSavedPopup(false);
      }}>
        <section className="profile-save-popup" role="dialog" aria-modal="true" aria-labelledby="profile-save-title">
          <div className="profile-save-icon"><CheckCircle2 size={34} strokeWidth={2.2} /></div>
          <span className="profile-save-eyebrow">TILEBIZ MANAGER</span>
          <h2 id="profile-save-title">Profile Updated Successfully!</h2>
          <p>Your business profile changes have been saved successfully.</p>
          <small>This window will close automatically.</small>
        </section>
      </div>
    )}

    {deleteTarget && createPortal((
      <div
        className="delete-confirm-overlay"
        role="presentation"
        onMouseDown={e => {
          if (e.target === e.currentTarget && !deleting) setDeleteTarget(null);
        }}
      >
        <section className="delete-confirm-popup" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title">
          <div className="delete-confirm-icon">🗑</div>
          <span className="delete-confirm-eyebrow">TILEBIZ MANAGER</span>
          <h2 id="delete-confirm-title">Confirm Delete</h2>
          <p>
            Are you sure you want to delete
            <strong> {deleteTarget.item.name} </strong>?
          </p>
          <div className="delete-confirm-warning">
            This action cannot be undone. The record will be permanently deleted.
          </div>
          <div className="delete-confirm-actions">
            <button
              type="button"
              className="delete-cancel-button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="delete-approve-button"
              onClick={confirmDeleteRecord}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </section>
      </div>
    ), document.body)}

    {(modal === 'purchase' || page === 'record-purchase') && <div className={page === 'record-purchase' ? 'purchase-page-shell' : 'modal-backdrop'} onMouseDown={e => { if (page !== 'record-purchase' && e.target === e.currentTarget && !saving) setModal(null); }}>
      <section className={page === 'record-purchase' ? "purchase-page-card" : "record-modal purchase-modal"}>
        <div className="modal-header"><div><h2>Purchase Details</h2></div></div>
        <form onSubmit={saveRecord}>
          <div className="purchase-form-section">
            <h3>Supplier details</h3>
            <label>Supplier (optional) <select value={purchaseForm.supplierId} onChange={e => {
              const supplierId = e.target.value;
              setSupplierProducts([]);
              setPurchaseForm(prev => ({
                ...prev,
                supplierId,
                items: prev.items.map(row => row.productId ? {
                  ...row,
                  productId: '',
                  name: '',
                  brand: '',
                  category: '',
                  size: '',
                  unit: 'pcs',
                  purchasePrice: '',
                  sellingPrice: '',
                  lowStockLimit: '',
                  finish: '', tilesPerBox: '', storageLocation: '', productImage: '', description: ''
                } : row)
              }));
            }}>
              <option value="">Select supplier</option>
              {suppliers.filter(x => String(x.status || 'active').toLowerCase() === 'active').map(x => <option key={x.id} value={x.id}>{x.name}{x.company ? ` — ${x.company}` : ''}{x.phone ? ` (${x.phone})` : ''}</option>)}
            </select></label>
            <p className="hint-text">Supplier selection is optional.</p>
          </div>
          <div className="purchase-form-section">
            <div className="purchase-items-heading"><h3>Purchase items</h3><button type="button" className="secondary-button" onClick={() => setPurchaseForm(prev => ({ ...prev, items: [...prev.items, { productMode: '', productId: '', name: '', brand: '', category: '', size: '', unit: 'pcs', quantity: '', purchasePrice: '', sellingPrice: '', gst: '', lowStockLimit: '', finish: '', tilesPerBox: '', storageLocation: '', productImage: '', description: '' }] }))}><Plus size={15}/> Add item</button></div>
            {purchaseForm.items.map((item, index) => {
              const updateItem = (key, value) => setPurchaseForm(prev => ({ ...prev, items: prev.items.map((row, i) => i === index ? { ...row, [key]: value } : row) }));
              const lineTotal = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
              return <div className="purchase-item-card" key={index}>
                <div className="purchase-item-heading"><strong>Item {index + 1}</strong>{purchaseForm.items.length > 1 && <button type="button" className="purchase-remove-item" onClick={() => setPurchaseForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}>Remove</button>}</div>
                <label>Product <select disabled={false} value={item.productMode === 'manual' ? 'manual' : (item.productId || '')} onChange={e => {
                  const value = e.target.value;
                  const product = value && value !== 'manual'
                    ? (supplierProducts.find(x => String(x.id) === value) || products.find(x => String(x.id) === value))
                    : null;
                  setPurchaseForm(prev => ({
                    ...prev,
                    items: prev.items.map((row, i) => i === index ? (product ? {
                      ...row,
                      productMode: 'existing',
                      productId: String(product.id),
                      name: product.name || '',
                      brand: product.brand || '',
                      category: product.category || '',
                      size: product.size || '',
                      unit: product.unit || 'pcs',
                      finish: product.finish || '',
                      tilesPerBox: '',
                      storageLocation: product.storage_location || '',
                      productImage: product.product_image || '',
                      description: product.description || '',
                      purchasePrice: String(product.purchase_price ?? ''),
                      sellingPrice: String(product.selling_price ?? ''),
                      lowStockLimit: ''
                    } : value === 'manual' ? {
                      ...row,
                      productMode: 'manual',
                      productId: '',
                      name: '',
                      brand: '',
                      category: '',
                      size: '',
                      unit: 'pcs',
                      quantity: '',
                      purchasePrice: '',
                      sellingPrice: '',
                      gst: '',
                      lowStockLimit: '',
                      finish: '',
                      tilesPerBox: '',
                      storageLocation: '',
                      productImage: '',
                      description: ''
                    } : {
                      ...row,
                      productMode: '',
                      productId: '',
                      name: '',
                      brand: '',
                      category: '',
                      size: '',
                      unit: 'pcs',
                      quantity: '',
                      purchasePrice: '',
                      sellingPrice: '',
                      gst: '',
                      lowStockLimit: '',
                      finish: '',
                      tilesPerBox: '',
                      storageLocation: '',
                      productImage: '',
                      description: ''
                    }) : row)
                  }));
                }}>
                  <option value="">Select product</option>
                  <option value="manual">New product / enter manually</option>
                  {(purchaseForm.supplierId ? supplierProducts : products).map(x => <option key={x.id} value={String(x.id)}>{x.name}{x.brand ? ` — ${x.brand}` : ''}</option>)}
                </select></label>
                {(item.productMode === 'existing' || item.productMode === 'manual') && <>
                  <div className="form-grid">
                    <label>Product name<input value={item.name || ''} onChange={e => updateItem('name', e.target.value)} /></label>
                    <label>Brand <input value={item.brand || ''} onChange={e => updateItem('brand', e.target.value)} /></label>
                    <label>Finish <select value={item.finish || ''} onChange={e => updateItem('finish', e.target.value)}><option value="">Select finish</option><option>Glossy</option><option>Textured</option><option>Polished</option><option>Matt</option></select></label>
                    <label>Category <input value={item.category || ''} placeholder="e.g. Floor, Wall, Outdoor" onChange={e => updateItem('category', e.target.value)} /></label>
                    <label>Size <input value={item.size || ''} placeholder="e.g. 600 × 600 mm" onChange={e => updateItem('size', e.target.value)} /></label>
                    <label>Unit of sale<select value={item.unit || 'pcs'} onChange={e => updateItem('unit', e.target.value)}><option value="boxes">Per Box</option><option value="pcs">Per Piece</option></select></label>
                    <label>Purchase price (₹)<input type="number" min="0" step="0.01" value={item.purchasePrice || ''} onChange={e => updateItem('purchasePrice', e.target.value)} /></label>
                    <label>Selling price (₹)<input type="number" min="0" step="0.01" value={item.sellingPrice || ''} onChange={e => updateItem('sellingPrice', e.target.value)} /></label>
                    <label>Quantity / stock<input type="number" min="0" step="any" value={item.quantity ?? ''} required onChange={e => updateItem('quantity', e.target.value)} /></label>
                    <label>Tiles per box <input type="number" min="0" step="any" value={item.tilesPerBox ?? ''} required onChange={e => updateItem('tilesPerBox', e.target.value)} /></label>
                    <label>Low stock alert level <input type="number" min="0" step="any" value={item.lowStockLimit ?? ''} required onChange={e => updateItem('lowStockLimit', e.target.value)} /></label>
                    <label>Storage location <input value={item.storageLocation || ''} required placeholder="e.g. Warehouse A" onChange={e => updateItem('storageLocation', e.target.value)} /></label>
                    <label>GST % <input type="number" min="0" step="any" value={item.gst ?? ''} required onChange={e => updateItem('gst', e.target.value)} /></label>
                    <label>Product picture (max 500 KB) <input type="file" accept="image/*" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 500 * 1024) {
                        setPageError('Product image must be 500 KB or smaller.');
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => updateItem('productImage', String(reader.result || ''));
                      reader.onerror = () => setPageError('Could not read the product image.');
                      reader.readAsDataURL(file);
                    }} /></label>
                  </div>
                  <label>Description / note<textarea className="purchase-description-note" value={item.description || ''} rows={3} placeholder="Additional product details, shade, batch, or notes" onChange={e => updateItem('description', e.target.value)} /></label>
                  {item.productImage && <div className="purchase-product-image-preview"><img src={item.productImage} alt="Product preview" style={{maxWidth: 160, maxHeight: 120, objectFit: 'contain'}} /><button type="button" className="secondary-button" onClick={() => updateItem('productImage', '')}>Remove picture</button></div>}
                </>}
                <div className="purchase-line-total">Line total <strong>{money(lineTotal)}</strong></div>
              </div>;
            })}
          </div>
          <div className="purchase-form-section">
            <h3>Payment summary</h3>
            <p className="hint-text">Review totals before saving.</p>
            <div className="form-grid">
              <label>Discount (₹) <input type="number" min="0" step="0.01" value={purchaseForm.discount ?? ''} onChange={e => setPurchaseForm(prev => ({ ...prev, discount: e.target.value }))} /></label>
              <label>Payment method <select value={purchaseForm.paymentMethod} onChange={e => setPurchaseForm(prev => ({ ...prev, paymentMethod: e.target.value }))}><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Card</option><option>Credit</option><option>Other</option></select></label>
              <label>Amount paid (₹) <input type="number" min="0" step="0.01" value={purchaseForm.paid} onChange={e => setPurchaseForm(prev => ({ ...prev, paid: e.target.value }))} /></label>
            </div>
            <div className="purchase-summary bill-summary">
              <div><span>Subtotal</span><strong>{money(purchaseForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0), 0))}</strong></div>
              <div><span>GST</span><strong>{money(purchaseForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0) * (Number(item.gst) || 0) / 100, 0))}</strong></div>
              <div><span>Discount</span><strong>−{money(Number(purchaseForm.discount) || 0)}</strong></div>
              <div><span>Grand total</span><strong>{money(Math.max(0, purchaseForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0) * (1 + (Number(item.gst) || 0) / 100), 0) - (Number(purchaseForm.discount) || 0)))}</strong></div>
              <div><span>Paid</span><strong>{money(Number(purchaseForm.paid) || 0)}</strong></div>
              <div><span>Balance due</span><strong>{money(Math.max(0, purchaseForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0) * (1 + (Number(item.gst) || 0) / 100), 0) - (Number(purchaseForm.discount) || 0) - (Number(purchaseForm.paid) || 0)))}</strong></div>
            </div>
                    </div>
          {pageError && <div className="alert error"><XCircle size={17}/><span>{pageError}</span></div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setModal(null); goTo('purchases'); }} disabled={saving}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={17}/> Saving…</> : <><CheckCircle2 size={17}/> Save purchase</>}</button></div>
        </form>
      </section>
    </div>}
    {modal && modal !== 'purchase' && !(modal === 'customer' && (page === 'customers' || page === 'customer-new')) && !(modal === 'supplier' && (supplierFormOpen || page === 'supplier-new')) && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}><section className="record-modal"><div className="modal-header"><div><span className="modal-kicker">{editingId ? 'UPDATE RECORD' : 'NEW RECORD'}</span><h2>{modalTitle}</h2></div></div><form onSubmit={saveRecord}><div className="form-grid">
      {(modalIsProduct ? [
        ['Product name', 'name', true], ['Product code', 'productCode'], ['Category', 'category'], ['Brand', 'brand'],
        ['Unit', 'unit'], ['Purchase price (₹)', 'purchasePrice', true, 'number'], ['Selling price (₹)', 'sellingPrice', true, 'number'],
        ['Stock quantity', 'stockQuantity', true, 'number'], ['Low stock limit', 'lowStockLimit', true, 'number'], ['Description', 'description']
      ] : modalIsSupplier ? [
        ['Supplier name', 'name', true], ['Company name', 'company'], ['Supplier code', 'supplierCode'],
        ['Phone number', 'phone'], ['Address', 'address']
      ] : [
        ['Customer name', 'name', true],
        ['Mobile (+91)', 'mobile', true],
        ['WhatsApp (+91)', 'whatsapp'],
        ['Email', 'email'],
        ['GSTIN', 'gstin', true],
        ['Address', 'address'],
        ['Notes', 'notes']
      ]).map(([label, key, required, type]) => <label className={['description', 'address', 'notes'].includes(key) ? 'field-wide' : ''} key={key}>{label}{Boolean(required) && <span className="required-mark">*</span>}{key === 'address' && modal === 'customer' ? <textarea rows={3} value={form[key] ?? ''} onChange={e => { setNotice(''); setForm(prev => ({ ...prev, [key]: e.target.value })); }} placeholder={label} /> : <input type={key === 'email' && modal === 'customer' ? 'email' : (type === 'number' && modal === 'customer' ? 'text' : (type || 'text'))} inputMode={key === 'mobile' || key === 'whatsapp' ? 'numeric' : (key === 'gstin' ? 'text' : (type === 'number' && modal === 'customer' ? 'decimal' : undefined))} maxLength={key === 'mobile' || key === 'whatsapp' ? 10 : (key === 'gstin' && modal === 'customer' ? 15 : undefined)} autoCapitalize={key === 'gstin' ? 'characters' : undefined} step={type === 'number' && modal !== 'customer' ? 'any' : undefined} min={type === 'number' && modal !== 'customer' ? '0' : undefined} value={form[key] ?? ''}  onChange={e => { setNotice(''); const value = key === 'gstin' && modal === 'customer' ? e.target.value.toUpperCase() : (key === 'mobile' || key === 'whatsapp' ? normalizeIndianPhoneInput(e.target.value) : e.target.value); setForm(prev => ({ ...prev, [key]: value })); }} placeholder={label} /> }<span className="input-clear-overlay">{String(form[key] ?? '') !== '' && <button type="button" className="field-clear-button" aria-label={`Clear ${label}`} title={`Clear ${label}`} onClick={() => { setNotice(''); setForm(prev => ({ ...prev, [key]: '' })); }}><X size={14} /></button>}</span></label>)}
    </div>{pageError && <div className="alert error"><XCircle size={17} />{pageError}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={17} /> Saving…</> : <><CheckCircle2 size={17} /> {editingId ? 'Save changes' : 'Create record'}</>}</button></div></form></section></div>}

    {selectedSupplierProfile && (() => {
      const supplier = selectedSupplierProfile;
      const supplierName = supplier.name || supplier.company || '';
      const profilePurchases = purchases.filter(p => {
        const id = p.supplier_id ?? p.supplierId;
        const name = p.supplier_name || p.supplierName || '';
        return (id && String(id) === String(supplier.id)) ||
          (!id && String(name).trim().toLowerCase() ===
            String(supplierName).trim().toLowerCase());
      }).sort((a, b) =>
        new Date(b.created_at || b.date || 0).getTime() -
        new Date(a.created_at || a.date || 0).getTime()
      );

      const profilePayments = payments.filter(payment => {
        const type = String(payment.type || '').toLowerCase();
        if (!['supplier', 'pay'].includes(type)) return false;
        const sameId = payment.party_id &&
          String(payment.party_id) === String(supplier.id);
        const sameName = String(payment.party_name || '').trim().toLowerCase() ===
          String(supplierName).trim().toLowerCase();
        return sameId || sameName;
      });

      const purchaseTotal = profilePurchases.reduce(
        (sum, p) => sum + (Number(p.total) || 0), 0
      );
      const purchasePaid = profilePurchases.reduce(
        (sum, p) => sum + (Number(p.paid) || 0), 0
      );
      const separatePayments = profilePayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0), 0
      );
      const totalPaid = purchasePaid + separatePayments;
      const outstanding = Math.max(0, purchaseTotal - totalPaid);

      return <div
        className="modal-backdrop supplier-profile-backdrop"
        onMouseDown={e => {
          if (e.target === e.currentTarget) setSelectedSupplierProfile(null);
        }}
      >
        <section
          className="record-modal supplier-profile-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Supplier profile"
        >
          <div className="modal-header supplier-profile-header">
            <div>
              <span className="modal-kicker">SUPPLIER PROFILE</span>
              <h2>{displayName(supplier.name || supplier.company)}</h2>
              <p>{supplier.company || 'Independent supplier'}</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedSupplierProfile(null)}
            >
              Close
            </button>
          </div>

          <div className="supplier-profile-content">
            <div className="supplier-profile-contact">
              {supplier.phone && <div><small>Phone</small><strong>{supplier.phone}</strong></div>}
              {supplier.email && <div><small>Email</small><strong>{supplier.email}</strong></div>}
              {supplier.address && <div className="supplier-profile-address"><small>Address</small><strong>{supplier.address}</strong></div>}
              {supplier.supplierCode && <div><small>Supplier code</small><strong>{supplier.supplierCode}</strong></div>}
            </div>

            <div className="supplier-profile-stats">
              <div className="supplier-profile-stat">
                <small>Total purchases</small>
                <strong>{money(purchaseTotal)}</strong>
              </div>
              <div className="supplier-profile-stat paid">
                <small>Total paid</small>
                <strong>{money(totalPaid)}</strong>
              </div>
              <div className="supplier-profile-stat due">
                <small>Calculated outstanding</small>
                <strong>{money(outstanding)}</strong>
              </div>
              <div className="supplier-profile-stat count">
                <small>Purchase records</small>
                <strong>{profilePurchases.length}</strong>
              </div>
            </div>

            <div className="supplier-profile-history-heading">
              <div>
                <h3>Purchase history</h3>
                <p>All recorded purchases from this supplier</p>
              </div>
              <strong>{profilePurchases.length} records</strong>
            </div>

            {profilePurchases.length ? <div className="table-wrap supplier-profile-history">
              <table>
                <thead>
                  <tr>
                    <th>Purchase ID</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {profilePurchases.map((purchase, index) => {
                    const total = Number(purchase.total) || 0;
                    const paid = Number(purchase.paid) || 0;
                    const due = Number(purchase.due ?? Math.max(0, total - paid)) || 0;
                    return <tr key={purchase.id || index}>
                      <td>#{purchase.id ?? '—'}</td>
                      <td>{dateLabel(purchase.created_at || purchase.date)}</td>
                      <td>{money(total)}</td>
                      <td>{money(paid)}</td>
                      <td>{money(due)}</td>
                      <td>
                        <button
                          type="button"
                          className="supplier-profile-view-button"
                          onClick={() => setPurchasePreview(purchase)}
                        >
                          View details
                        </button>
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div> : <div className="supplier-profile-empty">
              No purchase records found for this supplier.
            </div>}

            <p className="supplier-profile-footnote">
              Paid includes purchase-level payments and separately recorded supplier payments, following the existing Payments page calculation.
            </p>
          </div>
        </section>
      </div>;
    })()}

    {purchasePreview && <div className="modal-backdrop invoice-preview-backdrop" onMouseDown={e => {
      if (e.target === e.currentTarget) setPurchasePreview(null);
    }}>
      <section className="record-modal invoice-preview-modal purchase-preview-modal" role="dialog" aria-modal="true" aria-label="Purchase details">
        <div className="modal-header invoice-modal-toolbar">
          <div className="actions invoice-actions">
            <button type="button" onClick={() => setPurchasePreview(null)}>Close</button>
          </div>
        </div>
        <div className="invoice-print-area">
          <header className="invoice-paper-header">
            <div>
              <h1>{settings?.business_name || business?.business_name || business?.name || 'Your Business'}</h1>
              <p><b>Supplier:</b> {purchasePreview.supplier_name || purchasePreview.supplierName || suppliers.find(x => String(x.id) === String(purchasePreview.supplier_id ?? purchasePreview.supplierId))?.name || '—'}</p>
              {(purchasePreview.supplier_phone || purchasePreview.supplierPhone) && <p><b>Supplier phone:</b> {purchasePreview.supplier_phone || purchasePreview.supplierPhone}</p>}
            </div>
            <div className="invoice-paper-meta">
              <strong>PURCHASE RECORD</strong>
              <p><b>Purchase ID:</b> {purchasePreview.id ?? '—'}</p>
              <p><b>Date:</b> {dateLabel(purchasePreview.created_at || purchasePreview.date)}</p>
              <p><b>Payment:</b> {purchasePreview.payment_method || purchasePreview.paymentMethod || '—'}</p>
            </div>
          </header>
          <h3>Products purchased</h3>
          <div className="table-wrap invoice-items-wrap">
            <table className="invoice-items-table">
              <thead><tr><th>Serial No.</th><th>Product</th><th>Brand / Category</th><th>Size</th><th>Quantity</th><th>Purchase Price</th><th>Selling Price</th><th>GST %</th><th>Line Total</th></tr></thead>
              <tbody>
                {(purchasePreview.items || purchasePreview.purchase_items || purchasePreview.purchaseItems || purchasePreview.products || []).map((item, index) => {
                  const qty = Number(item.quantity || 0);
                  const price = Number(item.purchase_price ?? item.purchasePrice ?? 0);
                  return <tr key={item.id || `${item.product_id || item.productId || item.product_name || item.name}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{item.product_name || item.name || '—'}</td>
                    <td>{[item.brand, item.category].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{item.size || '—'}</td>
                    <td>{qty} {item.unit || ''}</td>
                    <td>{money(price)}</td>
                    <td>{money(item.selling_price ?? item.sellingPrice ?? 0)}</td>
                    <td>{Number(item.gst_percent ?? item.gst ?? 0)}%</td>
                    <td>{money(item.total ?? qty * price)}</td>
                  </tr>;
                })}
                {!(purchasePreview.items || purchasePreview.purchase_items || purchasePreview.purchaseItems || purchasePreview.products || []).length && <tr><td colSpan={9}>No product details were returned for this purchase.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="invoice-totals">
            <div><span>Subtotal</span><strong>{money(purchasePreview.subtotal ?? 0)}</strong></div>
            <div><span>GST</span><strong>{money(purchasePreview.gst ?? 0)}</strong></div>
            <div><span>Discount</span><strong>−{money(purchasePreview.discount ?? 0)}</strong></div>
            <div className="invoice-grand-total"><span>Purchase Total</span><strong>{money(purchasePreview.total ?? 0)}</strong></div>
            <div><span>Amount Paid</span><strong>{money(purchasePreview.paid ?? 0)}</strong></div>
            <div><span>Outstanding Due</span><strong>{money(purchasePreview.due ?? Math.max(0, Number(purchasePreview.total || 0) - Number(purchasePreview.paid || 0)))}</strong></div>
          </div>
          <p className="hint-text">View-only details from the saved purchase record.</p>
        </div>
      </section>
    </div>}

    {invoicePreview && <div className="modal-backdrop invoice-preview-backdrop" onMouseDown={e => {
      if (e.target === e.currentTarget) setInvoicePreview(null);
    }}>
      <section className="record-modal invoice-preview-modal" role="dialog" aria-modal="true" aria-label="Invoice preview">
        <div className="modal-header invoice-modal-toolbar">
          <div>
            <span className="modal-kicker">INVOICE PREVIEW</span>
            <h2>{invoicePreview.invoiceNumber || invoicePreview.invoice_number || 'Invoice'}</h2>
          </div>
          <div className="actions invoice-actions">
            <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
            <button type="button" onClick={() => invoiceWhatsApp(invoicePreview)}>WhatsApp</button>
            <button type="button" onClick={() => setInvoicePreview(null)}>Close</button>
          </div>
        </div>
        <div className="invoice-print-area">
          <header className="invoice-paper-header">
            <div>
              <h1>{settings?.business_name || business?.business_name || business?.name || 'Your Business'}</h1>
              {settings?.address && <p>{settings.address}</p>}
              {(settings?.mobile || business?.mobile) && <p>Phone: {settings?.mobile || business?.mobile}</p>}
              {settings?.email && <p>Email: {settings.email}</p>}
              {settings?.gstin && <p>GSTIN: {settings.gstin}</p>}
            </div>
            <div className="invoice-paper-meta">
              <strong>TAX INVOICE</strong>
              <p><b>Invoice:</b> {invoicePreview.invoiceNumber || invoicePreview.invoice_number || '—'}</p>
              <p><b>Date:</b> {dateLabel(invoicePreview.date || invoicePreview.created_at)}</p>
              <p><b>Payment:</b> {invoicePreview.paymentMethod || invoicePreview.payment_method || '—'}</p>
            </div>
          </header>
          <div className="invoice-customer-block">
            <strong>Bill To</strong>
            <p>{invoicePreview.customerName || invoicePreview.customer_name || 'Walk-in customer'}</p>
            {(invoicePreview.customerPhone || invoicePreview.customer_phone) && <p>Phone: {invoicePreview.customerPhone || invoicePreview.customer_phone}</p>}
          </div>
          <div className="table-wrap invoice-items-wrap">
            <table className="invoice-items-table">
              <thead><tr><th>Serial No.</th><th>Item</th><th>Qty</th><th>Unit Price</th><th>GST %</th><th>Amount</th></tr></thead>
              <tbody>
                {(invoicePreview.items || []).map((item, index) => <tr key={item.id || `${item.name}-${index}`}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="invoice-item-cell">
                      <div className="invoice-item-details">
                        <strong>{item.name || item.product_name || 'Item'}</strong>
                        {item.brand && <span>{item.brand}</span>}
                      </div>
                      {(item.productImage || item.product_image) && (
                        <img
                          className="invoice-item-image"
                          src={item.productImage || item.product_image}
                          alt={item.name || item.product_name || 'Product'}
                        />
                      )}
                    </div>
                  </td>
                  <td>{Number(item.quantity || 0)} {item.unit || ''}</td>
                  <td>{money(item.sellingPrice ?? item.selling_price ?? 0)}</td>
                  <td>{Number(item.gst ?? item.gst_percent ?? 0)}%</td>
                  <td>{money(item.total ?? (Number(item.quantity || 0) * Number(item.sellingPrice ?? item.selling_price ?? 0)))}</td>
                </tr>)}
                {!(invoicePreview.items || []).length && <tr><td colSpan={6}>No item details were returned for this invoice.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="invoice-totals">
            <div><span>Subtotal</span><strong>{money(invoicePreview.subtotal)}</strong></div>
            <div><span>GST</span><strong>{money(invoicePreview.gst)}</strong></div>
            <div><span>Discount</span><strong>−{money(invoicePreview.discount)}</strong></div>
            <div className="invoice-grand-total"><span>Grand Total</span><strong>{money(invoicePreview.total)}</strong></div>
            <div><span>Paid</span><strong>{money(invoicePreview.paid)}</strong></div>
            <div><span>Balance Due</span><strong>{money(invoicePreview.due)}</strong></div>
          </div>
          {settings?.invoice_footer && <footer className="invoice-paper-footer">{settings.invoice_footer}</footer>}
        </div>
      </section>
    </div>}

  </div>;
}

export default App;


/* Clickable customer name in Recent Activity */
