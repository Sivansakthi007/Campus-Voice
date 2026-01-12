"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FileText, CheckCircle, Clock, AlertCircle, TrendingUp } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { USER_ROLES, type UserRole, COMPLAINT_STATUS } from "@/lib/constants"
import { mockStorage, type Complaint } from "@/lib/mock-data"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function DashboardPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = React.use(params) as { role: UserRole }
  const router = useRouter()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initDashboard = async () => {
      try {
        setLoading(true)
        // Check auth token
        const token = localStorage.getItem("auth_token")
        if (!token) {
          router.push("/login")
          return
        }

        const [currentUser, complaintsData] = await Promise.all([
          apiClient.getCurrentUser(),
          apiClient.getComplaints()
        ])

        if (!currentUser || currentUser.role !== role) {
          router.push("/login")
          return
        }

        setUser(currentUser)
        setComplaints(complaintsData)
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    initDashboard()
  }, [role, router])

  const stats = {
    total: complaints.length,
    submitted: complaints.filter((c) => c.status === COMPLAINT_STATUS.SUBMITTED).length,
    inProgress: complaints.filter((c) => c.status === COMPLAINT_STATUS.IN_PROGRESS).length,
    resolved: complaints.filter((c) => c.status === COMPLAINT_STATUS.RESOLVED).length,
  }

  const statCards = [
    { label: "Total Complaints", value: stats.total, icon: FileText, color: "blue" },
    { label: "Submitted", value: stats.submitted, icon: Clock, color: "yellow" },
    { label: "In Progress", value: stats.inProgress, icon: AlertCircle, color: "violet" },
    { label: "Resolved", value: stats.resolved, icon: CheckCircle, color: "emerald" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role} />

      <main className="flex-1 p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome back, {user?.name?.split(" ")[0] || "User"}!</h1>
            <p className="text-gray-400">Here's what's happening with your complaints today</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-2xl p-6 glass-card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                    </div>
                    {index === 3 && (
                      <div className="flex items-center gap-1 text-emerald-400 text-sm">
                        <TrendingUp className="w-4 h-4" />
                        12%
                      </div>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Recent Complaints */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Complaints</h2>
              <button
                onClick={() => router.push(`/dashboard/${role}/complaints`)}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                View All
              </button>
            </div>

            {complaints.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No complaints yet</p>
                {role === USER_ROLES.STUDENT && (
                  <button
                    onClick={() => router.push(`/dashboard/${role}/submit`)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white font-medium hover:shadow-lg transition-all"
                  >
                    Submit Your First Complaint
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.slice(0, 5).map((complaint) => (
                  <div
                    key={complaint.id}
                    className="glass-card rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => router.push(`/dashboard/${role}/complaint-details?id=${complaint.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{complaint.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-1">{complaint.description}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${complaint.status === COMPLAINT_STATUS.RESOLVED
                          ? "bg-emerald-500/10 text-emerald-400"
                          : complaint.status === COMPLAINT_STATUS.IN_PROGRESS
                            ? "bg-violet-500/10 text-violet-400"
                            : "bg-yellow-500/10 text-yellow-400"
                          }`}
                      >
                        {complaint.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
