import type { UserRole, ComplaintStatus, PriorityLevel, ComplaintCategory } from "./constants"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  department?: string
  studentId?: string
  staffId?: string
  avatar?: string
}

export interface Complaint {
  id: string
  title: string
  description: string
  category: ComplaintCategory
  priority: PriorityLevel
  status: ComplaintStatus
  isAnonymous: boolean
  studentId: string
  studentName?: string
  studentEmail?: string
  assignedTo?: string
  assignedToName?: string
  attachments: string[]
  evidenceTags: string[]
  aiAnalysis?: {
    sentiment: "positive" | "negative" | "angry" | "urgent"
    suggestedCategory: ComplaintCategory
    suggestedPriority: PriorityLevel
    isDuplicate: boolean
    foulLanguageSeverity: "none" | "mild" | "moderate" | "severe"
  }
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  feedback?: {
    rating: number
    comment?: string
  }
  timeline: {
    timestamp: string
    action?: string
    by?: string
    note?: string
    status?: string
  }[]
}

// Mock storage helper
export const mockStorage = {
  getUser: (): User | null => {
    if (typeof window === "undefined") return null
    const user = localStorage.getItem("campusvoice_user")
    return user ? JSON.parse(user) : null
  },
  setUser: (user: User): boolean => {
    if (typeof window === "undefined") return false
    try {
      localStorage.setItem("campusvoice_user", JSON.stringify(user))
      return true
    } catch (error) {
      console.error("Failed to save user to localStorage:", error)
      // Try saving without avatar if it's too large
      try {
        const userWithoutAvatar = { ...user, avatar: undefined }
        localStorage.setItem("campusvoice_user", JSON.stringify(userWithoutAvatar))
        return true
      } catch {
        console.error("Still unable to save user after removing avatar")
        return false
      }
    }
  },
  clearUser: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("campusvoice_user")
  },
  getComplaints: (): Complaint[] => {
    if (typeof window === "undefined") return []
    const complaints = localStorage.getItem("campusvoice_complaints")
    return complaints ? JSON.parse(complaints) : []
  },
  setComplaints: (complaints: Complaint[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("campusvoice_complaints", JSON.stringify(complaints))
  },
  getAllComplaints: (): Complaint[] => {
    if (typeof window === "undefined") return []
    const complaints = localStorage.getItem("campusvoice_complaints")
    return complaints ? JSON.parse(complaints) : []
  },
  getStaffList: (): User[] => {
    // Mock staff list for assignment
    return [
      { id: "staff-1", name: "Dr. Sarah Johnson", email: "sarah@campus.edu", role: "staff", department: "Academic Issues" },
      { id: "staff-2", name: "Mr. John Smith", email: "john@campus.edu", role: "staff", department: "Hostel" },
      { id: "staff-3", name: "Ms. Emily Davis", email: "emily@campus.edu", role: "staff", department: "Transport" },
      { id: "staff-4", name: "Dr. Michael Brown", email: "michael@campus.edu", role: "staff", department: "Exam Cell" },
    ]
  },
  // Profile image persistence (per-user) stored in localStorage under key `profile_image_<userId>`
  getProfileImage: (userId: string): string | null => {
    if (typeof window === "undefined") return null
    const key = `profile_image_${userId}`
    return localStorage.getItem(key)
  },
  setProfileImage: (userId: string, dataUrl: string): boolean => {
    if (typeof window === "undefined") return false
    const key = `profile_image_${userId}`
    try {
      // Clear any existing image first to free up space
      localStorage.removeItem(key)
      localStorage.setItem(key, dataUrl)
      return true
    } catch (error) {
      console.error("Failed to save profile image to localStorage (quota exceeded):", error)
      // Try to clear other profile images to make space
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const existingKey = localStorage.key(i)
          if (existingKey?.startsWith("profile_image_") && existingKey !== key) {
            keysToRemove.push(existingKey)
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
        // Try again
        localStorage.setItem(key, dataUrl)
        return true
      } catch {
        console.error("Still unable to save profile image after clearing cache")
        return false
      }
    }
  },
  removeProfileImage: (userId: string) => {
    if (typeof window === "undefined") return
    const key = `profile_image_${userId}`
    localStorage.removeItem(key)
  },
}
