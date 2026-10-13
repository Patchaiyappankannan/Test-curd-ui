import { useEffect, useState } from 'react';
import { API_URL } from './config.js';
import {
  AlertCircle,
  Check,
  CirclePlus,
  LoaderCircle,
  Package,
  Pencil,
  Search,
  Trash2,
  X
} from 'lucide-react';

const emptyForm = { Name: '', Description: '', Price: '', Stock: '0' };

async function request(path, options) {
  const response = await fetch(`${API_URL}/products${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'The request could not be completed.');
  return body;
}

function requireProductList(value) {
  if (!Array.isArray(value)) throw new Error('The products API returned an invalid list response.');
  return value;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value));
}

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    request('', { method: 'GET' })
      .then(requireProductList)
      .then((items) => { if (active) setProducts(items); })
      .catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleProducts = products.filter((product) =>
    `${product.Name} ${product.Description || ''}`.toLowerCase().includes(query.toLowerCase())
  );
  const totalStock = products.reduce((total, product) => total + Number(product.Stock), 0);
  const inventoryValue = products.reduce(
    (total, product) => total + Number(product.Price) * Number(product.Stock), 0
  );

  function startNewProduct() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setNotice('');
  }

  function startEdit(product) {
    setEditingId(product.Id);
    setForm({
      Name: product.Name,
      Description: product.Description || '',
      Price: String(product.Price),
      Stock: String(product.Stock)
    });
    setError('');
    setNotice('');
  }

  async function refreshProducts() {
    const items = requireProductList(await request('', { method: 'GET' }));
    setProducts(items);
  }

  async function submitProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const wasEditing = editingId !== null;
    try {
      await request(wasEditing ? `/${editingId}` : '', {
        method: wasEditing ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...form,
          Price: Number(form.Price),
          Stock: Number(form.Stock)
        })
      });
      await refreshProducts();
      setEditingId(null);
      setForm(emptyForm);
      setNotice(wasEditing ? 'Product updated.' : 'Product created.');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.Name}"? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    try {
      await request(`/${product.Id}`, { method: 'DELETE' });
      setProducts((current) => current.filter((item) => item.Id !== product.Id));
      if (editingId === product.Id) startNewProduct();
      setNotice('Product deleted.');
    } catch (reason) {
      setError(reason.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Fieldnotes home">
          <span className="mark"><Package size={17} strokeWidth={2.2} /></span>
          <span>FIELDNOTES<span className="wordmark-dot">.</span></span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> INVENTORY WORKSPACE</div>
      </header>

      <main className="main-content">
        <section className="page-heading">
          <div>
            <p className="eyebrow">CATALOG / 01</p>
            <h1>Products<span className="heading-period">.</span></h1>
            <p className="heading-copy">A clear view of what you have, and what moves.</p>
          </div>
          <button className="primary-button heading-action" type="button" onClick={startNewProduct}>
            <CirclePlus size={17} /> Add product
          </button>
        </section>

        <section className="stats-row" aria-label="Inventory summary">
          <div className="stat"><span className="stat-label">PRODUCTS</span><strong>{products.length}</strong></div>
          <div className="stat"><span className="stat-label">UNITS IN STOCK</span><strong>{totalStock}</strong></div>
          <div className="stat stat-value"><span className="stat-label">STOCK VALUE</span><strong>{formatCurrency(inventoryValue)}</strong></div>
          <div className="stats-note"><span className="note-tick">↗</span> Keep your catalog current.</div>
        </section>

        <div className="workspace-grid">
          <section className="catalog" aria-labelledby="catalog-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR COLLECTION</p>
                <h2 id="catalog-heading">All products <span>{products.length}</span></h2>
              </div>
              <label className="search-box">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Find a product"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Find a product"
                />
              </label>
            </div>

            {(error || notice) && (
              <div className={`feedback ${error ? 'feedback-error' : 'feedback-success'}`} role={error ? 'alert' : 'status'}>
                {error ? <AlertCircle size={17} /> : <Check size={17} />}
                <span>{error || notice}</span>
                {error && <button className="feedback-dismiss" type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button>}
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead><tr><th>PRODUCT</th><th>PRICE</th><th>IN STOCK</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td className="table-message" colSpan="4"><LoaderCircle className="spinner" size={20} /> Loading products</td></tr>
                  ) : visibleProducts.length === 0 ? (
                    <tr><td className="table-message empty-message" colSpan="4">
                      <span className="empty-icon"><Package size={21} /></span>
                      <strong>{query ? 'No matching products' : 'Your catalog is ready'}</strong>
                      <span>{query ? 'Try another search.' : 'Add a product to start tracking your inventory.'}</span>
                    </td></tr>
                  ) : visibleProducts.map((product) => (
                    <tr key={product.Id}>
                      <td className="product-cell">
                        <span className="product-avatar">{product.Name.trim().charAt(0).toUpperCase()}</span>
                        <span className="product-copy"><strong>{product.Name}</strong><small>{product.Description || 'No description'}</small></span>
                      </td>
                      <td className="price-cell">{formatCurrency(product.Price)}</td>
                      <td><span className={`stock-pill ${Number(product.Stock) === 0 ? 'stock-empty' : Number(product.Stock) < 5 ? 'stock-low' : ''}`}>{product.Stock} <span>units</span></span></td>
                      <td className="row-actions">
                        <button className="icon-button" type="button" title={`Edit ${product.Name}`} aria-label={`Edit ${product.Name}`} onClick={() => startEdit(product)}><Pencil size={16} /></button>
                        <button className="icon-button icon-danger" type="button" title={`Delete ${product.Name}`} aria-label={`Delete ${product.Name}`} onClick={() => deleteProduct(product)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="table-footnote">Showing {visibleProducts.length} of {products.length} products</p>
          </section>

          <aside className="editor" aria-labelledby="editor-heading">
            <div className="editor-heading">
              <p className="eyebrow">{editingId === null ? 'ADD TO CATALOG' : `EDITING / #${editingId}`}</p>
              <h2 id="editor-heading">{editingId === null ? 'New product' : 'Edit product'}</h2>
              <p>{editingId === null ? 'Start with the essentials.' : 'Update the product details below.'}</p>
            </div>
            <form className="product-form" onSubmit={submitProduct}>
              <label className="field-label" htmlFor="product-name">Product name <span>*</span></label>
              <input id="product-name" name="Name" type="text" maxLength="120" placeholder="e.g. Ceramic pour-over" value={form.Name} onChange={(event) => setForm({ ...form, Name: event.target.value })} required />

              <label className="field-label" htmlFor="product-description">Description</label>
              <textarea id="product-description" name="Description" maxLength="1000" rows="3" placeholder="A few useful details" value={form.Description} onChange={(event) => setForm({ ...form, Description: event.target.value })} />

              <div className="field-pair">
                <div><label className="field-label" htmlFor="product-price">Price <span>*</span></label><div className="input-prefix"><span>$</span><input id="product-price" name="Price" type="number" min="0" max="99999999.99" step="0.01" placeholder="0.00" value={form.Price} onChange={(event) => setForm({ ...form, Price: event.target.value })} required /></div></div>
                <div><label className="field-label" htmlFor="product-stock">Stock <span>*</span></label><input id="product-stock" name="Stock" type="number" min="0" step="1" placeholder="0" value={form.Stock} onChange={(event) => setForm({ ...form, Stock: event.target.value })} required /></div>
              </div>

              <div className="form-actions">
                {editingId !== null && <button className="secondary-button" type="button" onClick={startNewProduct}>Cancel</button>}
                <button className="primary-button save-button" type="submit" disabled={saving}>
                  {saving ? <LoaderCircle className="spinner" size={17} /> : editingId === null ? <CirclePlus size={17} /> : <Check size={17} />}
                  {saving ? 'Saving...' : editingId === null ? 'Create product' : 'Save changes'}
                </button>
              </div>
            </form>
            <div className="editor-note"><span className="note-bar" /> Prices are recorded in USD.</div>
          </aside>
        </div>

        <footer className="page-footer"><span>FIELDNOTES INVENTORY</span><span>PRODUCTS / {String(products.length).padStart(2, '0')}</span></footer>
      </main>
    </div>
  );
}

export default App;