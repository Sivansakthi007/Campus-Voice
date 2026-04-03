"use client"

import React, { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "@/components/layout/sidebar"
import { Chatbot } from "@/components/chatbot"
import { ROLE_COLORS } from "@/lib/constants"
import {
  Users,
  GraduationCap,
  Briefcase,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Filter,
  AlertTriangle,
  History,
  Clock,
} from "lucide-react"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"

// Department-bound staff roles (must match backend)
const DEPARTMENT_STAFF_ROLES = [
  "Assistant Professor",
  "Lab Assistant",
  "Discipline Coordinator",
  "Infrastructure Coordinator",
  "Scholarship Coordinator",
  "Clerk",
]

interface DeptUser {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  student_id: string | null
  staff_id: string | null
  staff_role: string | null
  created_at: string | null
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const ITEMS_PER_PAGE = 15

export default function DepartmentUsersPage({
  params,
}: {
  params: Promise<{ role: string }>
}) {
  const { role } = React.use(params) as { role: "hod" }
  const colors = ROLE_COLORS[role]

  // Data state
  const [allUsers, setAllUsers] = useState<DeptUser[]>([])
  const [studentCount, setStudentCount] = useState(0)
  const [staffCount, setStaffCount] = useState(0)
  const [department, setDepartment] = useState("")
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<any[]>([])

  // Filter & search
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState<"all" | "student" | "staff">("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<DeptUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add form
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState<"student" | "staff">("student")
  const [formStaffRole, setFormStaffRole] = useState("")
  const [formStudentId, setFormStudentId] = useState("")
  const [formStaffId, setFormStaffId] = useState("")

  // Edit form
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editStaffRole, setEditStaffRole] = useState("")

  // ── Fetch Data ──
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getDepartmentUsers()
      const combined = [...data.students, ...data.staff]
      setAllUsers(combined)
      setStudentCount(data.student_count)
      setStaffCount(data.staff_count)
      setDepartment(data.department)
      
      // Fetch activity logs
      try {
        const activityData = await apiClient.getDepartmentActivity()
        setActivities(activityData)
      } catch (err) {
        console.error("Failed to fetch activity:", err)
      }
    } catch (error: any) {
      console.error("Failed to fetch department users:", error)
      toast.error(error?.message || "Failed to load department users")
      setAllUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // ── Filtered / Searched Users ──
  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.student_id && user.student_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.staff_id && user.staff_id.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesRole = filterRole === "all" || user.role === filterRole
      return matchesSearch && matchesRole
    })
  }, [allUsers, searchTerm, filterRole])

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterRole])

  // ── Add User ──
  const resetAddForm = () => {
    setFormName("")
    setFormEmail("")
    setFormPassword("")
    setFormRole("student")
    setFormStaffRole("")
    setFormStudentId("")
    setFormStaffId("")
  }

  const handleAddUser = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast.error("Please fill in all required fields")
      return
    }
    if (formRole === "staff" && !formStaffRole) {
      toast.error("Please select a staff role")
      return
    }
    setIsSubmitting(true)
    try {
      await apiClient.createDepartmentUser({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
        staff_role: formRole === "staff" ? formStaffRole : undefined,
        student_id: formRole === "student" && formStudentId ? formStudentId.trim() : undefined,
        staff_id: formRole === "staff" && formStaffId ? formStaffId.trim() : undefined,
      })
      toast.success(`${formRole === "student" ? "Student" : "Staff"} added successfully`)
      setShowAddModal(false)
      resetAddForm()
      await fetchUsers()
    } catch (error: any) {
      toast.error(error?.message || "Failed to add user")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Edit User ──
  const openEditModal = (user: DeptUser) => {
    setSelectedUser(user)
    setEditName(user.name)
    setEditEmail(user.email)
    setEditStaffRole(user.staff_role || "")
    setShowEditModal(true)
  }

  const handleEditUser = async () => {
    if (!selectedUser) return
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Name and email are required")
      return
    }
    setIsSubmitting(true)
    try {
      const updateData: any = {}
      if (editName.trim() !== selectedUser.name) updateData.name = editName.trim()
      if (editEmail.trim() !== selectedUser.email) updateData.email = editEmail.trim()
      if (selectedUser.role === "staff" && editStaffRole !== selectedUser.staff_role) {
        updateData.staff_role = editStaffRole
      }

      if (Object.keys(updateData).length === 0) {
        toast.info("No changes detected")
        setShowEditModal(false)
        return
      }

      await apiClient.updateDepartmentUser(selectedUser.id, updateData)
      toast.success("User updated successfully")
      setShowEditModal(false)
      setSelectedUser(null)
      await fetchUsers()
    } catch (error: any) {
      toast.error(error?.message || "Failed to update user")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Delete User ──
  const handleDeleteUser = async () => {
    if (!selectedUser) return
    setIsSubmitting(true)
    try {
      await apiClient.deleteDepartmentUser(selectedUser.id)
      toast.success(`User '${selectedUser.name}' deleted successfully`)
      setShowDeleteConfirm(false)
      setSelectedUser(null)
      await fetchUsers()
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete user")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Role badge styling ──
  const getRoleBadge = (userRole: string) => {
    if (userRole === "student") {
      return "bg-blue-500/20 text-blue-400 border border-blue-500/30"
    }
    return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
      <Sidebar role={role} />

      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                  <UserCog className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  Department User Management
                </h1>
              </div>
              <p className="text-gray-400 text-sm md:text-base ml-[52px]">
                Manage students & staff in <span className="text-violet-400 font-medium">{department || "your department"}</span>
              </p>
            </div>
            <button
              id="add-department-user-btn"
              onClick={() => {
                resetAddForm()
                setShowAddModal(true)
              }}
              className={`flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-xl bg-gradient-to-r ${colors.gradient} text-white font-medium hover:opacity-90 transition-all hover:shadow-lg hover:shadow-violet-500/20 shrink-0`}
            >
              <Plus className="w-5 h-5" />
              Add User
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
            {[
              {
                label: "Total Users",
                value: studentCount + staffCount,
                icon: Users,
                gradient: "from-violet-500 to-purple-500",
                iconColor: "text-violet-400",
                bgColor: "bg-violet-500/10",
              },
              {
                label: "Students",
                value: studentCount,
                icon: GraduationCap,
                gradient: "from-blue-500 to-cyan-500",
                iconColor: "text-blue-400",
                bgColor: "bg-blue-500/10",
              },
              {
                label: "Staff Members",
                value: staffCount,
                icon: Briefcase,
                gradient: "from-emerald-500 to-teal-500",
                iconColor: "text-emerald-400",
                bgColor: "bg-emerald-500/10",
              },
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-2xl p-5 md:p-6 border border-white/10 glass-card-hover group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl ${stat.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                      <Icon className={`w-6 h-6 md:w-7 md:h-7 ${stat.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs md:text-sm text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3 space-y-6">
              {/* Filters & Search */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-2xl p-4 md:p-6 border border-white/10"
              >
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="search-department-users"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or ID..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  id="filter-role"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-8 py-3 text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer min-w-[160px]"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>

            {/* Active filters indicator */}
            {(searchTerm || filterRole !== "all") && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-gray-500">Active filters:</span>
                {searchTerm && (
                  <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 flex items-center gap-1">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm("")} className="hover:text-white ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterRole !== "all" && (
                  <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 flex items-center gap-1">
                    {filterRole === "student" ? "Students" : "Staff"}
                    <button onClick={() => setFilterRole("all")} className="hover:text-white ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {filteredUsers.length} result{filteredUsers.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </motion.div>

          {/* Users Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl border border-white/10 overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-gray-400">Loading users...</span>
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="text-center py-16 md:py-20">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-lg text-gray-400 mb-2">
                  {searchTerm || filterRole !== "all" ? "No users match your search" : "No users in your department yet"}
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  {searchTerm || filterRole !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Start by adding students or staff members"}
                </p>
                {!searchTerm && filterRole === "all" && (
                  <button
                    onClick={() => {
                      resetAddForm()
                      setShowAddModal(true)
                    }}
                    className={`px-6 py-3 bg-gradient-to-r ${colors.gradient} rounded-xl text-white font-medium hover:opacity-90 transition-all`}
                  >
                    <Plus className="w-5 h-5 inline mr-2" />
                    Add First User
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          User
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                          Staff Role
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          ID
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                          Joined
                        </th>
                        <th className="text-right p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {paginatedUsers.map((user, index) => (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                    user.role === "student"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : "bg-emerald-500/20 text-emerald-400"
                                  }`}
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-white truncate max-w-[200px]">
                                    {user.name}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate max-w-[200px]">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${getRoleBadge(user.role)}`}>
                                {user.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-gray-300 text-sm hidden md:table-cell">
                              {user.staff_role || "—"}
                            </td>
                            <td className="p-4 text-gray-400 text-sm hidden lg:table-cell font-mono">
                              {user.student_id || user.staff_id || "—"}
                            </td>
                            <td className="p-4 text-gray-400 text-sm hidden md:table-cell">
                              {user.created_at ? formatDate(user.created_at) : "—"}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  id={`edit-user-${user.id}`}
                                  onClick={() => openEditModal(user)}
                                  className="p-2 hover:bg-violet-500/15 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4 text-violet-400" />
                                </button>
                                <button
                                  id={`delete-user-${user.id}`}
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setShowDeleteConfirm(true)
                                  }}
                                  className="p-2 hover:bg-red-500/15 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-white/10">
                    <p className="text-xs text-gray-500">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-400 hover:text-white"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          if (totalPages <= 5) return true
                          if (page === 1 || page === totalPages) return true
                          if (Math.abs(page - currentPage) <= 1) return true
                          return false
                        })
                        .map((page, idx, arr) => (
                          <React.Fragment key={page}>
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="text-gray-600 px-1">…</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                                currentPage === page
                                  ? `bg-gradient-to-r ${colors.gradient} text-white`
                                  : "text-gray-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-400 hover:text-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            </motion.div>
            </div>

            {/* Sidebar Activity Feed */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card rounded-2xl border border-white/10 flex flex-col h-full min-h-[500px] overflow-hidden"
              >
                <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Audit Log</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[700px] scrollbar-thin scrollbar-thumb-white/10">
                  {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                      <Clock className="w-8 h-8 text-gray-600 mb-2" />
                      <p className="text-xs text-gray-500">No recent activity</p>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="relative pl-4 border-l border-white/10 pb-1">
                        <div className={`absolute -left-1 top-1 w-2 h-2 rounded-full ${
                          activity.action === "ADD_USER" ? "bg-emerald-500" :
                          activity.action === "EDIT_USER" ? "bg-blue-500" : "bg-red-500"
                        }`} />
                        <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1 font-mono uppercase tracking-tighter">
                          {activity.action.replace("_", " ")} • {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <p className="text-xs text-gray-300 leading-tight">
                          {activity.details}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                  <p className="text-[10px] text-gray-500 text-center italic">
                    Showing latest 20 actions
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>

      <Chatbot role={role} />

      {/* ===== ADD USER MODAL ===== */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card rounded-2xl p-6 border border-white/10 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Add New User</h2>
                    <p className="text-xs text-gray-400">Department: {department}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Role Selector */}
                <div className="flex gap-2">
                  {(["student", "staff"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setFormRole(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        formRole === r
                          ? r === "student"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {r === "student" ? "Student" : "Staff"}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Full Name *"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />

                <input
                  type="email"
                  placeholder="Email Address *"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />

                <input
                  type="password"
                  placeholder="Password *"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />

                {formRole === "student" && (
                  <input
                    type="text"
                    placeholder="Student ID (optional)"
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                  />
                )}

                {formRole === "staff" && (
                  <>
                    <select
                      value={formStaffRole}
                      onChange={(e) => setFormStaffRole(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-all"
                    >
                      <option value="" disabled>
                        Select Staff Role *
                      </option>
                      {DEPARTMENT_STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Staff ID (optional)"
                      value={formStaffId}
                      onChange={(e) => setFormStaffId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                    />
                  </>
                )}

                {/* Department badge (auto-assigned) */}
                <div className="flex items-center gap-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <Briefcase className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-sm text-violet-300">
                    Department auto-assigned: <strong>{department}</strong>
                  </span>
                </div>

                <button
                  id="submit-add-user"
                  onClick={handleAddUser}
                  disabled={isSubmitting || !formName || !formEmail || !formPassword || (formRole === "staff" && !formStaffRole)}
                  className={`w-full py-3 rounded-xl bg-gradient-to-r ${colors.gradient} text-white font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </span>
                  ) : (
                    `Add ${formRole === "student" ? "Student" : "Staff Member"}`
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== EDIT USER MODAL ===== */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card rounded-2xl p-6 border border-white/10 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Edit className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Edit User</h2>
                    <p className="text-xs text-gray-400">
                      {selectedUser.role.toUpperCase()} • {selectedUser.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                  />
                </div>

                {selectedUser.role === "staff" && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Staff Role</label>
                    <select
                      value={editStaffRole}
                      onChange={(e) => setEditStaffRole(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-all"
                    >
                      <option value="" disabled>
                        Select Staff Role
                      </option>
                      {DEPARTMENT_STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Department info */}
                <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-400">
                    Department: <strong className="text-white">{selectedUser.department || department}</strong>
                    <span className="text-xs text-gray-500 ml-2">(cannot be changed)</span>
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-edit-user"
                    onClick={handleEditUser}
                    disabled={isSubmitting || !editName || !editEmail}
                    className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${colors.gradient} text-white font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <AnimatePresence>
        {showDeleteConfirm && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowDeleteConfirm(false)
              setSelectedUser(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card rounded-2xl p-6 border border-red-500/20 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Confirm Deletion</h2>
                  <p className="text-xs text-gray-400">This action cannot be undone</p>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
                <p className="text-gray-300 text-sm">
                  Are you sure you want to permanently delete{" "}
                  <span className="text-white font-semibold">{selectedUser.name}</span>
                  <span className="text-gray-400"> ({selectedUser.email})</span>?
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Role: {selectedUser.role.toUpperCase()}
                  {selectedUser.staff_role && ` • ${selectedUser.staff_role}`}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setSelectedUser(null)
                  }}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-user"
                  onClick={handleDeleteUser}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </span>
                  ) : (
                    "Delete User"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
