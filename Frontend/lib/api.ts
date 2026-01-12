import type { User, Complaint } from "./mock-data"
import type { UserRole } from "./constants"

// API Configuration
const API_BASE_URL = typeof window !== 'undefined'
  ? '' // In browser, use relative URLs (will be proxied by Next.js rewrites)
  : process.env.BACKEND_URL || "http://127.0.0.1:8000" // Server-side: use env var or fallback

// Types for API responses
interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
}

interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequest {
  email: string
  password: string
  name: string
  role: UserRole
  department?: string
  student_id?: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

interface ComplaintCreateRequest {
  title: string
  description: string
  is_anonymous?: boolean
  voice_text?: string
  category?: string
}

interface ComplaintUpdateRequest {
  status?: string
  response_text?: string
  assigned_to?: string
}

// API Client Class
class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token")
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    try {
      console.log(`[API Request] Method: ${options.method || 'GET'} URL: ${url}`)
      if (options.body) console.log("Body:", options.body)

      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors',
        cache: 'no-store',
      })

      const data = await response.json()

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
        throw new Error("Not authenticated. Please log in again.")
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  // Auth methods
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const response = await this.request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })

    if (response.success && response.data.access_token) {
      this.setToken(response.data.access_token)
    }

    return response.data
  }

  async register(userData: RegisterRequest): Promise<TokenResponse> {
    const response = await this.request<TokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })

    if (response.success && response.data.access_token) {
      this.setToken(response.data.access_token)
    }

    return response.data
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<User>("/api/auth/me")
    return response.data
  }

  async uploadProfilePhoto(file: File): Promise<void> {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(`${this.baseURL}/api/auth/upload-profile-photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || "Upload failed")
    }
  }

  private transformComplaint(data: any): Complaint {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.status,
      isAnonymous: data.is_anonymous,
      studentId: data.student_id,
      studentName: data.student_name,
      studentEmail: data.student_email,
      assignedTo: data.assigned_to,
      assignedToName: data.assigned_to_name,
      attachments: data.attachments || [],
      evidenceTags: data.evidence_tags || [],
      aiAnalysis: {
        sentiment: data.sentiment,
        suggestedCategory: data.category,
        suggestedPriority: data.priority,
        isDuplicate: false,
        foulLanguageSeverity: data.foul_language_severity,
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      resolvedAt: data.resolved_at,
      feedback: data.feedback,
      timeline: (data.timeline || []).map((t: any) => ({
        timestamp: t.timestamp,
        action: t.action || t.note || t.status,
        by: t.by || t.updated_by || t.responder_name || "System",
        note: t.note,
        status: t.status
      }))
    } as Complaint
  }

  // Complaint methods
  async getComplaints(): Promise<Complaint[]> {
    const response = await this.request<any[]>("/api/complaints")
    const list = response.data || []
    return list.map(item => this.transformComplaint(item))
  }

  async getUsers(role?: string): Promise<any[]> {
    const qs = role ? `?role=${encodeURIComponent(role)}` : ""
    const response = await this.request<any[]>(`/api/users${qs}`)
    return response.data
  }

  async getComplaint(id: string): Promise<Complaint> {
    const response = await this.request<any>(`/api/complaints/${id}`)
    const data = response.data || response
    return this.transformComplaint(data)
  }

  async createComplaint(complaintData: ComplaintCreateRequest): Promise<Complaint> {
    const response = await this.request<any>("/api/complaints", {
      method: "POST",
      body: JSON.stringify(complaintData),
    })
    const data = response.data || response
    return this.transformComplaint(data)
  }

  async updateComplaint(id: string, updateData: ComplaintUpdateRequest): Promise<Complaint> {
    const response = await this.request<any>(`/api/complaints/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    })
    const data = response.data || response
    return this.transformComplaint(data)
  }

  async supportComplaint(id: string): Promise<{ support_count: number; user_supported: boolean }> {
    const response = await this.request<{ support_count: number; user_supported: boolean }>(
      `/api/complaints/${id}/support`,
      {
        method: "POST",
      }
    )
    return response.data
  }

  async deleteComplaint(id: string, confirm: boolean = true): Promise<void> {
    await this.request(`/api/complaints/${id}?confirm=${confirm}`, {
      method: "DELETE",
    })
  }

  /**
   * Subscribe to real-time complaint updates using polling.
   * Returns an unsubscribe function to stop polling.
   */
  subscribeToComplaints(
    callback: (complaints: Complaint[]) => void,
    intervalMs: number = 5000
  ): () => void {
    let isActive = true
    let timeoutId: NodeJS.Timeout | null = null

    const poll = async () => {
      if (!isActive) return

      try {
        const complaints = await this.getComplaints()
        if (isActive) {
          callback(complaints)
        }
      } catch (error) {
        console.error("Polling error:", error)
      }

      if (isActive) {
        timeoutId = setTimeout(poll, intervalMs)
      }
    }

    // Start polling
    poll()

    // Return unsubscribe function
    return () => {
      isActive = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  /**
   * Subscribe to a single complaint's updates using polling.
   * Returns an unsubscribe function to stop polling.
   */
  subscribeToComplaint(
    id: string,
    callback: (complaint: Complaint | null) => void,
    onNotFound?: () => void,
    intervalMs: number = 5000
  ): () => void {
    let isActive = true
    let timeoutId: NodeJS.Timeout | null = null

    const poll = async () => {
      if (!isActive) return

      try {
        const complaint = await this.getComplaint(id)
        if (isActive) {
          callback(complaint)
        }
      } catch (error: any) {
        // Check if complaint was deleted (404)
        const errorMsg = error?.message?.toLowerCase() || ""
        if (errorMsg.includes("404") || errorMsg.includes("not found")) {
          if (isActive && onNotFound) {
            onNotFound()
          }
          return // Stop polling if not found
        }
        console.error("Polling error:", error)
      }

      if (isActive) {
        timeoutId = setTimeout(poll, intervalMs)
      }
    }

    // Start polling
    poll()

    // Return unsubscribe function
    return () => {
      isActive = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  async updateComplaintStatus(
    id: string,
    status: string,
    remarks: string
  ): Promise<void> {
    await this.request(`/api/complaints/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status, remarks }),
    })
  }

  async transcribeAudio(audioBase64: string): Promise<{ text: string }> {
    const response = await this.request<any>("/api/complaints/transcribe", {
      method: "POST",
      body: JSON.stringify({ audio_base64: audioBase64 }),
    })
    return response.data || response
  }

  // Analytics methods
  async getAnalyticsOverview(): Promise<{
    total_complaints: number
    resolved_complaints: number
    pending_complaints: number
    resolution_rate: number
    by_category: Record<string, number>
    by_priority: Record<string, number>
    by_sentiment: Record<string, number>
  }> {
    const response = await this.request<{
      total_complaints: number
      resolved_complaints: number
      pending_complaints: number
      resolution_rate: number
      by_category: Record<string, number>
      by_priority: Record<string, number>
      by_sentiment: Record<string, number>
    }>("/api/analytics/overview")
    return response.data
  }

  async getStaffPerformance(): Promise<
    Array<{
      staff_id: string
      staff_name: string
      total_complaints: number
      resolved_complaints: number
      pending_complaints: number
      resolution_rate: number
    }>
  > {
    const response = await this.request<
      Array<{
        staff_id: string
        staff_name: string
        total_complaints: number
        resolved_complaints: number
        pending_complaints: number
        resolution_rate: number
      }>
    >("/api/analytics/staff-performance")
    return response.data
  }

  // Token management
  setToken(token: string | null) {
    this.token = token
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("auth_token", token)
      } else {
        localStorage.removeItem("auth_token")
      }
    }
  }

  clearToken() {
    this.setToken(null)
  }

  getToken(): string | null {
    return this.token
  }

  isAuthenticated(): boolean {
    return !!this.token
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL)

// Export types
export type { ApiResponse, LoginRequest, RegisterRequest, TokenResponse, ComplaintCreateRequest, ComplaintUpdateRequest }
