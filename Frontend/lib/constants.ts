export const USER_ROLES = {
  STUDENT: "student",
  STAFF: "staff",
  HOD: "hod",
  PRINCIPAL: "principal",
  ADMIN: "admin",
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export const ROLE_COLORS = {
  student: {
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  staff: {
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  hod: {
    gradient: "from-violet-500 to-purple-500",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/30",
  },
  principal: {
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  admin: {
    gradient: "from-red-500 to-pink-500",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
}

export const COMPLAINT_STATUS = {
  SUBMITTED: "submitted",
  PENDING: "pending",
  REVIEWED: "reviewed",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  REJECTED: "rejected",
} as const

export type ComplaintStatus = (typeof COMPLAINT_STATUS)[keyof typeof COMPLAINT_STATUS]

export const PRIORITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const

export type PriorityLevel = (typeof PRIORITY_LEVELS)[keyof typeof PRIORITY_LEVELS]

export const COMPLAINT_CATEGORIES = [
  "Hostel",
  "Exam Cell",
  "Transport",
  "Staff Behavior",
  "Academic Issues",
  "Infrastructure",
  "Cafeteria",
  "Library",
  "Sports",
  "Lab",
  "Scholarship",
  "Placement",
  "Accounts/Fees",
  "Discipline",
  "Other",
] as const

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number]

export const STAFF_ROLES = [
  "Assistant Professor",
  "Lab Assistant",
  "Librarian",
  "Physical Director",
  "Discipline Coordinator",
  "Exam Cell Coordinator",
  "Accountant",
  "Clerk",
  "Transport Manager",
  "Scholarship Coordinator",
  "Placement Training Coordinator",
  "Warden",
  "Infrastructure Coordinator",
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]
