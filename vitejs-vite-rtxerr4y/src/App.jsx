import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Users,
  ListChecks,
  ClipboardCheck,
  BarChart3,
  Menu,
  X,
  Phone,
  Mail,
  Edit,
  Trash2,
  ChevronRight,
  Dumbbell,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Circle,
  Download,
  Bell,
  MessageCircle,
  LayoutDashboard,
  RefreshCw,
  UserPlus,
  ArrowLeft,
  Power,
} from 'lucide-react';

/* ============================== CONEXIÓN A SUPABASE (vía REST + fetch) ============================== */
// Estos dos valores son públicos (protegidos por Row Level Security en la base de datos).
// En tu proyecto final, muévelos a variables de entorno (.env) por buena práctica.
const SUPABASE_URL = 'https://aftlowmodkiksobqlkku.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdGxvd21vZGtpa3NvYnFsa2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5OTAxMDEsImV4cCI6MjEwMzU2NjEwMX0.VnNm2kSXBVyO0wGdQ_vpZ3vctGTnECcdUfwjMqNX300';

async function sbAuth(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(
      json.error_description || json.msg || 'Usuario o contraseña incorrectos.'
    );
  return json; // { access_token, user: { id, email } }
}

async function sb(path, { method = 'GET', token, body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer || 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ============================== UTILIDADES ============================== */
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso, days) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
};
const diffDays = (fromISO, toISO) =>
  Math.round(
    (new Date(toISO + 'T00:00:00') - new Date(fromISO + 'T00:00:00')) / 86400000
  );
const formatDate = (iso) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-';
const formatMoney = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n || 0);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const digitsOnly = (s) => (s || '').replace(/\D/g, '');
const isInRange = (iso, from, to) => iso >= from && iso <= to;

const STATUS_META = {
  ACTIVA: {
    label: 'Activa',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    icon: CheckCircle2,
  },
  PROXIMA: {
    label: 'Próxima a vencer',
    badge: 'bg-amber-50 text-amber-700 border-amber-300',
    icon: AlertTriangle,
  },
  VENCIDA: {
    label: 'Vencida',
    badge: 'bg-rose-50 text-rose-700 border-rose-300',
    icon: XCircle,
  },
  INACTIVA: {
    label: 'Inactiva',
    badge: 'bg-slate-100 text-slate-500 border-slate-300',
    icon: Circle,
  },
};
function computeStatus(client, today = todayISO()) {
  if (client.desactivado) return 'INACTIVA';
  const d = diffDays(today, client.fecha_vencimiento);
  if (d < 0) return 'VENCIDA';
  if (d <= 7) return 'PROXIMA';
  return 'ACTIVA';
}
function whatsappMessage(type, client, gymName, extra = {}) {
  const nombre = client.nombre.split(' ')[0];
  if (type === 'proximo')
    return `Hola, ${nombre}. Te recordamos que tu membresía de ${gymName} vence el ${formatDate(
      client.fecha_vencimiento
    )}. ¡Te esperamos!`;
  if (type === 'vencida')
    return `Hola, ${nombre}. Tu membresía de ${gymName} venció el ${formatDate(
      client.fecha_vencimiento
    )}. Puedes renovarla cuando gustes. ¡Te esperamos!`;
  if (type === 'confirmacion')
    return `Hola, ${nombre}. Confirmamos tu pago de ${formatMoney(
      extra.valor
    )} en ${gymName}. Tu membresía queda activa hasta el ${formatDate(
      client.fecha_vencimiento
    )}. ¡Gracias!`;
  return `Hola, ${nombre}. ¡Bienvenido(a) a ${gymName}!`;
}
function sendWhatsApp(client, type, gymName, extra) {
  window.open(
    `https://wa.me/57${digitsOnly(client.telefono)}?text=${encodeURIComponent(
      whatsappMessage(type, client, gymName, extra)
    )}`,
    '_blank'
  );
}

