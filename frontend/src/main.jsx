import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, BookOpen, Boxes,
  CheckCircle2, LayoutDashboard, LogOut, Menu, Package, Plus, RefreshCw, Search,
  Settings, SlidersHorizontal, UserCircle, Warehouse, X, Trash2
} from 'lucide-react';
import { api, apiError, unwrap } from './services/api';
import './styles.css';

const NAV = [
  ['Dashboard', '/', LayoutDashboard], ['Products', '/products', Package],
  ['Receipts', '/operations/receipt', ArrowDownToLine], ['Deliveries', '/operations/delivery', ArrowUpFromLine],
  ['Transfers', '/operations/transfer', ArrowLeftRight], ['Adjustments', '/operations/adjustment', SlidersHorizontal],
  ['Stock Ledger', '/ledger', BookOpen], ['Warehouses', '/warehouses', Warehouse],
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(r => setUser(unwrap(r).user || unwrap(r))).catch(() => setUser(null)).finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null); navigate('/login');
  };

  if (checking) return <div className="loading-screen"><RefreshCw className="spin"/> Checking session…</div>;
  if (!user) return <Auth onLogin={setUser}/>;

  const current = NAV.find(n => n[1] === location.pathname);
  return <div className="shell">
    <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
      <div className="brand"><div className="logo"><Boxes size={21}/></div>{!collapsed && <div><b>StockSense</b><small>Inventory OS</small></div>}</div>
      <nav className="nav">{NAV.map(([label, path, Icon]) => <button key={path} className={location.pathname === path || (path.startsWith('/operations') && location.pathname === path) ? 'active' : ''} onClick={() => navigate(path)} title={label}><Icon size={18}/>{!collapsed && <span>{label}</span>}</button>)}</nav>
      <div className="side-bottom">
        {!collapsed && <div className="user-mini"><div className="avatar">{user.name?.[0]?.toUpperCase()}</div><div><b>{user.name}</b><small>{roleLabel(user.role)}</small></div></div>}
        <button className="nav-btn" onClick={logout}><LogOut size={18}/>{!collapsed && 'Logout'}</button>
      </div>
    </aside>
    <main className="main">
      <header><button className="icon-btn" onClick={() => setCollapsed(v => !v)}><Menu size={19}/></button><div className="crumb">Inventory / <b>{current?.[0] || 'StockSense'}</b></div><div className="header-right"><UserCircle size={21}/><span>{user.name}</span></div></header>
      <div className="content"><RouterView/></div>
    </main>
  </div>;
}

const roleLabel = r => r === 'warehouse_staff' ? 'Warehouse Staff' : 'Inventory Manager';

function Auth({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({});
  const [resetToken, setResetToken] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'login' || mode === 'signup') {
        const r = await api.post(`/auth/${mode}`, mode === 'signup' ? { name: form.name, email: form.email, password: form.password } : { email: form.email, password: form.password });
        onLogin(unwrap(r).user); navigate('/'); return;
      }
      if (mode === 'forgot') {
        const r = await api.post('/auth/forgot-password', { email: form.email });
        setMessage(unwrap(r).message || r.data.message); setMode('verify'); return;
      }
      if (mode === 'verify') {
        const r = await api.post('/auth/verify-otp', { email: form.email, otp: form.otp });
        setResetToken(unwrap(r).resetToken); setMode('reset'); return;
      }
      await api.post('/auth/reset-password', { resetToken, newPassword: form.newPassword });
      setMessage('Password updated. You can now log in.'); setMode('login');
    } catch (e) { setMessage(apiError(e)); } finally { setBusy(false); }
  };
  const title = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your workspace' : mode === 'forgot' ? 'Reset password' : mode === 'verify' ? 'Verify OTP' : 'Choose a new password';
  return <div className="auth"><div className="auth-card">
    <div className="auth-brand"><div className="logo"><Boxes size={25}/></div><div><b>StockSense</b><span>Inventory Management System</span></div></div>
    <h1>{title}</h1><p className="muted">{mode === 'signup' ? 'Create an inventory manager account.' : 'Manage products, warehouses and stock movements in one place.'}</p>
    <form onSubmit={submit}>
      {mode === 'signup' && <input required placeholder="Full name" value={form.name || ''} onChange={e => setForm({...form,name:e.target.value})}/>} 
      {['login','signup','forgot','verify'].includes(mode) && <input required type="email" placeholder="Email" value={form.email || ''} onChange={e => setForm({...form,email:e.target.value})}/>} 
      {mode === 'verify' && <input required inputMode="numeric" maxLength="6" placeholder="6-digit OTP" value={form.otp || ''} onChange={e => setForm({...form,otp:e.target.value.replace(/\D/g,'')})}/>} 
      {(mode === 'login' || mode === 'signup') && <input required type="password" minLength="8" placeholder="Password" value={form.password || ''} onChange={e => setForm({...form,password:e.target.value})}/>} 
      {mode === 'reset' && <input required type="password" minLength="8" placeholder="New password" value={form.newPassword || ''} onChange={e => setForm({...form,newPassword:e.target.value})}/>} 
      <button disabled={busy} className="primary wide">{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send OTP' : mode === 'verify' ? 'Verify OTP' : 'Reset password'}</button>
    </form>
    {message && <div className="notice">{message}</div>}
    <div className="auth-links">
      {mode === 'login' ? <><button onClick={() => setMode('forgot')}>Forgot password?</button><button onClick={() => setMode('signup')}>Create account</button></> : <button onClick={() => setMode('login')}>Back to login</button>}
    </div>
  </div></div>;
}

