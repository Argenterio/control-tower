import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  timeout: 10000,
  headers: { "Content-Type": "application/json" }
})

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
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

export default api
