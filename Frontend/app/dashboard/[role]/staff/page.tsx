

"use client"
import React, { useEffect, useState } from "react"

import { motion } from "framer-motion"
import { Sidebar } from "@/components/layout/sidebar"
import { Chatbot } from "@/components/chatbot"
import { ROLE_COLORS } from "@/lib/constants"
import { Search, Filter, Award, Mail, Phone, Loader2, Users } from "lucide-react"
import { apiClient } from "@/lib/api"

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
  status: string
}

export default function StaffManagementPage({ params }: { params: { role: string } }) {
  const { role } = React.use(params) as { role: "hod" | "principal" }
  const colors = ROLE_COLORS[role]
  const [searchTerm, setSearchTerm] = useState("")
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.department.toLowerCase().includes(searchTerm.toLowerCase()),
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
                  placeholder="Search by name or department..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                />
              </div>
              <button
                className={`flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${colors.gradient} text-white hover:opacity-90 transition-opacity`}
              >
                <Filter className="w-5 h-5" />
                Filter
              </button>
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
                        <p className="text-sm text-gray-400">{staff.department}</p>
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
      <Chatbot role={role} />
    </div>
  )
}