function RouterView() {
  const path = window.location.pathname;
  if (path === '/' || path === '/dashboard') return <Dashboard/>;
  if (path === '/products') return <Products/>;
  if (path === '/warehouses') return <Warehouses/>;
  if (path === '/ledger') return <Ledger/>;
  if (path.startsWith('/operations/')) return <Operation type={path.split('/').pop()}/>;
  return <Dashboard/>;
}

function Dashboard() {
  const [d,setD] = useState(null); const [err,setErr] = useState('');
  const load = () => api.get('/dashboard/kpis').then(r=>setD(unwrap(r))).catch(e=>setErr(apiError(e)));
  useEffect(load,[]);
  const kpis = d ? [
    ['Products', d.totalProductsCount, Package], ['Units in stock', d.totalItemsInStock, Boxes],
    ['Low stock', d.lowStockCount, AlertTriangle], ['Pending receipts', d.operations.pendingReceipts, ArrowDownToLine],
    ['Pending deliveries', d.operations.pendingDeliveries, ArrowUpFromLine], ['Transfers scheduled', d.operations.pendingTransfers, ArrowLeftRight],
  ] : [];
  return <><PageTitle title="Dashboard" sub="Real-time snapshot of inventory operations." action={<button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>}/>{err&&<ErrorBox text={err}/>}<div className="kpis">{kpis.map(([a,b,I])=><div className="kpi" key={a}><div className="kpi-top"><span>{a}</span><I size={18}/></div><strong>{b}</strong><small>Live from MongoDB</small></div>)}</div><div className="grid-2">
    <section className="panel"><PanelHead title="Low-stock products" sub="Products at or below their reorder level."/><div className="list">{d?.lowStockProducts?.slice(0,8).map(p=><div className="row" key={p._id}><div><b>{p.name}</b><small>{p.sku} · {p.category}</small></div><span className={p.totalStock <= 0?'danger':'warning'}>{p.totalStock} {p.uom}</span></div>)}</div>{!d?.lowStockProducts?.length&&<Empty text="All stock levels look healthy."/>}</section>
    <section className="panel"><PanelHead title="Quick actions" sub="Move inventory through the workflow."/><div className="quick-grid"><Quick href="/operations/receipt" icon={ArrowDownToLine} title="Receive stock"/><Quick href="/operations/delivery" icon={ArrowUpFromLine} title="Create delivery"/><Quick href="/operations/transfer" icon={ArrowLeftRight} title="Internal transfer"/><Quick href="/operations/adjustment" icon={SlidersHorizontal} title="Adjust count"/></div></section>
  </div></>;
}

