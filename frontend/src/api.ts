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

export const apiCompanies = {
  getAll: () => api.get<ApiResponse<any[]>>("/api/companies").then((res) => res.data)
}

export const apiTrips = {
  getAll: (companyId?, filters?) => {
    let url = "/api/trips?companyId=" + (companyId || "")
    if (filters?.status) url += "&status=" + filters.status
    if (filters?.vehicleId) url += "&vehicleId=" + filters.vehicleId
    return api.get<ApiResponse<any[]>>(url).then((res) => res.data)
  }
}

export const apiUsers = {
  getAll: () => api.get<ApiResponse<any[]>>("/api/users").then((res) => res.data)
}

export default api