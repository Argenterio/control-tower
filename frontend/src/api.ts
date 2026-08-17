import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.PROD ? "https://api.generarise.space" : (import.meta.env.VITE_API_URL || "http://localhost:3000"),
  timeout: 10000,
  headers: { "Content-Type": "application/json" }
})

const TOKEN_KEY = "ct_token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  companyId?: string
  lastLogin?: string
}

export interface Company {
  id: string
  name: string
  status: string
}

export interface Trip {
  id: string
  origin: string
  destination: string
  status: string
  companyId?: string
  vehicleId?: string
}

export interface User {
  id: string
  name: string
  role: string
  companyId?: string
}

export interface TripFilters {
  status?: string
  vehicleId?: string
}

export const apiCompanies = {
  getAll: () => api.get<ApiResponse<Company[]>>("/api/companies").then((res) => res.data)
}

export const apiTrips = {
  getAll: (companyId?: string, filters?: TripFilters) => {
    let url = "/api/trips?companyId=" + (companyId || "")
    if (filters?.status) url += "&status=" + filters.status
    if (filters?.vehicleId) url += "&vehicleId=" + filters.vehicleId
    return api.get<ApiResponse<Trip[]>>(url).then((res) => res.data)
  }
}

export const apiUsers = {
  getAll: () => api.get<ApiResponse<User[]>>("/api/users").then((res) => res.data)
}

export const apiAuth = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<LoginResponse>>("/api/auth/login", { email, password }).then((res) => res.data),
  me: () => api.get<ApiResponse<AuthUser>>("/api/auth/me").then((res) => res.data)
}

export default api