function Products(){
  const [items,setItems]=useState([]),[show,setShow]=useState(false),[editing,setEditing]=useState(null),[query,setQuery]=useState(''),[form,setForm]=useState({uom:'pcs',minReorderLevel:10,reorderQuantity:50,costPrice:0,sellingPrice:0});
  const load=()=>api.get('/products',{params:query?{search:query}:{}}).then(r=>setItems(unwrap(r)||[])); useEffect(load,[query]);
  const save=async e=>{e.preventDefault();try{if(editing)await api.put(`/products/${editing._id}`,form);else await api.post('/products',form);setShow(false);setEditing(null);setForm({uom:'pcs',minReorderLevel:10,reorderQuantity:50,costPrice:0,sellingPrice:0});load()}catch(e){alert(apiError(e))}};
  const remove=async p=>{if(confirm(`Delete ${p.name}?`)){try{await api.delete(`/products/${p._id}`);load()}catch(e){alert(apiError(e))}}};
  return <><PageTitle title="Products" sub="Create and maintain SKUs, categories and reorder rules." action={<button className="primary" onClick={()=>{setEditing(null);setShow(true)}}><Plus size={17}/> New product</button>}/><section className="panel"><div className="toolbar"><div className="search"><Search size={16}/><input placeholder="Search name or SKU" value={query} onChange={e=>setQuery(e.target.value)}/></div><span className="muted">{items.length} products</span></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>UOM</th><th>Stock</th><th>Reorder</th><th>Status</th><th></th></tr></thead><tbody>{items.map(p=><tr key={p._id}><td><b>{p.name}</b><small>{p.description}</small></td><td><code>{p.sku}</code></td><td>{p.category}</td><td>{p.uom}</td><td>{p.totalStock}</td><td>{p.minReorderLevel}</td><td><Status value={p.stockStatus}/></td><td><button className="small-btn" onClick={()=>{setEditing(p);setForm({...p});setShow(true)}}>Edit</button> <button className="danger-btn" onClick={()=>remove(p)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>{!items.length&&<Empty text="No products found."/>}</section>{show&&<Modal title={editing?'Edit product':'Create product'} close={()=>setShow(false)}><ProductForm form={form} setForm={setForm} save={save}/></Modal>}</>;
}
function ProductForm({form,setForm,save}){const fields=[['name','Product name'],['sku','SKU / Code'],['category','Category'],['uom','Unit of measure'],['description','Description'],['minReorderLevel','Minimum reorder level'],['reorderQuantity','Reorder quantity'],['costPrice','Cost price'],['sellingPrice','Selling price']];return <form className="form-grid" onSubmit={save}>{fields.map(([k,l])=><label key={k}>{l}{k==='description'?<textarea value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})}/>:<input required={['name','sku','category'].includes(k)} type={['minReorderLevel','reorderQuantity','costPrice','sellingPrice'].includes(k)?'number':'text'} min="0" value={form[k] ?? ''} onChange={e=>setForm({...form,[k]:['minReorderLevel','reorderQuantity','costPrice','sellingPrice'].includes(k)?Number(e.target.value):e.target.value})}/>}</label>)}<button className="primary">Save product</button></form>}

function Warehouses(){const [items,setItems]=useState([]),[show,setShow]=useState(false),[form,setForm]=useState({locations:[{name:'Main Receiving Dock',code:'DOCK-01',type:'dock'}]});const load=()=>api.get('/inventory/warehouses').then(r=>setItems(unwrap(r)||[]));useEffect(load,[]);const save=async e=>{e.preventDefault();try{await api.post('/inventory/warehouses',form);setShow(false);setForm({locations:[{name:'Main Receiving Dock',code:'DOCK-01',type:'dock'}]});load()}catch(e){alert(apiError(e))}};return <><PageTitle title="Warehouses" sub="Manage warehouses and their internal locations." action={<button className="primary" onClick={()=>setShow(true)}><Plus size={17}/> New warehouse</button>}/><section className="panel"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>Address</th><th>Locations</th><th>Status</th></tr></thead><tbody>{items.map(w=><tr key={w._id}><td><b>{w.name}</b></td><td><code>{w.code}</code></td><td>{[w.address?.city,w.address?.state].filter(Boolean).join(', ')||'—'}</td><td>{w.locations?.length||0}</td><td><Status value={w.isActive?'Active':'Inactive'}/></td></tr>)}</tbody></table></div>{!items.length&&<Empty text="No warehouses found."/>}</section>{show&&<Modal title="Create warehouse" close={()=>setShow(false)}><form className="form-grid" onSubmit={save}><label>Name<input required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Code<input required value={form.code||''} onChange={e=>setForm({...form,code:e.target.value})}/></label><label>Address<input value={form.address?.street||''} placeholder="Street" onChange={e=>setForm({...form,address:{...form.address,street:e.target.value}})}/></label><div className="form-row"><label>City<input value={form.address?.city||''} onChange={e=>setForm({...form,address:{...form.address,city:e.target.value}})}/></label><label>State<input value={form.address?.state||''} onChange={e=>setForm({...form,address:{...form.address,state:e.target.value}})}/></label></div><button className="primary">Create warehouse</button></form></Modal>}</>}

