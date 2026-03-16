"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FileText, CheckCircle, Clock, AlertCircle, TrendingUp } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Chatbot } from "@/components/chatbot"
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

      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">Welcome back, {user?.name?.split(" ")[0] || "User"}!</h1>
            <p className="text-sm md:text-base text-gray-400">Here's what's happening with your complaints today</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-2xl p-5 md:p-6 glass-card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 text-${stat.color}-400`} />
                    </div>
                    {index === 3 && (
                      <div className="flex items-center gap-1 text-emerald-400 text-xs md:text-sm">
                        <TrendingUp className="w-4 h-4" />
                        12%
                      </div>
                    )}
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-xs md:text-sm text-gray-400">{stat.label}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Recent Complaints */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-5 md:p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white">Recent Complaints</h2>
              <button
                onClick={() => router.push(`/dashboard/${role}/complaints`)}
                className="text-blue-400 hover:text-blue-300 text-xs md:text-sm font-medium transition-colors"
              >
                View All
              </button>
            </div>

            {complaints.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <FileText className="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-sm md:text-base text-gray-400 mb-4">No complaints yet</p>
                {role === USER_ROLES.STUDENT && (
                  <button
                    onClick={() => router.push(`/dashboard/${role}/submit`)}
                    className="px-5 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white text-sm md:text-base font-medium hover:shadow-lg transition-all"
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1 truncate">{complaint.title}</h3>
                        <p className="text-xs md:text-sm text-gray-400 line-clamp-1">{complaint.description}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium shrink-0 ${complaint.status === COMPLAINT_STATUS.RESOLVED
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

      {/* Floating Chatbot */}
      <Chatbot role={role} />
    </div>
  )
}
