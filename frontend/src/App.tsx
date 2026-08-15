import React, { useEffect, useState } from "react"
import "./App.css"
import api from "./api"

type Company = { id: string; name: string; status: string }
type Trip = { id: string; origin: string; destination: string; status: string }
type User = { id: string; name: string; role: string }

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="app">
      <header>
        <h1>🚀 Control Tower - Dashboard</h1>
        <p>Plataforma SaaS para Empresas de Transporte de Cargas</p>
      </header>

      <main className="container">
        <section className="card">
          <h2>📊 Empresas ({companies.length})</h2>
          <ul>
            {companies.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>🚐 Viajes Activos ({trips.length})</h2>
          <ul>
            {trips.map((t) => (
              <li key={t.id}>
                {t.origin} → {t.destination} ({t.status})
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>👥 Usuarios ({users.length})</h2>
          <ul>
            {users.map((u) => (
              <li key={u.id}>{u.name} - {u.role}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}