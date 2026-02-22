import type { User, Complaint } from "./mock-data"
import type { UserRole } from "./constants"

// API Configuration - Production Ready for Render Deployment
const API_BASE_URL = (() => {
  // Server-side rendering
  if (typeof window === 'undefined') {
    return process.env.BACKEND_URL || "https://campus-voice-backend-82u6.onrender.com";
  }

  // Client-side (browser) - Use NEXT_PUBLIC_ env var or production URL
  return process.env.NEXT_PUBLIC_API_URL || "https://campus-voice-backend-82u6.onrender.com";
})();

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
  staff_role?: string
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

  // Create user (admin only) - uses existing register endpoint
  async createUser(userData: RegisterRequest): Promise<any> {
    const response = await this.request<any>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
    // Don't set token - admin is creating for another user
    return response.data
  }

  // Delete user (admin only)
  async deleteUser(userId: string): Promise<void> {
    await this.request(`/api/users/${userId}`, {
      method: "DELETE",
    })
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

  /**
   * Get eligible staff members for assignment to a complaint.
   * Excludes staff members mentioned in the complaint (conflict of interest).
   */
  async getEligibleStaff(complaintId: string): Promise<{
    staff: Array<{ id: string; name: string; department?: string }>;
    excluded_count: number;
    excluded_names: string[];
  }> {
    const response = await this.request<{
      staff: Array<{ id: string; name: string; department?: string }>;
      excluded_count: number;
      excluded_names: string[];
    }>(`/api/complaints/${complaintId}/eligible-staff`)
    return response.data
  }

  // Analytics methods
  async getAnalyticsOverview(): Promise<{
    total_complaints: number
    resolved_complaints: number
    pending_complaints: number
    avg_resolution_time: number
    satisfaction_rate: number
    resolution_rate: number
    by_category: Record<string, number>
    by_priority: Record<string, number>
    by_sentiment: Record<string, number>
  }> {
    const response = await this.request<{
      total_complaints: number
      resolved_complaints: number
      pending_complaints: number
      avg_resolution_time: number
      satisfaction_rate: number
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
      staff_role: string | null
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
        staff_role: string | null
        total_complaints: number
        resolved_complaints: number
        pending_complaints: number
        resolution_rate: number
      }>
    >("/api/analytics/staff-performance")
    return response.data
  }

  // Staff self-service methods
  async getMyPerformance(): Promise<{
    total_assigned: number
    resolved: number
    rejected: number
    pending: number
    in_progress: number
    resolution_rate: number
    avg_resolution_time_days: number
    staff_name: string
  }> {
    const response = await this.request<{
      total_assigned: number
      resolved: number
      rejected: number
      pending: number
      in_progress: number
      resolution_rate: number
      avg_resolution_time_days: number
      staff_name: string
    }>("/api/staff/my-performance")
    return response.data
  }

  async getMyComplaints(): Promise<Array<{
    id: string
    title: string
    description: string
    category: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    assigned_at: string | null
    resolution_outcome: string | null
    student_name: string
  }>> {
    const response = await this.request<Array<{
      id: string
      title: string
      description: string
      category: string
      status: string
      priority: string
      created_at: string
      updated_at: string
      assigned_at: string | null
      resolution_outcome: string | null
      student_name: string
    }>>("/api/staff/my-complaints")
    return response.data
  }

  async downloadPerformanceReport(format: 'pdf' | 'excel'): Promise<Blob> {
    const url = `${this.baseURL}/api/staff/report/export?format=${format}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Download failed' }))
      throw new Error(error.message || 'Download failed')
    }

    return response.blob()
  }

  // ===== STAFF RATING METHODS =====

  async submitStaffRating(data: {
    staff_id: string
    subject_knowledge: number
    teaching_clarity: number
    student_interaction: number
    punctuality: number
    overall_effectiveness: number
  }): Promise<{ id: string; staff_name: string; week_number: number; year: number; average_rating: number }> {
    const response = await this.request<{
      id: string
      staff_name: string
      week_number: number
      year: number
      average_rating: number
    }>("/api/ratings", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return response.data
  }

  async getStaffForRating(): Promise<{
    staff: Array<{ id: string; name: string; department: string | null; already_rated_this_week: boolean }>
    week_number: number
    year: number
  }> {
    const response = await this.request<{
      staff: Array<{ id: string; name: string; department: string | null; already_rated_this_week: boolean }>
      week_number: number
      year: number
    }>("/api/ratings/staff-list")
    return response.data
  }

  async getMyStaffRatings(): Promise<{
    ratings: Array<{
      id: string
      staff_id: string
      staff_name: string
      subject_knowledge: number
      teaching_clarity: number
      student_interaction: number
      punctuality: number
      overall_effectiveness: number
      average_rating: number
      created_at: string
    }>
    week_number: number
    year: number
    week_start: string
    week_end: string
  }> {
    const response = await this.request<{
      ratings: Array<{
        id: string
        staff_id: string
        staff_name: string
        subject_knowledge: number
        teaching_clarity: number
        student_interaction: number
        punctuality: number
        overall_effectiveness: number
        average_rating: number
        created_at: string
      }>
      week_number: number
      year: number
      week_start: string
      week_end: string
    }>("/api/ratings/my-ratings")
    return response.data
  }

  async getWeeklyStaffPerformance(week?: number, year?: number): Promise<{
    week_number: number
    year: number
    week_start: string
    week_end: string
    staff_performance: Array<{
      staff_id: string
      staff_name: string
      staff_role: string | null
      department: string | null
      average_rating: number
      total_ratings: number
      is_best_staff: boolean
    }>
    total_ratings: number
  }> {
    let qs = ""
    if (week) qs += `?week=${week}`
    if (year) qs += `${qs ? "&" : "?"}year=${year}`

    const response = await this.request<{
      week_number: number
      year: number
      week_start: string
      week_end: string
      staff_performance: Array<{
        staff_id: string
        staff_name: string
        staff_role: string | null
        department: string | null
        average_rating: number
        total_ratings: number
        is_best_staff: boolean
      }>
      total_ratings: number
    }>(`/api/ratings/weekly-report${qs}`)
    return response.data
  }

  async downloadWeeklyPerformancePDF(week?: number, year?: number): Promise<Blob> {
    let qs = ""
    if (week) qs += `?week=${week}`
    if (year) qs += `${qs ? "&" : "?"}year=${year}`

    const url = `${this.baseURL}/api/ratings/weekly-report/pdf${qs}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Download failed' }))
      throw new Error(error.message || 'Download failed')
    }

    return response.blob()
  }

  // ===== HOD SEMESTER EVALUATION METHODS =====

  async getHODEvalToggle(): Promise<{ is_open: boolean; semester: number; year: number }> {
    const response = await this.request<{ is_open: boolean; semester: number; year: number }>("/api/hod-eval/toggle")
    return response.data
  }

  async setHODEvalToggle(isOpen: boolean): Promise<{ is_open: boolean; semester: number; year: number }> {
    const response = await this.request<{ is_open: boolean; semester: number; year: number }>("/api/hod-eval/toggle", {
      method: "POST",
      body: JSON.stringify({ is_open: isOpen }),
    })
    return response.data
  }

  async getHODsForRating(): Promise<{
    hods: Array<{ id: string; name: string; department: string | null; already_rated: boolean }>
    semester: number
    year: number
  }> {
    const response = await this.request<{
      hods: Array<{ id: string; name: string; department: string | null; already_rated: boolean }>
      semester: number
      year: number
    }>("/api/hod-eval/hods")
    return response.data
  }

  async submitStudentHODRating(data: {
    hod_id: string
    approachability: number
    academic_support: number
    placement_guidance: number
    internship_support: number
    grievance_handling: number
    event_organization: number
    student_motivation: number
    on_duty_permission: number
  }): Promise<{ id: string; average_rating: number; semester: number; year: number }> {
    const response = await this.request<{ id: string; average_rating: number; semester: number; year: number }>("/api/hod-eval/student-rating", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return response.data
  }

  async submitStaffHODRating(data: {
    hod_id: string
    leadership: number
    workload_fairness: number
    staff_coordination: number
    academic_monitoring: number
    research_encouragement: number
    university_communication: number
    conflict_resolution: number
    discipline_maintenance: number
  }): Promise<{ id: string; average_rating: number; semester: number; year: number }> {
    const response = await this.request<{ id: string; average_rating: number; semester: number; year: number }>("/api/hod-eval/staff-rating", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return response.data
  }

  async getMyHODRating(): Promise<{
    ratings: any[]
    semester: number
    year: number
    has_submitted: boolean
  }> {
    const response = await this.request<{
      ratings: any[]
      semester: number
      year: number
      has_submitted: boolean
    }>("/api/hod-eval/my-rating")
    return response.data
  }

  async getHODEvalDashboard(semester?: number, year?: number): Promise<any> {
    let qs = ""
    if (semester) qs += `?semester=${semester}`
    if (year) qs += `${qs ? "&" : "?"}year=${year}`
    const response = await this.request<any>(`/api/hod-eval/dashboard${qs}`)
    return response.data
  }

  async downloadHODReportPDF(semester?: number, year?: number): Promise<Blob> {
    let qs = ""
    if (semester) qs += `?semester=${semester}`
    if (year) qs += `${qs ? "&" : "?"}year=${year}`
    const url = `${this.baseURL}/api/hod-eval/report/pdf${qs}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Download failed' }))
      throw new Error(error.message || 'Download failed')
    }
    return response.blob()
  }

  // ===== STAFF GRIEVANCE METHODS =====

  async getStaffGrievanceOverview(): Promise<{
    staff_performance: Array<{
      staff_id: string
      staff_name: string
      staff_role: string | null
      total_assigned: number
      resolved: number
      in_process: number
      resolution_rate: number
      category_breakdown: Record<string, number>
      is_top_performer: boolean
    }>
    category_analytics: Record<string, { total: number; resolved: number }>
  }> {
    const response = await this.request<any>("/api/staff-grievance/overview")
    return response.data
  }

  async downloadStaffGrievancePDF(): Promise<Blob> {
    const url = `${this.baseURL}/api/staff-grievance/report/pdf`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Download failed' }))
      throw new Error(error.message || 'Download failed')
    }
    return response.blob()
  }

  async deleteResolvedComplaints(): Promise<{ deleted_count: number }> {
    const response = await this.request<{ deleted_count: number }>("/api/staff-grievance/resolved", {
      method: "DELETE",
    })
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
