

"use client"
import React, { useEffect, useState } from "react"

import { motion } from "framer-motion"
import { Sidebar } from "@/components/layout/sidebar"
import { Chatbot } from "@/components/chatbot"
import { ROLE_COLORS } from "@/lib/constants"
import { Search, Filter, Award, Mail, Phone, Loader2, Users, X } from "lucide-react"
import { apiClient } from "@/lib/api"
import { STAFF_ROLES } from "@/lib/constants"

interface StaffMember {
  id: string
  name: string
  email: string
  phone?: string
  department: string
  assignedComplaints: number
  resolvedComplaints: number
  avgResolutionTime: string
  rating: number | string
  staff_role: string
  status: string
}

export default function StaffManagementPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = React.use(params) as { role: "hod" | "principal" }
  const colors = ROLE_COLORS[role]
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStaffRole, setFilterStaffRole] = useState<string>("all")
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch staff users from database
        const staffUsers = await apiClient.getUsers("staff")

        // Fetch staff performance metrics
        let performanceData: Record<string, any> = {}
        try {
          const performance = await apiClient.getStaffPerformance()
          performance.forEach((p) => {
            performanceData[p.staff_id] = p
          })
        } catch (e) {
          // Performance data is optional, continue without it
          console.warn("Could not fetch staff performance:", e)
        }

        // Combine user data with performance data
        const combinedStaff: StaffMember[] = staffUsers.map((user: any) => {
          const perf = performanceData[user.id] || {}
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || "",
            department: user.department || "Not Assigned",
            assignedComplaints: perf.total_complaints || 0,
            resolvedComplaints: perf.resolved_complaints || 0,
            avgResolutionTime: perf.avg_resolution_time || "N/A",
            rating: perf.resolution_rate ? parseFloat((perf.resolution_rate / 20).toFixed(1)) : 0,
            staff_role: user.staff_role || "N/A",
            status: "active",
          }
        })

        setStaffMembers(combinedStaff)
      } catch (err: any) {
        console.error("Failed to fetch staff data:", err)
        setError(err.message || "Failed to load staff data")
      } finally {
        setLoading(false)
      }
    }

    fetchStaffData()
  }, [])

  const filteredStaff = staffMembers.filter(
    (staff) =>
      (staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.staff_role.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterStaffRole === "all" || staff.staff_role === filterStaffRole)
  )

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
      <Sidebar role={role} />
      <main className="flex-1 p-8 lg:ml-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Staff Management</h1>
            <p className="text-gray-400">Monitor and manage staff performance</p>
          </div>

          {/* Search and Filter */}
          <div className="glass-card rounded-2xl p-6 border border-white/10 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, department or role..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                />
              </div>

              <select
                value={filterStaffRole}
                onChange={(e) => setFilterStaffRole(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-white focus:outline-none focus:border-white/30"
              >
                <option value="all">All Roles</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className={`w-12 h-12 animate-spin text-gray-400`} />
              <p className="mt-4 text-gray-400">Loading staff members...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className={`mt-4 px-6 py-2 rounded-xl bg-gradient-to-r ${colors.gradient} text-white hover:opacity-90 transition-opacity`}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && staffMembers.length === 0 && (
            <div className="glass-card rounded-2xl p-12 border border-white/10 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Staff Found</h3>
              <p className="text-gray-400">There are no staff members registered in the database.</p>
            </div>
          )}

          {/* Staff Cards */}
          {!loading && !error && filteredStaff.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredStaff.map((staff, index) => (
                <motion.div
                  key={staff.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-2xl font-bold text-white`}
                      >
                        {staff.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{staff.name}</h3>
                        <p className={`text-sm font-semibold ${colors.text}`}>{staff.staff_role}</p>
                        <p className="text-xs text-gray-400">{staff.department}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Award className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-yellow-400">{staff.rating}/5.0</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${staff.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}
                    >
                      {staff.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white/5 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Assigned</p>
                      <p className="text-xl font-bold text-white">{staff.assignedComplaints}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Resolved</p>
                      <p className="text-xl font-bold text-white">{staff.resolvedComplaints}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Avg Time</p>
                      <p className="text-sm font-semibold text-white">{staff.avgResolutionTime}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Mail className="w-4 h-4" />
                      <span>{staff.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Phone className="w-4 h-4" />
                      <span>{staff.phone}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={() => {
                        setSelectedStaff(staff)
                        setIsDetailOpen(true)
                      }}
                      className={`w-full py-2 rounded-xl bg-gradient-to-r ${colors.gradient} text-white hover:opacity-90 transition-opacity`}
                    >
                      View Details
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
      {/* Detail Modal */}
      {isDetailOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10"
          >
            <div className={`p-6 bg-gradient-to-r ${colors.gradient} flex justify-between items-center`}>
              <h2 className="text-2xl font-bold text-white">Staff Details</h2>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-6 mb-8">
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-4xl font-bold text-white shadow-lg`}>
                  {selectedStaff.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">{selectedStaff.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colors.text} bg-white/10 border border-white/5`}>
                      {selectedStaff.staff_role}
                    </span>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase">
                      {selectedStaff.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Basic Information</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-300">
                        <Mail className="w-5 h-5 text-gray-500" />
                        <span>{selectedStaff.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300">
                        <Phone className="w-5 h-5 text-gray-500" />
                        <span>{selectedStaff.phone || "No phone provided"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300">
                        <Users className="w-5 h-5 text-gray-500" />
                        <span>{selectedStaff.department}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Performance Metrics</p>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Resolution Rate</span>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-yellow-400" />
                          <span className="text-lg font-bold text-white">{selectedStaff.rating}/5.0</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Assigned Complaints</span>
                        <span className="text-lg font-bold text-white">{selectedStaff.assignedComplaints}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Resolved Complaints</span>
                        <span className="text-emerald-400 font-bold">{selectedStaff.resolvedComplaints}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Avg Resolution Time</span>
                        <span className="text-white font-medium">{selectedStaff.avgResolutionTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="px-8 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      <Chatbot role={role} />
    </div>
  )
}
