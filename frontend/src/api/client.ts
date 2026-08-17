// API Client for Control Tower
// Handles authentication, requests, and error handling

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type {
  ApiResponse, AuthResponse, Company, User, Vehicle, Driver,
  Customer, Trip, DashboardSummary
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.generarise.space';

class ApiClient {
  private http: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.http = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('ct_token');

    // Request interceptor: add auth header
    this.http.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor: handle 401
    this.http.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<never>>) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('ct_token', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('ct_token');
    localStorage.removeItem('ct_user');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // === AUTH ===
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await this.http.post<ApiResponse<AuthResponse>>('/api/auth/login', { email, password });
      if (res.data.success && res.data.data) {
        this.setToken(res.data.data.token);
        localStorage.setItem('ct_user', JSON.stringify(res.data.data.user));
        return res.data.data;
      }
      throw new Error(res.data.error || 'Credenciales inválidas');
    } catch (err: any) {
      const msg = err.response?.data?.error || (err.message === 'Network Error' ? 'Error de conexión al servidor (verificá que la API esté desplegada)' : err.message);
      throw new Error(msg);
    }
  }

  async getMe(): Promise<User> {
    const res = await this.http.get<ApiResponse<User>>('/api/auth/me');
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Failed to get user');
  }

  // === COMPANIES ===
  async getCompanies(): Promise<Company[]> {
    const res = await this.http.get<ApiResponse<Company[]>>('/api/companies');
    return res.data.data || [];
  }

  async getCompany(id: string): Promise<Company> {
    const res = await this.http.get<ApiResponse<Company>>(`/api/companies/${id}`);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Company not found');
  }

  async createCompany(data: Partial<Company>): Promise<Company> {
    const res = await this.http.post<ApiResponse<Company>>('/api/companies', data);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Failed to create company');
  }

  // === VEHICLES ===
  async getVehicles(companyId: string): Promise<Vehicle[]> {
    const res = await this.http.get<ApiResponse<Vehicle[]>>('/api/vehicles', {
      params: { companyId }
    });
    return res.data.data || [];
  }

  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    const res = await this.http.post<ApiResponse<Vehicle>>('/api/vehicles', data);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Failed to create vehicle');
  }

  // === DRIVERS ===
  async getDrivers(companyId: string): Promise<Driver[]> {
    const res = await this.http.get<ApiResponse<Driver[]>>('/api/drivers', {
      params: { companyId }
    });
    return res.data.data || [];
  }

  async createDriver(data: Partial<Driver>): Promise<Driver> {
    const res = await this.http.post<ApiResponse<Driver>>('/api/drivers', data);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Failed to create driver');
  }

  // === CUSTOMERS ===
  async getCustomers(companyId: string): Promise<Customer[]> {
    const res = await this.http.get<ApiResponse<Customer[]>>('/api/customers', {
      params: { companyId }
    });
    return res.data.data || [];
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const res = await this.http.post<ApiResponse<Customer>>('/api/customers', data);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Failed to create customer');
  }

  // === TRIPS ===
  async getTrips(companyId: string, filters?: { status?: string; vehicleId?: string }): Promise<Trip[]> {
    const res = await this.http.get<ApiResponse<Trip[]>>('/api/trips', {
      params: { companyId, ...filters }
    });
    return res.data.data || [];
  }

  async createTrip(data: Partial<Trip>): Promise<Trip> {
    const res = await this.http.post<ApiResponse<Trip>>('/api/trips', data);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Failed to create trip');
  }

  // === DASHBOARD ===
  async getDashboardSummary(companyId: string): Promise<DashboardSummary> {
    const res = await this.http.get<ApiResponse<DashboardSummary>>('/api/dashboard/summary', {
      params: { companyId }
    });
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Failed to get dashboard summary');
  }

  // === WHATSAPP ===
  async sendWhatsappMessage(phone: string, message: string, driverId?: string, tripId?: string): Promise<{ success: boolean; message: string }> {
    const res = await this.http.post<ApiResponse<any>>('/api/whatsapp/send', {
      phone,
      message,
      driverId,
      tripId
    });
    if (res.data.success) return { success: true, message: res.data.message || 'Mensaje enviado' };
    throw new Error(res.data.error || 'Error al enviar mensaje');
  }

  async getWhatsappMessages(companyId: string): Promise<any[]> {
    const res = await this.http.get<ApiResponse<any[]>>('/api/whatsapp/messages', {
      params: { companyId }
    });
    if (res.data.success && res.data.data) return res.data.data;
    return [];
  }

  // === MAINTENANCE ===
  async getMaintenance(companyId: string): Promise<any[]> {
    const res = await this.http.get<ApiResponse<any[]>>('/api/maintenance', {
      params: { companyId }
    });
    if (res.data.success && res.data.data) return res.data.data;
    return [];
  }

  async createMaintenance(data: any): Promise<any> {
    const res = await this.http.post<ApiResponse<any>>('/api/maintenance', data);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Error al registrar orden de mantenimiento');
  }

  // === DOCUMENTS ===
  async getDocuments(companyId: string): Promise<any[]> {
    const res = await this.http.get<ApiResponse<any[]>>('/api/documents', {
      params: { companyId }
    });
    if (res.data.success && res.data.data) return res.data.data;
    return [];
  }

  async createDocument(data: any): Promise<any> {
    const res = await this.http.post<ApiResponse<any>>('/api/documents', data);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Error al cargar documento');
  }

  // === FUEL / COMBUSTIBLE ===
  async getFuelEntries(companyId: string): Promise<any[]> {
    const res = await this.http.get<ApiResponse<any[]>>('/api/fuel', {
      params: { companyId }
    });
    if (res.data.success && res.data.data) return res.data.data;
    return [];
  }

  async createFuelEntry(data: any): Promise<any> {
    const res = await this.http.post<ApiResponse<any>>('/api/fuel', data);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Error al cargar ticket de combustible');
  }

  // === AI COPILOT ===
  async askAiCopilot(companyId: string, question: string): Promise<{ answer: string; sources?: any }> {
    const res = await this.http.post<ApiResponse<{ answer: string; sources?: any }>>('/api/ai/chat', {
      companyId,
      question
    });
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.error || 'Error al consultar al copiloto IA');
  }

  // === HEALTH ===
  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.http.get('/health');
      return res.data?.data?.status === 'ok';
    } catch {
      return false;
    }
  }
}

// Singleton export
export const api = new ApiClient();
export default api;