/* ============================== COMPONENTES BASE ============================== */
function StatusBadge({ status }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${m.badge}`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {m.label}
    </span>
  );
}
function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">
        {label}
      </p>
      <p
        className={`font-display text-4xl leading-none mt-1 ${
          accent || 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${
          wide ? 'max-w-2xl' : 'max-w-md'
        } max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-display text-2xl text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500';
function PrimaryBtn({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
function GhostBtn({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-lg ${className}`}
    >
      {children}
    </button>
  );
}

/* ============================== APP ============================== */
export default function GymApp() {
  const [session, setSession] = useState(null); // { token, userId, gymId, role, nombre, gymName }
  const [data, setData] = useState({
    plans: [],
    clients: [],
    payments: [],
    attendance: [],
  });
  const [tab, setTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [loadingData, setLoadingData] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const loadAll = async (token) => {
    setLoadingData(true);
    try {
      const [plans, clients, payments, attendance] = await Promise.all([
        sb('plans?select=*&order=nombre', { token }),
        sb('clients?select=*&order=nombre', { token }),
        sb('payments?select=*&order=fecha.desc', { token }),
        sb('attendance?select=*&order=fecha.desc', { token }),
      ]);
      setData({
        plans: plans || [],
        clients: clients || [],
        payments: payments || [],
        attendance: attendance || [],
      });
    } catch (e) {
      showToast('Error cargando datos: ' + e.message);
    }
    setLoadingData(false);
  };

  const handleLogin = async (userSession) => {
    setSession(userSession);
    await loadAll(userSession.token);
  };

  const refresh = () => session && loadAll(session.token);

  if (!session) return <Login onLogin={handleLogin} />;

  const today = todayISO();
  const clientsWithStatus = data.clients.map((c) => ({
    ...c,
    status: computeStatus(c, today),
  }));
  const planById = Object.fromEntries(data.plans.map((p) => [p.id, p]));

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'asistencia', label: 'Control de entrada', icon: ClipboardCheck },
    ...(session.role === 'administrador'
      ? [{ id: 'planes', label: 'Planes', icon: ListChecks }]
      : []),
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Bebas Neue', 'Inter', sans-serif; letter-spacing: 0.02em; }
      `}</style>

      <aside
        className={`fixed md:static z-40 inset-y-0 left-0 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
          <div className="bg-orange-600 rounded-lg p-1.5">
            <Dumbbell size={20} />
          </div>
          <div>
            <p className="font-display text-xl leading-none text-white">
              {session.gymName}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Gestión de gimnasio
            </p>
          </div>
          <button
            className="ml-auto md:hidden text-slate-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => {
                  setTab(n.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={17} /> {n.label}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <p className="px-3 text-xs text-slate-400 mb-2">
            {session.nombre} · {session.role}
          </p>
          <button
            onClick={() => setSession(null)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            className="md:hidden text-slate-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h2 className="font-display text-2xl text-slate-900">
            {NAV.find((n) => n.id === tab)?.label}
          </h2>
          {loadingData && (
            <span className="text-xs text-slate-400">Sincronizando…</span>
          )}
          <div className="ml-auto">
            <NotificationsBell
              clients={clientsWithStatus}
              data={data}
              today={today}
            />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {tab === 'dashboard' && (
            <Dashboard
              data={data}
              clientsWithStatus={clientsWithStatus}
              planById={planById}
              today={today}
              session={session}
              refresh={refresh}
              showToast={showToast}
              setTab={setTab}
            />
          )}
          {tab === 'clientes' && (
            <ClientesView
              data={data}
              clientsWithStatus={clientsWithStatus}
              planById={planById}
              today={today}
              session={session}
              refresh={refresh}
              showToast={showToast}
            />
          )}
          {tab === 'asistencia' && (
            <AsistenciaView
              data={data}
              clientsWithStatus={clientsWithStatus}
              today={today}
              session={session}
              refresh={refresh}
              showToast={showToast}
            />
          )}
          {tab === 'planes' && session.role === 'administrador' && (
            <PlanesView
              data={data}
              session={session}
              refresh={refresh}
              showToast={showToast}
            />
          )}
          {tab === 'reportes' && (
            <ReportesView data={data} planById={planById} />
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}

/* ============================== LOGIN ============================== */
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const auth = await sbAuth(email.trim(), password);
      const token = auth.access_token;
      const profiles = await sb(
        `profiles?id=eq.${auth.user.id}&select=*,gyms(nombre)`,
        { token }
      );
      const profile = profiles?.[0];
      if (!profile)
        throw new Error(
          "Este usuario no está vinculado a ningún gimnasio (falta el insert en 'profiles')."
        );
      onLogin({
        token,
        userId: auth.user.id,
        gymId: profile.gym_id,
        role: profile.role,
        nombre: profile.nombre,
        gymName: profile.gyms?.nombre || 'Gimnasio',
      });
    } catch (err) {
      setError(
        err.message ||
          'No se pudo iniciar sesión. Revisa la consola del navegador para más detalle.'
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700&display=swap');
        .font-display { font-family: 'Bebas Neue', 'Inter', sans-serif; letter-spacing: 0.02em; }
      `}</style>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-orange-600 rounded-2xl p-3 mb-3">
            <Dumbbell size={28} className="text-white" />
          </div>
          <h1 className="font-display text-3xl text-white">
            Sistema de gestión
          </h1>
          <p className="text-slate-400 text-sm">
            Conectado a tu base de datos real
          </p>
        </div>
        <div
          className="bg-white rounded-2xl p-6 shadow-xl"
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        >
          <Field label="Correo">
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Contraseña">
            <input
              className={inputCls}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p className="text-rose-600 text-xs font-medium mb-3">{error}</p>
          )}
          <PrimaryBtn
            type="button"
            onClick={submit}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </PrimaryBtn>
          <p className="text-[11px] text-slate-400 mt-4">
            Usa el correo y contraseña del usuario administrador que creaste en
            Supabase.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================== NOTIFICACIONES ============================== */
function NotificationsBell({ clients, data, today }) {
  const [open, setOpen] = useState(false);
  const proximos = clients.filter((c) => c.status === 'PROXIMA').length;
  const vencidos = clients.filter((c) => c.status === 'VENCIDA').length;
  const asistenciasHoy = data.attendance.filter(
    (a) => a.fecha === today
  ).length;
  const items = [
    proximos > 0 && `🔔 ${proximos} membresía(s) vencen esta semana.`,
    vencidos > 0 && `🔔 ${vencidos} cliente(s) tienen pagos vencidos.`,
    `🔔 Hoy ingresaron ${asistenciasHoy} cliente(s).`,
  ].filter(Boolean);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
      >
        <Bell size={19} />
        {proximos + vencidos > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {proximos + vencidos}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30">
          <p className="text-xs font-bold uppercase text-slate-400 mb-2 px-1">
            Notificaciones
          </p>
          {items.length === 0 ? (
            <p className="text-sm text-slate-400 px-1 py-2">Todo al día 👍</p>
          ) : (
            items.map((t, i) => (
              <p
                key={i}
                className="text-sm text-slate-700 px-1 py-1.5 border-b border-slate-50 last:border-0"
              >
                {t}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ============================== DASHBOARD ============================== */
function Dashboard({
  data,
  clientsWithStatus,
  planById,
  today,
  session,
  refresh,
  showToast,
  setTab,
}) {
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [payClient, setPayClient] = useState(null);
  const [pickOpen, setPickOpen] = useState(false);

  const activos = clientsWithStatus.filter((c) => c.status === 'ACTIVA').length;
  const proximos = clientsWithStatus
    .filter((c) => c.status === 'PROXIMA')
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
  const vencidos = clientsWithStatus
    .filter((c) => c.status === 'VENCIDA')
    .sort((a, b) => b.fecha_vencimiento.localeCompare(a.fecha_vencimiento));
  const monthPrefix = today.slice(0, 7);
  const pagosMes = data.payments.filter(
    (p) => p.fecha.slice(0, 7) === monthPrefix
  );
  const ingresosMes = pagosMes.reduce((s, p) => s + Number(p.valor), 0);
  const asistenciasHoy = data.attendance.filter(
    (a) => a.fecha === today
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setNewClientOpen(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl p-4 flex items-center gap-3 shadow-sm"
        >
          <UserPlus size={22} />
          <div className="text-left">
            <p className="font-semibold text-sm">Registrar cliente</p>
          </div>
        </button>
        <button
          onClick={() => setPickOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl p-4 flex items-center gap-3 shadow-sm"
        >
          <RefreshCw size={22} />
          <div className="text-left">
            <p className="font-semibold text-sm">Registrar pago</p>
          </div>
        </button>
        <button
          onClick={() => setTab('asistencia')}
          className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm"
        >
          <ClipboardCheck size={22} className="text-orange-600" />
          <div className="text-left">
            <p className="font-semibold text-sm">Registrar asistencia</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total clientes" value={data.clients.length} />
        <StatCard label="Activos" value={activos} accent="text-emerald-600" />
        <StatCard
          label="Próximos a vencer"
          value={proximos.length}
          accent="text-amber-600"
        />
        <StatCard
          label="Vencidos"
          value={vencidos.length}
          accent="text-rose-600"
        />
        <StatCard label="Pagos del mes" value={pagosMes.length} />
        <StatCard
          label="Ingresos del mes"
          value={formatMoney(ingresosMes)}
          accent="text-orange-600"
        />
        <StatCard label="Asistencias hoy" value={asistenciasHoy} />
        <StatCard
          label="Inactivos"
          value={
            clientsWithStatus.filter((c) => c.status === 'INACTIVA').length
          }
          accent="text-slate-400"
        />
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600" />
          <h3 className="font-semibold text-sm text-slate-800">
            Pagos próximos a vencer
          </h3>
        </div>
        {proximos.length === 0 ? (
          <p className="text-sm text-slate-400 px-4 py-6 text-center">
            No hay membresías por vencer en 7 días.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 bg-slate-50">
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Vencimiento</th>
                  <th className="px-4 py-2">Días</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {proximos.map((c) => (
                  <tr key={c.id} className="border-t border-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {c.nombre}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatDate(c.fecha_vencimiento)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {diffDays(today, c.fecha_vencimiento)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-2.5 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setPayClient(c)}
                        className="text-xs font-semibold bg-orange-600 text-white px-2.5 py-1.5 rounded-md"
                      >
                        Registrar pago
                      </button>
                      <button
                        onClick={() =>
                          sendWhatsApp(c, 'proximo', session.gymName)
                        }
                        className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md flex items-center gap-1"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <XCircle size={16} className="text-rose-600" />
          <h3 className="font-semibold text-sm text-slate-800">
            Pagos vencidos
          </h3>
        </div>
        {vencidos.length === 0 ? (
          <p className="text-sm text-slate-400 px-4 py-6 text-center">
            No hay membresías vencidas. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {vencidos.map((c) => (
              <li
                key={c.id}
                className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between"
              >
                <span className="text-sm text-slate-700">
                  🔴 <b>{c.nombre}</b> — venció hace{' '}
                  {Math.abs(diffDays(today, c.fecha_vencimiento))} día(s).
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPayClient(c)}
                    className="text-xs font-semibold bg-orange-600 text-white px-2.5 py-1.5 rounded-md"
                  >
                    Registrar pago
                  </button>
                  <button
                    onClick={() => sendWhatsApp(c, 'vencida', session.gymName)}
                    className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md flex items-center gap-1"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {newClientOpen && (
        <ClientForm
          plans={data.plans}
          session={session}
          onClose={() => setNewClientOpen(false)}
          onSaved={() => {
            refresh();
            showToast('Cliente registrado correctamente.');
            setNewClientOpen(false);
          }}
        />
      )}
      {pickOpen && (
        <PickClientModal
          clients={clientsWithStatus}
          onClose={() => setPickOpen(false)}
          onPick={(c) => {
            setPickOpen(false);
            setPayClient(c);
          }}
        />
      )}
      {payClient && (
        <RenewForm
          client={payClient}
          plans={data.plans}
          today={today}
          session={session}
          onClose={() => setPayClient(null)}
          onSaved={() => {
            refresh();
            showToast('Pago registrado y membresía actualizada.');
            setPayClient(null);
          }}
        />
      )}
    </div>
  );
}

function PickClientModal({ clients, onClose, onPick }) {
  const [q, setQ] = useState('');
  const filtered = clients
    .filter((c) =>
      `${c.nombre} ${c.documento} ${c.telefono}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
    .slice(0, 30);
  return (
    <Modal title="Seleccionar cliente" onClose={onClose}>
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          autoFocus
          className={inputCls + ' pl-9'}
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="w-full flex items-center justify-between px-2 py-2.5 hover:bg-slate-50 rounded-lg text-left"
          >
            <span className="text-sm font-medium text-slate-800">
              {c.nombre}
            </span>
            <StatusBadge status={c.status} />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            Sin resultados.
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ============================== CLIENTES ============================== */
function ClientesView({
  data,
  clientsWithStatus,
  planById,
  today,
  session,
  refresh,
  showToast,
}) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [formClient, setFormClient] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [profileId, setProfileId] = useState(null);

  const filtered = clientsWithStatus.filter((c) => {
    const matchQ = `${c.nombre} ${c.documento} ${c.telefono}`
      .toLowerCase()
      .includes(q.toLowerCase());
    const matchF =
      filter === 'Todos' ||
      (filter === 'Activos' && c.status === 'ACTIVA') ||
      (filter === 'Próximos a vencer' && c.status === 'PROXIMA') ||
      (filter === 'Vencidos' && c.status === 'VENCIDA') ||
      (filter === 'Inactivos' && c.status === 'INACTIVA');
    return matchQ && matchF;
  });
  const profile = profileId
    ? clientsWithStatus.find((c) => c.id === profileId)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className={inputCls + ' pl-9'}
            placeholder="Buscar por nombre, documento o teléfono…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={inputCls + ' sm:w-56'}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            'Todos',
            'Activos',
            'Próximos a vencer',
            'Vencidos',
            'Inactivos',
          ].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <PrimaryBtn
          onClick={() => {
            setFormClient(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} /> Nuevo cliente
        </PrimaryBtn>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 bg-slate-50">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Documento</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Vencimiento</th>
                <th className="px-4 py-2">Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-slate-50 hover:bg-slate-50/60 cursor-pointer"
                  onClick={() => setProfileId(c.id)}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {c.nombre}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{c.documento}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {planById[c.plan_id]?.nombre || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {formatDate(c.fecha_vencimiento)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">
                    <ChevronRight size={16} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-400 py-8">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {formOpen && (
        <ClientForm
          plans={data.plans}
          client={formClient}
          session={session}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            refresh();
            showToast(
              formClient ? 'Cliente actualizado.' : 'Cliente registrado.'
            );
            setFormOpen(false);
          }}
        />
      )}
      {profile && (
        <ClientProfile
          client={profile}
          data={data}
          planById={planById}
          today={today}
          session={session}
          onClose={() => setProfileId(null)}
          onEdit={() => {
            setFormClient(profile);
            setFormOpen(true);
            setProfileId(null);
          }}
          refresh={refresh}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function ClientForm({ plans, client, session, onClose, onSaved }) {
  const isEdit = !!client;
  const [nombre, setNombre] = useState(client?.nombre || '');
  const [documento, setDocumento] = useState(client?.documento || '');
  const [telefono, setTelefono] = useState(client?.telefono || '');
  const [correo, setCorreo] = useState(client?.correo || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(
    client?.fecha_nacimiento || ''
  );
  const [direccion, setDireccion] = useState(client?.direccion || '');
  const [fechaIngreso, setFechaIngreso] = useState(
    client?.fecha_ingreso || todayISO()
  );
  const [planId, setPlanId] = useState(client?.plan_id || plans[0]?.id || '');
  const [fechaInicio, setFechaInicio] = useState(
    client?.fecha_inicio || todayISO()
  );
  const [observaciones, setObservaciones] = useState(
    client?.observaciones || ''
  );
  const [payNow, setPayNow] = useState(!isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const plan = plans.find((p) => p.id === planId);
  const fechaVencimiento = plan
    ? addDaysISO(fechaInicio, plan.duracion_dias)
    : fechaInicio;

  const submit = async () => {
    if (!nombre || !documento || !telefono || !planId) {
      setError('Completa los campos obligatorios (*).');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      nombre,
      documento,
      telefono,
      correo,
      fecha_nacimiento: fechaNacimiento || null,
      direccion,
      fecha_ingreso: fechaIngreso,
      plan_id: planId,
      fecha_inicio: fechaInicio,
      fecha_vencimiento: fechaVencimiento,
      observaciones,
    };
    try {
      if (isEdit) {
        await sb(`clients?id=eq.${client.id}`, {
          method: 'PATCH',
          token: session.token,
          body: payload,
        });
      } else {
        const [newClient] = await sb('clients', {
          method: 'POST',
          token: session.token,
          body: { ...payload, gym_id: session.gymId, desactivado: false },
        });
        if (payNow && newClient) {
          await sb('payments', {
            method: 'POST',
            token: session.token,
            body: {
              gym_id: session.gymId,
              client_id: newClient.id,
              fecha: todayISO(),
              valor: plan.precio,
              metodo: 'Efectivo',
              plan_id: plan.id,
              fecha_inicio_cubierto: fechaInicio,
              fecha_vencimiento_nueva: fechaVencimiento,
              observaciones: 'Pago inicial',
            },
          });
        }
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <Modal
      title={isEdit ? 'Editar cliente' : 'Registrar cliente'}
      onClose={onClose}
      wide
    >
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-x-4"
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      >
        <Field label="Nombre completo *">
          <input
            className={inputCls}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </Field>
        <Field label="Número de documento *">
          <input
            className={inputCls}
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            required
          />
        </Field>
        <Field label="Teléfono *">
          <input
            className={inputCls}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="3001234567"
            required
          />
        </Field>
        <Field label="Correo electrónico">
          <input
            className={inputCls}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </Field>
        <Field label="Fecha de nacimiento">
          <input
            className={inputCls}
            type="date"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
          />
        </Field>
        <Field label="Dirección (opcional)">
          <input
            className={inputCls}
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
        </Field>
        <Field label="Fecha de ingreso">
          <input
            className={inputCls}
            type="date"
            value={fechaIngreso}
            onChange={(e) => setFechaIngreso(e.target.value)}
          />
        </Field>
        <Field label="Tipo de membresía *">
          <select
            className={inputCls}
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            required
          >
            {plans
              .filter((p) => p.activo)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {formatMoney(p.precio)}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Fecha de inicio">
          <input
            className={inputCls}
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </Field>
        <Field label="Fecha de vencimiento (automática)">
          <input
            className={inputCls + ' bg-slate-50 text-slate-500'}
            value={formatDate(fechaVencimiento)}
            disabled
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observaciones">
            <textarea
              className={inputCls}
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Field>
        </div>
        {!isEdit && (
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-600 mb-3">
            <input
              type="checkbox"
              checked={payNow}
              onChange={(e) => setPayNow(e.target.checked)}
            />{' '}
            Registrar el pago ahora ({plan ? formatMoney(plan.precio) : '-'})
          </label>
        )}
        {error && (
          <p className="sm:col-span-2 text-rose-600 text-xs">{error}</p>
        )}
        <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
          <GhostBtn type="button" onClick={onClose}>
            Cancelar
          </GhostBtn>
          <PrimaryBtn type="button" onClick={submit} disabled={saving}>
            {saving
              ? 'Guardando…'
              : isEdit
              ? 'Guardar cambios'
              : 'Registrar cliente'}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

function ClientProfile({
  client,
  data,
  planById,
  today,
  session,
  onClose,
  onEdit,
  refresh,
  showToast,
}) {
  const [payOpen, setPayOpen] = useState(false);
  const payments = data.payments
    .filter((p) => p.client_id === client.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const attendance = data.attendance
    .filter((a) => a.client_id === client.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 15);
  const plan = planById[client.plan_id];
  const msgType =
    client.status === 'PROXIMA'
      ? 'proximo'
      : client.status === 'VENCIDA'
      ? 'vencida'
      : 'confirmacion';

  const toggleActive = async () => {
    await sb(`clients?id=eq.${client.id}`, {
      method: 'PATCH',
      token: session.token,
      body: { desactivado: !client.desactivado },
    });
    refresh();
    showToast(
      client.desactivado ? 'Cliente reactivado.' : 'Cliente desactivado.'
    );
  };
  const registerAttendance = async () => {
    await sb('attendance', {
      method: 'POST',
      token: session.token,
      body: {
        gym_id: session.gymId,
        client_id: client.id,
        fecha: today,
        hora_entrada: nowTime(),
      },
    });
    refresh();
    showToast('Asistencia registrada.');
  };

  return (
    <Modal title="Ficha del cliente" onClose={onClose} wide>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-display text-3xl text-slate-900 leading-none">
            {client.nombre}
          </h4>
          <div className="mt-1">
            <StatusBadge status={client.status} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1.5">
          <p className="font-semibold text-slate-700 mb-1">
            Información personal
          </p>
          <p className="text-slate-600">Documento: {client.documento}</p>
          <p className="text-slate-600 flex items-center gap-1">
            <Phone size={12} /> {client.telefono}
          </p>
          {client.correo && (
            <p className="text-slate-600 flex items-center gap-1">
              <Mail size={12} /> {client.correo}
            </p>
          )}
          <p className="text-slate-600">
            Ingreso: {formatDate(client.fecha_ingreso)}
          </p>
          {client.observaciones && (
            <p className="text-slate-500 italic">"{client.observaciones}"</p>
          )}
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1.5">
          <p className="font-semibold text-slate-700 mb-1">Membresía actual</p>
          <p className="text-slate-600">Plan: {plan?.nombre || '-'}</p>
          <p className="text-slate-600">
            Precio: {plan ? formatMoney(plan.precio) : '-'}
          </p>
          <p className="text-slate-600">
            Inicio: {formatDate(client.fecha_inicio)}
          </p>
          <p className="text-slate-600">
            Vence: {formatDate(client.fecha_vencimiento)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        <GhostBtn onClick={onEdit}>
          <Edit size={14} /> Editar
        </GhostBtn>
        <PrimaryBtn onClick={() => setPayOpen(true)}>
          <RefreshCw size={14} /> Registrar pago / Renovar
        </PrimaryBtn>
        <GhostBtn onClick={registerAttendance}>
          <ClipboardCheck size={14} /> Registrar asistencia
        </GhostBtn>
        <GhostBtn
          onClick={() =>
            sendWhatsApp(client, msgType, session.gymName, {
              valor: plan?.precio,
            })
          }
        >
          <MessageCircle size={14} /> Enviar WhatsApp
        </GhostBtn>
        <GhostBtn
          onClick={toggleActive}
          className={
            client.desactivado
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }
        >
          <Power size={14} /> {client.desactivado ? 'Reactivar' : 'Desactivar'}
        </GhostBtn>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="font-semibold text-slate-700 text-sm mb-2">
            Historial de pagos
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {payments.length === 0 && (
              <p className="text-xs text-slate-400">Sin pagos registrados.</p>
            )}
            {payments.map((p) => (
              <div
                key={p.id}
                className="text-xs bg-white border border-slate-100 rounded-lg px-2.5 py-2 flex justify-between"
              >
                <span>
                  {formatDate(p.fecha)} · {p.metodo}
                </span>
                <span className="font-semibold">{formatMoney(p.valor)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="font-semibold text-slate-700 text-sm mb-2">
            Historial de asistencia
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {attendance.length === 0 && (
              <p className="text-xs text-slate-400">
                Sin asistencias registradas.
              </p>
            )}
            {attendance.map((a) => (
              <div
                key={a.id}
                className="text-xs bg-white border border-slate-100 rounded-lg px-2.5 py-2 flex justify-between"
              >
                <span>{formatDate(a.fecha)}</span>
                <span className="text-slate-500">
                  {a.hora_entrada}
                  {a.hora_salida ? ` – ${a.hora_salida}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {payOpen && (
        <RenewForm
          client={client}
          plans={data.plans}
          today={today}
          session={session}
          onClose={() => setPayOpen(false)}
          onSaved={() => {
            refresh();
            showToast('Pago registrado.');
            setPayOpen(false);
          }}
        />
      )}
    </Modal>
  );
}

function RenewForm({ client, plans, today, session, onClose, onSaved }) {
  const [planId, setPlanId] = useState(client.plan_id);
  const [metodo, setMetodo] = useState('Efectivo');
  const [fecha, setFecha] = useState(today);
  const [mode, setMode] = useState(
    diffDays(today, client.fecha_vencimiento) >= 0 ? 'after' : 'now'
  );
  const [saving, setSaving] = useState(false);
  const plan = plans.find((p) => p.id === planId);
  const [valor, setValor] = useState(plan?.precio || 0);
  useEffect(() => {
    setValor(plans.find((p) => p.id === planId)?.precio || 0);
  }, [planId]); // eslint-disable-line

  const base =
    mode === 'after' && client.fecha_vencimiento >= today
      ? client.fecha_vencimiento
      : fecha;
  const nuevaFechaVencimiento = plan
    ? addDaysISO(base, plan.duracion_dias)
    : base;

  const [error, setError] = useState('');
  const submit = async () => {
    if (!plan) return;
    setSaving(true);
    setError('');
    try {
      await sb('payments', {
        method: 'POST',
        token: session.token,
        body: {
          gym_id: session.gymId,
          client_id: client.id,
          fecha,
          valor: Number(valor),
          metodo,
          plan_id: planId,
          fecha_inicio_cubierto: base,
          fecha_vencimiento_nueva: nuevaFechaVencimiento,
        },
      });
      await sb(`clients?id=eq.${client.id}`, {
        method: 'PATCH',
        token: session.token,
        body: {
          plan_id: planId,
          fecha_inicio: base,
          fecha_vencimiento: nuevaFechaVencimiento,
          desactivado: false,
        },
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <Modal title={`Registrar pago — ${client.nombre}`} onClose={onClose}>
      <div
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      >
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 mb-3">
          Vence actualmente:{' '}
          <b className="text-slate-700">
            {formatDate(client.fecha_vencimiento)}
          </b>
        </div>
        <Field label="Plan">
          <select
            className={inputCls}
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            {plans
              .filter((p) => p.activo)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.duracion_dias} días)
                </option>
              ))}
          </select>
        </Field>
        <Field label="Valor pagado">
          <input
            className={inputCls}
            type="number"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </Field>
        <Field label="Método de pago">
          <select
            className={inputCls}
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
          >
            {[
              'Efectivo',
              'Transferencia',
              'Nequi',
              'Daviplata',
              'Tarjeta',
              'Otro',
            ].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha del pago">
          <input
            className={inputCls}
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Field>
        <Field label="La renovación inicia">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('after')}
              className={`flex-1 text-xs font-semibold rounded-lg px-2 py-2 border ${
                mode === 'after'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              Después del vencimiento
            </button>
            <button
              type="button"
              onClick={() => setMode('now')}
              className={`flex-1 text-xs font-semibold rounded-lg px-2 py-2 border ${
                mode === 'now'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              Desde la fecha de pago
            </button>
          </div>
        </Field>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 mb-3">
          Nueva fecha de vencimiento: <b>{formatDate(nuevaFechaVencimiento)}</b>
        </div>
        {error && <p className="text-rose-600 text-xs mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <GhostBtn type="button" onClick={onClose}>
            Cancelar
          </GhostBtn>
          <PrimaryBtn type="button" onClick={submit} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar pago'}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

/* ============================== CONTROL DE ENTRADA ============================== */
function AsistenciaView({
  data,
  clientsWithStatus,
  today,
  session,
  refresh,
  showToast,
}) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [range, setRange] = useState('Hoy');
  const results =
    q.length > 0
      ? clientsWithStatus
          .filter((c) =>
            `${c.nombre} ${c.documento} ${c.telefono}`
              .toLowerCase()
              .includes(q.toLowerCase())
          )
          .slice(0, 6)
      : [];
  const rangeStart =
    range === 'Hoy'
      ? today
      : range === 'Semana'
      ? addDaysISO(today, -7)
      : today.slice(0, 8) + '01';
  const recientes = data.attendance
    .filter((a) => a.fecha >= rangeStart)
    .sort((a, b) =>
      (b.fecha + b.hora_entrada).localeCompare(a.fecha + a.hora_entrada)
    )
    .slice(0, 25);
  const clientById = Object.fromEntries(
    clientsWithStatus.map((c) => [c.id, c])
  );

  const registerEntry = async (client) => {
    await sb('attendance', {
      method: 'POST',
      token: session.token,
      body: {
        gym_id: session.gymId,
        client_id: client.id,
        fecha: today,
        hora_entrada: nowTime(),
      },
    });
    refresh();
    showToast(`Entrada registrada para ${client.nombre}.`);
  };
  const registerExit = async (att) => {
    await sb(`attendance?id=eq.${att.id}`, {
      method: 'PATCH',
      token: session.token,
      body: { hora_salida: nowTime() },
    });
    refresh();
    showToast('Salida registrada.');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <p className="font-display text-2xl text-slate-900 mb-3">
          Control de entrada
        </p>
        <div className="relative mb-3">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            autoFocus
            className={inputCls + ' pl-10 py-3 text-base'}
            placeholder="Buscar cliente por nombre, documento o teléfono…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(null);
            }}
          />
        </div>
        {!selected && results.length > 0 && (
          <div className="divide-y divide-slate-50 border border-slate-100 rounded-lg overflow-hidden mb-2">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left"
              >
                <span className="text-sm font-medium text-slate-800">
                  {c.nombre}
                </span>
                <StatusBadge status={c.status} />
              </button>
            ))}
          </div>
        )}
        {selected && !selected.__renew && (
          <div className="mt-3 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-display text-2xl text-slate-900">
                {selected.nombre}
              </p>
              <button
                onClick={() => {
                  setSelected(null);
                  setQ('');
                }}
                className="text-slate-400"
              >
                <ArrowLeft size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-1 text-sm">
              <StatusBadge status={selected.status} />
              <span className="text-slate-500">
                📅 Vence: {formatDate(selected.fecha_vencimiento)}
              </span>
            </div>
            {selected.status === 'VENCIDA' || selected.status === 'INACTIVA' ? (
              <div className="mt-3">
                <p className="text-rose-600 font-semibold text-sm mb-2">
                  {selected.status === 'VENCIDA'
                    ? 'MEMBRESÍA VENCIDA'
                    : 'CLIENTE INACTIVO'}
                </p>
                <PrimaryBtn
                  onClick={() => setSelected({ ...selected, __renew: true })}
                  className="w-full"
                >
                  Renovar membresía
                </PrimaryBtn>
              </div>
            ) : (
              <PrimaryBtn
                onClick={() => registerEntry(selected)}
                className="w-full mt-3 py-3 text-base"
              >
                Registrar entrada
              </PrimaryBtn>
            )}
          </div>
        )}
        {selected?.__renew && (
          <RenewForm
            client={selected}
            plans={data.plans}
            today={today}
            session={session}
            onClose={() => setSelected({ ...selected, __renew: false })}
            onSaved={() => {
              refresh();
              showToast('Membresía renovada.');
              setSelected(null);
              setQ('');
            }}
          />
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-800">
            Asistencias recientes
          </h3>
          <div className="flex gap-1">
            {['Hoy', 'Semana', 'Mes'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                  range === r
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
          {recientes.map((a) => (
            <li
              key={a.id}
              className="px-4 py-2.5 flex items-center justify-between text-sm"
            >
              <span className="font-medium text-slate-700">
                {clientById[a.client_id]?.nombre || 'Cliente'}
              </span>
              <span className="text-slate-500">
                {formatDate(a.fecha)} · {a.hora_entrada}
                {a.hora_salida ? ` – ${a.hora_salida}` : ''}
              </span>
              {!a.hora_salida && a.fecha === today && (
                <button
                  onClick={() => registerExit(a)}
                  className="text-xs font-semibold text-orange-600 hover:underline"
                >
                  Registrar salida
                </button>
              )}
            </li>
          ))}
          {recientes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              Sin asistencias en este rango.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}

/* ============================== PLANES ============================== */
function PlanesView({ data, session, refresh, showToast }) {
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const toggleActive = async (p) => {
    await sb(`plans?id=eq.${p.id}`, {
      method: 'PATCH',
      token: session.token,
      body: { activo: !p.activo },
    });
    refresh();
  };
  const remove = async (p) => {
    if (data.clients.some((c) => c.plan_id === p.id)) {
      showToast('No se puede eliminar: tiene clientes asociados.');
      return;
    }
    await sb(`plans?id=eq.${p.id}`, { method: 'DELETE', token: session.token });
    refresh();
    showToast('Plan eliminado.');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PrimaryBtn
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} /> Nuevo plan
        </PrimaryBtn>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.plans.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-xl border p-4 shadow-sm ${
              p.activo ? 'border-slate-200' : 'border-slate-100 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-display text-2xl text-slate-900">{p.nombre}</p>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  p.activo
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {p.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-orange-600 font-bold text-lg">
              {formatMoney(p.precio)}
            </p>
            <p className="text-xs text-slate-500 mb-2">
              {p.duracion_dias} días de duración
            </p>
            <p className="text-sm text-slate-600 mb-3">{p.descripcion}</p>
            <div className="flex gap-1.5">
              <GhostBtn
                className="flex-1 py-1.5"
                onClick={() => {
                  setEditing(p);
                  setFormOpen(true);
                }}
              >
                <Edit size={13} /> Editar
              </GhostBtn>
              <GhostBtn className="py-1.5" onClick={() => toggleActive(p)}>
                <Power size={13} />
              </GhostBtn>
              <GhostBtn
                className="py-1.5 text-rose-600 bg-rose-50"
                onClick={() => remove(p)}
              >
                <Trash2 size={13} />
              </GhostBtn>
            </div>
          </div>
        ))}
      </div>
      {formOpen && (
        <PlanForm
          plan={editing}
          session={session}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            refresh();
            showToast('Plan guardado.');
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

function PlanForm({ plan, session, onClose, onSaved }) {
  const [nombre, setNombre] = useState(plan?.nombre || '');
  const [duracionDias, setDuracionDias] = useState(plan?.duracion_dias || 30);
  const [precio, setPrecio] = useState(plan?.precio || 0);
  const [descripcion, setDescripcion] = useState(plan?.descripcion || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!nombre || !duracionDias || !precio) {
      setError('Completa los campos obligatorios (*).');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      nombre,
      duracion_dias: Number(duracionDias),
      precio: Number(precio),
      descripcion,
    };
    try {
      if (plan)
        await sb(`plans?id=eq.${plan.id}`, {
          method: 'PATCH',
          token: session.token,
          body: payload,
        });
      else
        await sb('plans', {
          method: 'POST',
          token: session.token,
          body: { ...payload, gym_id: session.gymId, activo: true },
        });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <Modal title={plan ? 'Editar plan' : 'Nuevo plan'} onClose={onClose}>
      <div
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      >
        <Field label="Nombre *">
          <input
            className={inputCls}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </Field>
        <Field label="Duración (días) *">
          <input
            className={inputCls}
            type="number"
            value={duracionDias}
            onChange={(e) => setDuracionDias(e.target.value)}
            required
          />
        </Field>
        <Field label="Precio *">
          <input
            className={inputCls}
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />
        </Field>
        <Field label="Descripción">
          <textarea
            className={inputCls}
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Field>
        {error && <p className="text-rose-600 text-xs mb-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <GhostBtn type="button" onClick={onClose}>
            Cancelar
          </GhostBtn>
          <PrimaryBtn type="button" onClick={submit} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar plan'}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

/* ============================== REPORTES ============================== */
function ReportesView({ data, planById }) {
  const [from, setFrom] = useState(todayISO().slice(0, 8) + '01');
  const [to, setTo] = useState(todayISO());
  const pagos = data.payments.filter((p) => isInRange(p.fecha, from, to));
  const total = pagos.reduce((s, p) => s + Number(p.valor), 0);
  const asistencias = data.attendance.filter((a) =>
    isInRange(a.fecha, from, to)
  );
  const nuevos = data.clients.filter((c) =>
    isInRange(c.fecha_ingreso, from, to)
  );
  const byMetodo = {};
  pagos.forEach((p) => {
    byMetodo[p.metodo] = (byMetodo[p.metodo] || 0) + Number(p.valor);
  });
  const byPlan = {};
  pagos.forEach((p) => {
    const n = planById[p.plan_id]?.nombre || '—';
    byPlan[n] = (byPlan[n] || 0) + Number(p.valor);
  });

  const exportCSV = () => {
    const header = 'Fecha,Cliente,Plan,Valor,Metodo\n';
    const rows = pagos
      .map(
        (p) =>
          `${p.fecha},"${
            data.clients.find((c) => c.id === p.client_id)?.nombre || ''
          }",${planById[p.plan_id]?.nombre || ''},${p.valor},${p.metodo}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagos_${from}_a_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Bar = ({ label, value, max }) => (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-500">{formatMoney(value)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-600 rounded-full"
          style={{ width: `${max ? (value / max) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
  const maxMetodo = Math.max(1, ...Object.values(byMetodo));
  const maxPlan = Math.max(1, ...Object.values(byPlan));

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <Field label="Desde">
          <input
            className={inputCls}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Hasta">
          <input
            className={inputCls}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <PrimaryBtn onClick={exportCSV} className="mb-3">
          <Download size={15} /> Exportar CSV
        </PrimaryBtn>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Ingresos del rango"
          value={formatMoney(total)}
          accent="text-orange-600"
        />
        <StatCard label="Pagos registrados" value={pagos.length} />
        <StatCard label="Asistencias" value={asistencias.length} />
        <StatCard label="Clientes nuevos" value={nuevos.length} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="font-semibold text-sm text-slate-800 mb-3">
            Ingresos por método de pago
          </p>
          {Object.entries(byMetodo).length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos.</p>
          ) : (
            Object.entries(byMetodo)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={maxMetodo} />
              ))
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="font-semibold text-sm text-slate-800 mb-3">
            Ingresos por tipo de membresía
          </p>
          {Object.entries(byPlan).length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos.</p>
          ) : (
            Object.entries(byPlan)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={maxPlan} />
              ))
          )}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-sm text-slate-800">
            Pagos en el rango
          </h3>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 bg-slate-50 sticky top-0">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Método</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {pagos
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((p) => (
                  <tr key={p.id} className="border-t border-slate-50">
                    <td className="px-4 py-2 text-slate-600">
                      {formatDate(p.fecha)}
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {data.clients.find((c) => c.id === p.client_id)?.nombre}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {planById[p.plan_id]?.nombre}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{p.metodo}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800">
                      {formatMoney(p.valor)}
                    </td>
                  </tr>
                ))}
              {pagos.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-8">
                    Sin pagos en este rango.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