const OP_CONFIG={receipt:{title:'Receipts',sub:'Record incoming goods from vendors.',endpoint:'/receipts',number:'receiptNumber'},delivery:{title:'Delivery Orders',sub:'Pick, pack and dispatch outgoing stock.',endpoint:'/deliveries',number:'orderNumber'},transfer:{title:'Internal Transfers',sub:'Move stock between warehouses or locations.',endpoint:'/transfers',number:'transferNumber'},adjustment:{title:'Stock Adjustments',sub:'Reconcile recorded quantities with physical counts.',endpoint:'/adjustments',number:'adjustmentNumber'}};
function Operation({type}){const cfg=OP_CONFIG[type]||OP_CONFIG.receipt;return type==='adjustment'?<AdjustmentPage cfg={cfg}/>:<MovementPage type={type} cfg={cfg}/>}
function useInventoryData(){const [products,setProducts]=useState([]),[warehouses,setWarehouses]=useState([]);const load=()=>Promise.all([api.get('/products'),api.get('/inventory/warehouses')]).then(([p,w])=>{setProducts(unwrap(p)||[]);setWarehouses(unwrap(w)||[])});useEffect(()=>{load()},[]);return {products,warehouses}};
function MovementPage({type,cfg}){const {products,warehouses}=useInventoryData();const [rows,setRows]=useState([]),[form,setForm]=useState({items:[{}],status:'Draft'});const load=()=>api.get(cfg.endpoint).then(r=>setRows(unwrap(r)||[]));useEffect(load,[]);const setItem=(i,k,v)=>setForm(f=>({...f,items:f.items.map((x,j)=>j===i?{...x,[k]:v}:x)}));const product=(id)=>products.find(p=>p._id===id);const buildItem=(it)=>{const p=product(it.product);return type==='receipt'?{product:p._id,productName:p.name,sku:p.sku,uom:p.uom,quantityExpected:Number(it.quantityExpected),quantityReceived:Number(it.quantityReceived||it.quantityExpected),destinationLocation:it.destinationLocation||'Main Receiving Dock'}:type==='delivery'?{product:p._id,productName:p.name,sku:p.sku,uom:p.uom,quantityOrdered:Number(it.quantityOrdered),quantityPicked:Number(it.quantityPicked||0),quantityPacked:Number(it.quantityPacked||0),sourceLocation:it.sourceLocation||'Main Storage'}:{product:p._id,productName:p.name,sku:p.sku,uom:p.uom,quantity:Number(it.quantity)};};
  const save=async e=>{e.preventDefault();try{const f=form;let payload;if(type==='receipt')payload={supplierName:f.supplierName,purchaseOrderRef:f.purchaseOrderRef,warehouse:f.warehouse,warehouseName:warehouses.find(w=>w._id===f.warehouse)?.name,items:f.items.map(buildItem),notes:f.notes};if(type==='delivery')payload={customerName:f.customerName,shippingAddress:f.shippingAddress,salesOrderRef:f.salesOrderRef,warehouse:f.warehouse,warehouseName:warehouses.find(w=>w._id===f.warehouse)?.name,items:f.items.map(buildItem),notes:f.notes};if(type==='transfer')payload={sourceWarehouse:f.sourceWarehouse,sourceWarehouseName:warehouses.find(w=>w._id===f.sourceWarehouse)?.name,sourceLocation:f.sourceLocation,destWarehouse:f.destWarehouse,destWarehouseName:warehouses.find(w=>w._id===f.destWarehouse)?.name,destLocation:f.destLocation,scheduledDate:f.scheduledDate||undefined,items:f.items.map(buildItem),notes:f.notes};await api.post(cfg.endpoint,payload);setForm({items:[{}],status:'Draft'});load();alert('Document created successfully.');}catch(e){alert(apiError(e))}};
  const validate=async id=>{try{await api.post(`${cfg.endpoint}/${id}/validate`);load();alert('Validated successfully. Stock and ledger updated.')}catch(e){alert(apiError(e))}};
  return <><PageTitle title={cfg.title} sub={cfg.sub}/><section className="panel"><PanelHead title={`Create ${cfg.title.slice(0,-1)}`} sub="Create a draft, then validate it to update MongoDB stock."/><form onSubmit={save}>
    {type==='receipt'&&<div className="form-row"><label>Supplier name<input required value={form.supplierName||''} onChange={e=>setForm({...form,supplierName:e.target.value})}/></label><label>Purchase order ref<input value={form.purchaseOrderRef||''} onChange={e=>setForm({...form,purchaseOrderRef:e.target.value})}/></label></div>}
    {type==='delivery'&&<div className="form-row"><label>Customer name<input required value={form.customerName||''} onChange={e=>setForm({...form,customerName:e.target.value})}/></label><label>Shipping address<input value={form.shippingAddress||''} onChange={e=>setForm({...form,shippingAddress:e.target.value})}/></label></div>}
    {type==='transfer'&&<div className="form-row"><label>Source warehouse<Select value={form.sourceWarehouse||''} onChange={e=>setForm({...form,sourceWarehouse:e.target.value})} options={warehouses}/></label><label>Source location<input required value={form.sourceLocation||''} placeholder="Rack A" onChange={e=>setForm({...form,sourceLocation:e.target.value})}/></label><label>Destination warehouse<Select value={form.destWarehouse||''} onChange={e=>setForm({...form,destWarehouse:e.target.value})} options={warehouses}/></label><label>Destination location<input required value={form.destLocation||''} placeholder="Production Floor" onChange={e=>setForm({...form,destLocation:e.target.value})}/></label></div>}
    {type!=='transfer'&&<label className="field">Warehouse<Select required value={form.warehouse||''} onChange={e=>setForm({...form,warehouse:e.target.value})} options={warehouses}/></label>}
    {form.items.map((it,i)=><div className="item-row" key={i}><Select required value={it.product||''} onChange={e=>setItem(i,'product',e.target.value)} options={products} product/><input required type="number" min="0.01" step="0.01" placeholder="Quantity" value={it[type==='receipt'?'quantityExpected':type==='delivery'?'quantityOrdered':'quantity']||''} onChange={e=>setItem(i,type==='receipt'?'quantityExpected':type==='delivery'?'quantityOrdered':'quantity',e.target.value)}/>{type==='receipt'&&<input placeholder="Destination location" value={it.destinationLocation||''} onChange={e=>setItem(i,'destinationLocation',e.target.value)}/>} {type==='delivery'&&<input placeholder="Source location" value={it.sourceLocation||''} onChange={e=>setItem(i,'sourceLocation',e.target.value)}/>}<button type="button" className="danger-btn" onClick={()=>setForm({...form,items:form.items.filter((_,j)=>j!==i)})}><Trash2 size={15}/></button></div>)}
    <label className="field">Notes<textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="actions"><button type="button" className="secondary" onClick={()=>setForm({...form,items:[...form.items,{}]})}><Plus size={16}/> Add line</button><button className="primary">Create draft</button></div>
  </form></section><OperationTable rows={rows} type={type} validate={validate}/></>;
}
function AdjustmentPage({cfg}){const {products,warehouses}=useInventoryData();const [rows,setRows]=useState([]),[form,setForm]=useState({});const load=()=>api.get(cfg.endpoint).then(r=>setRows(unwrap(r)||[]));useEffect(load,[]);const selected=products.find(p=>p._id===form.product);const save=async e=>{e.preventDefault();try{const w=warehouses.find(x=>x._id===form.warehouse);const payload={warehouse:form.warehouse,warehouseName:w?.name,locationName:form.locationName,product:form.product,productName:selected?.name,sku:selected?.sku,uom:selected?.uom,recordedQuantity:Number(selected?.totalStock||0),countedQuantity:Number(form.countedQuantity),reason:form.reason,notes:form.notes};await api.post(cfg.endpoint,payload);setForm({});load();alert('Adjustment created. Validate it to apply the count.')}catch(e){alert(apiError(e))}};const validate=async id=>{try{await api.post(`${cfg.endpoint}/${id}/validate`);load();alert('Adjustment validated and stock updated.')}catch(e){alert(apiError(e))}};return <><PageTitle title="Stock Adjustments" sub="Correct mismatches between recorded and physical stock."/><section className="panel"><PanelHead title="Create adjustment" sub="The backend calculates the final difference during validation."/><form onSubmit={save}><div className="form-row"><label>Product<Select required value={form.product||''} onChange={e=>setForm({...form,product:e.target.value})} options={products} product/></label><label>Warehouse<Select required value={form.warehouse||''} onChange={e=>setForm({...form,warehouse:e.target.value})} options={warehouses}/></label><label>Location / rack<input required value={form.locationName||''} placeholder="Rack A" onChange={e=>setForm({...form,locationName:e.target.value})}/></label><label>Physical counted quantity<input required type="number" min="0" step="0.01" value={form.countedQuantity??''} onChange={e=>setForm({...form,countedQuantity:e.target.value})}/></label></div><label className="field">Reason<select value={form.reason||'Physical Inventory Count'} onChange={e=>setForm({...form,reason:e.target.value})}>{['Damaged Goods','Physical Inventory Count','Theft / Loss','Data Entry Correction','Expired','Other'].map(x=><option key={x}>{x}</option>)}</select></label><button className="primary">Create adjustment</button></form></section><OperationTable rows={rows} type="adjustment" validate={validate}/></>}
function OperationTable({rows,type,validate}){const cfg=OP_CONFIG[type];const number=cfg.number;return <section className="panel"><PanelHead title="Recent documents" sub="Validate a document to apply its stock operation."/><div className="table-wrap"><table><thead><tr><th>Reference</th><th>Status</th><th>Lines</th><th>Created</th><th></th></tr></thead><tbody>{rows.map(o=><tr key={o._id}><td><b>{o[number]}</b></td><td><Status value={o.status}/></td><td>{o.items ? o.items.length : 1}</td><td>{new Date(o.createdAt).toLocaleString()}</td><td>{o.status!=='Done'&&o.status!=='Canceled'&&<button className="small-btn" onClick={()=>validate(o._id)}><CheckCircle2 size={14}/> Validate</button>}</td></tr>)}</tbody></table></div>{!rows.length&&<Empty text="No documents yet."/>}</section>}

