import { useEffect, useState, type FormEvent } from "react"
import "./App.css"
import {
  apiCompanies,
  apiTrips,
  apiUsers,
  apiAuth,
  getToken,
  setToken,
  type Company,
  type Trip,
  type User,
  type AuthUser,
} from "./api"

type View = "dashboard" | "companies" | "trips" | "users"

const statusClass: Record<string, string> = {
  active: "badge badge-green",
  inactive: "badge badge-gray",
  completed: "badge badge-blue",
  cancelled: "badge badge-red",
  in_progress: "badge badge-blue",
  pending: "badge badge-orange",
}

function statusBadge(status?: string) {
  if (!status) return <span className="badge badge-gray">—</span>
  return <span className={statusClass[status] || "badge badge-gray"}>{status}</span>
}

export default function App() {
  const [view, setView] = useState<View>("dashboard")
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setAuthLoading(false)
      return
    }
    apiAuth
      .me()
      .then((res) => {
        if (res.data) setAuthUser(res.data)
        else setToken(null)
      })
      .catch(() => setToken(null))
      .finally(() => setAuthLoading(false))
  }, [])

  const handleLogin = (email: string, password: string) => {
    return apiAuth.login(email, password).then((res) => {
      if (res.data) {
        setToken(res.data.token)
        setAuthUser(res.data.user)
      }
      return res
    })
  }

  const handleLogout = () => {
    setToken(null)
    setAuthUser(null)
  }

  useEffect(() => {
    if (!authUser) return
    const loadData = async () => {
      try {
        const [c, t, u] = await Promise.all([
          apiCompanies.getAll(),
          apiTrips.getAll(),
          apiUsers.getAll(),
        ])
        setCompanies(c.data || [])
        setTrips(t.data || [])
        setUsers(u.data || [])
      } catch (err) {
        console.error("Error loading data:", err)
        setError("No se pudieron cargar los datos de la API.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [authUser])

  const activeTrips = trips.filter((t) => t.status === "in_progress" || t.status === "pending").length
  const activeCompanies = companies.filter((c) => c.status === "active").length
  const admins = users.filter((u) => u.role === "admin").length

  if (authLoading) {
    return (
      <div className="loader-screen">
        <img src="/logo.png" alt="Control Tower" className="loader-logo" />
        <div className="spinner" />
        <p>Cargando sesión…</p>
      </div>
    )
  }

  if (!authUser) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (loading) {
    return (
      <div className="loader-screen">
        <img src="/logo.png" alt="Control Tower" className="loader-logo" />
        <div className="spinner" />
        <p>Cargando datos…</p>
      </div>
    )
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="Control Tower logo" />
          <span>Control Tower</span>
        </div>
        <nav className="nav">
          <button className={view === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setView("dashboard")}>
            <span className="nav-icon">◈</span> Dashboard
          </button>
          <button className={view === "companies" ? "nav-item active" : "nav-item"} onClick={() => setView("companies")}>
            <span className="nav-icon">🏢</span> Empresas
            <span className="nav-count">{companies.length}</span>
          </button>
          <button className={view === "trips" ? "nav-item active" : "nav-item"} onClick={() => setView("trips")}>
            <span className="nav-icon">🚚</span> Viajes
            <span className="nav-count">{trips.length}</span>
          </button>
          <button className={view === "users" ? "nav-item active" : "nav-item"} onClick={() => setView("users")}>
            <span className="nav-icon">👤</span> Usuarios
            <span className="nav-count">{users.length}</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          API conectada
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">
              {view === "dashboard" && "Dashboard"}
              {view === "companies" && "Empresas"}
              {view === "trips" && "Viajes"}
              {view === "users" && "Usuarios"}
            </h1>
            <p className="page-subtitle">Plataforma SaaS para Empresas de Transporte de Cargas</p>
          </div>
          <div className="user-menu">
            <div className="avatar" aria-hidden="true">
              {authUser.name ? authUser.name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="user-info">
              <span className="user-name">{authUser.name}</span>
              <span className="user-role">{authUser.role}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">Salir</button>
          </div>
        </header>

        {error && <div className="alert">{error}</div>}

        {view === "dashboard" && (
          <>
            <section className="kpis">
              <div className="kpi-card">
                <span className="kpi-label">Empresas activas</span>
                <span className="kpi-value">{activeCompanies}</span>
                <span className="kpi-sub">de {companies.length} totales</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Viajes en curso</span>
                <span className="kpi-value">{activeTrips}</span>
                <span className="kpi-sub">de {trips.length} totales</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Usuarios</span>
                <span className="kpi-value">{users.length}</span>
                <span className="kpi-sub">{admins} administradores</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Tasa de éxito</span>
                <span className="kpi-value">
                  {trips.length > 0
                    ? Math.round((trips.filter((t) => t.status === "completed").length / trips.length) * 100) + "%"
                    : "—"}
                </span>
                <span className="kpi-sub">viajes completados</span>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Viajes recientes</h2>
                <button className="link-btn" onClick={() => setView("trips")}>Ver todos →</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.slice(0, 5).map((t) => (
                      <tr key={t.id}>
                        <td>{t.origin}</td>
                        <td>{t.destination}</td>
                        <td>{statusBadge(t.status)}</td>
                      </tr>
                    ))}
                    {trips.length === 0 && (
                      <tr><td colSpan={3} className="empty">Sin viajes registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {view === "companies" && (
          <section className="panel">
            <div className="panel-header">
              <h2>Todas las empresas</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{statusBadge(c.status)}</td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr><td colSpan={2} className="empty">Sin empresas registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "trips" && (
          <section className="panel">
            <div className="panel-header">
              <h2>Todos los viajes</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr key={t.id}>
                      <td>{t.origin}</td>
                      <td>{t.destination}</td>
                      <td>{statusBadge(t.status)}</td>
                    </tr>
                  ))}
                  {trips.length === 0 && (
                    <tr><td colSpan={3} className="empty">Sin viajes registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "users" && (
          <section className="panel">
            <div className="panel-header">
              <h2>Todos los usuarios</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{statusBadge(u.role)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={2} className="empty">Sin usuarios registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }> }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    onLogin(email, password)
      .then((res) => {
        if (!res.success) setError(res.error || "Error al iniciar sesión")
      })
      .catch(() => setError("No se pudo conectar con la API."))
      .finally(() => setBusy(false))
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <img src="/logo.png" alt="Control Tower logo" className="login-logo" />
        <h1>Control Tower</h1>
        <p className="login-sub">Ingresá a la plataforma de gestión de transporte</p>
        {error && <div className="alert">{error}</div>}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@controltower.com"
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="login-btn" disabled={busy}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  )
}
