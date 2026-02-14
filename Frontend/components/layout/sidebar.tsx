"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  List,
  BarChart3,
  Users,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  FileSearch,
  Star,
  Trophy,
  ClipboardCheck,
} from "lucide-react"
import { USER_ROLES, ROLE_COLORS, type UserRole } from "@/lib/constants"
import { mockStorage } from "@/lib/mock-data"
import { toast } from "sonner"

interface SidebarProps {
  role: UserRole
}

const SIDEBAR_ITEMS = {
  [USER_ROLES.STUDENT]: [
    { icon: LayoutDashboard, label: "Dashboard", path: "" },
    { icon: FileText, label: "Submit Complaint", path: "/submit" },
    { icon: List, label: "My Complaints", path: "/complaints" },
    { icon: FileSearch, label: "Complaint Details", path: "/complaint-details" },
    { icon: Star, label: "Weekly Staff Rating", path: "/weekly-staff-rating" },
    { icon: ClipboardCheck, label: "HOD Semester Report", path: "/hod-semester-report" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Users, label: "Staff Report", path: "/staff-report" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
  [USER_ROLES.STAFF]: [
    { icon: LayoutDashboard, label: "Dashboard", path: "" },
    { icon: List, label: "Assigned Complaints", path: "/complaints" },
    { icon: FileSearch, label: "Complaint Details", path: "/complaint-details" },
    { icon: BarChart3, label: "My Performance", path: "/performance" },
    { icon: ClipboardCheck, label: "HOD Semester Report", path: "/hod-semester-report" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
  [USER_ROLES.HOD]: [
    { icon: LayoutDashboard, label: "Dashboard", path: "" },
    { icon: List, label: "All Complaints", path: "/complaints" },
    { icon: FileSearch, label: "Complaint Details", path: "/complaint-details" },
    { icon: Users, label: "Staff Management", path: "/staff" },
    { icon: Trophy, label: "Staff Performance", path: "/staff-performance-report" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
  [USER_ROLES.PRINCIPAL]: [
    { icon: LayoutDashboard, label: "Dashboard", path: "" },
    { icon: List, label: "All Complaints", path: "/complaints" },
    { icon: FileSearch, label: "Complaint Details", path: "/complaint-details" },
    { icon: Users, label: "Staff Management", path: "/staff" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Trophy, label: "HOD Performance", path: "/hod-performance-dashboard" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
  [USER_ROLES.ADMIN]: [
    { icon: LayoutDashboard, label: "Dashboard", path: "" },
    { icon: List, label: "All Complaints", path: "/complaints" },
    { icon: FileSearch, label: "Complaint Details", path: "/complaint-details" },
    { icon: Users, label: "User Management", path: "/users" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
}

export function Sidebar({ role }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [user, setUser] = useState<ReturnType<typeof mockStorage.getUser>>(null)
  // Load user only on client to avoid hydration mismatch
  useEffect(() => {
    setUser(mockStorage.getUser())
  }, [])
  const colors = ROLE_COLORS[role]
  const items = SIDEBAR_ITEMS[role]

  const handleLogout = () => {
    mockStorage.clearUser()
    toast.success("Logged out successfully")
    router.push("/welcome")
  }

  const isActive = (path: string) => {
    const basePath = `/dashboard/${role}`
    return pathname === (path ? `${basePath}${path}` : basePath)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white">CampusVoice</h2>
            <p className={`text-xs ${colors.text}`}>{role.toUpperCase()}</p>
          </div>
        </div>
        {user && (
          <div className="glass-card rounded-xl p-3">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => {
                router.push(`/dashboard/${role}${item.path}`)
                setIsMobileOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg`
                : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 glass-card p-3 rounded-xl"
      >
        {isMobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 glass-card border-r border-white/10 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 glass-card z-50"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