function Ledger(){const [rows,setRows]=useState([]),[sku,setSku]=useState('');const load=()=>api.get('/ledger',{params:sku?{sku,limit:100}:{limit:100}}).then(r=>setRows(unwrap(r)||[]));useEffect(load,[]);return <><PageTitle title="Stock Ledger" sub="Every validated receipt, delivery, transfer and adjustment is auditable." action={<button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>}/><section className="panel"><div className="toolbar"><div className="search"><Search size={16}/><input placeholder="Filter by SKU" value={sku} onChange={e=>setSku(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()}/></div></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Type</th><th>Product</th><th>SKU</th><th>Source</th><th>Destination</th><th>Change</th><th>Balance</th><th>Reference</th></tr></thead><tbody>{rows.map(x=><tr key={x._id}><td>{new Date(x.timestamp).toLocaleString()}</td><td>{x.transactionType}</td><td><b>{x.productName}</b></td><td><code>{x.sku}</code></td><td>{x.sourceWarehouse}<small>{x.sourceLocation}</small></td><td>{x.destinationWarehouse}<small>{x.destinationLocation}</small></td><td className={x.quantityDelta<0?'danger':'success'}>{x.quantityDelta>0?'+':''}{x.quantityDelta} {x.uom}</td><td>{x.balanceAfterTransaction}</td><td>{x.referenceNumber}</td></tr>)}</tbody></table></div>{!rows.length&&<Empty text="No ledger entries yet. Validate an operation to create one."/>}</section></>}

function Select({options=[],value,onChange,product=false,required=false}){return <select required={required} value={value} onChange={onChange}><option value="">Select {product?'product':'warehouse'}</option>{options.map(x=><option key={x._id} value={x._id}>{product?`${x.name} (${x.sku})`:x.name}</option>)}</select>}
function Quick({href,icon:Icon,title}){const nav=useNavigate();return <button className="quick" onClick={()=>nav(href)}><Icon size={20}/><span>{title}</span></button>}
function PageTitle({title,sub,action}){return <div className="page-title"><div><h1>{title}</h1><p>{sub}</p></div>{action}</div>}
function PanelHead({title,sub}){return <div className="panel-head"><div><h3>{title}</h3>{sub&&<p>{sub}</p>}</div></div>}
function Status({value}){const c=String(value||'').toLowerCase().replace(/\s+/g,'-');return <span className={`status ${c}`}>{value}</span>}
function Modal({title,close,children}){return <div className="modal-bg"><div className="modal"><div className="panel-head"><h3>{title}</h3><button className="icon-btn" onClick={close}><X size={18}/></button></div>{children}</div></div>}
function Empty({text}){return <div className="empty"><CheckCircle2 size={24}/><span>{text}</span></div>}
function ErrorBox({text}){return <div className="error-box"><AlertTriangle size={16}/>{text}</div>}

createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);
