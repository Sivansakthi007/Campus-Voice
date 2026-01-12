"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { AlertCircle, CheckCircle, Clock, FileText, Filter, Search, XCircle, Shield } from "lucide-react"

import { apiClient } from "@/lib/api"
import { COMPLAINT_STATUS, USER_ROLES } from "@/lib/constants"
import { Sidebar } from "@/components/layout/sidebar"

export default function MyComplaintsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()

  // Ensure role is a string (useParams can return string | string[])
  const role = Array.isArray(params.role) ? params.role[0] : params.role

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [complaints, setComplaints] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [currentUser, setCurrentUser] = useState<any>(null)

  const fetchComplaints = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("Fetching complaints from API...")
      const complaintsData = await apiClient.getComplaints()
      console.log("Complaints fetched:", complaintsData)
      setComplaints(complaintsData)
    } catch (error) {
      console.error("Failed to fetch complaints:", error)
      setError("Failed to load complaints. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Callback for polling updates
  const handlePollUpdate = useCallback((updatedComplaints: any[]) => {
    setComplaints(updatedComplaints)
    setLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const initPage = async () => {
      // Check authentication
      const token = localStorage.getItem("auth_token")
      if (!token) {
        router.push("/login")
        return
      }

      try {
        // Get current user info
        const user = await apiClient.getCurrentUser()
        setCurrentUser(user)

        // Ensure role matches (unless we want to allow cross-viewing, but user code restricted it)
        if (role && user.role !== role) {
          router.push("/login")
          return
        }

        // Start real-time polling subscription
        unsubscribe = apiClient.subscribeToComplaints(handlePollUpdate, 5000)
      } catch (error) {
        console.error("Failed to get user:", error)
        router.push("/login")
        return
      }
    }

    if (role) {
      initPage()
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [role, router, pathname, searchParams, handlePollUpdate])

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === "all" || complaint.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case COMPLAINT_STATUS.RESOLVED:
        return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case COMPLAINT_STATUS.IN_PROGRESS:
        return <Clock className="w-5 h-5 text-violet-400" />
      case COMPLAINT_STATUS.REJECTED:
        return <XCircle className="w-5 h-5 text-red-400" />
      case COMPLAINT_STATUS.REVIEWED:
        return <Shield className="w-5 h-5 text-purple-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case COMPLAINT_STATUS.RESOLVED:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      case COMPLAINT_STATUS.IN_PROGRESS:
        return "bg-violet-500/10 text-violet-400 border-violet-500/30"
      case COMPLAINT_STATUS.REJECTED:
        return "bg-red-500/10 text-red-400 border-red-500/30"
      case COMPLAINT_STATUS.REVIEWED:
        return "bg-purple-500/10 text-purple-400 border-purple-500/30"
      default:
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
    }
  }

  if (!role) return null // Or loading spinner while params load

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role as any} />

      <main className="flex-1 p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Complaints</h1>
              <p className="text-gray-400">{filteredComplaints.length} complaint(s) found</p>
            </div>
            {role !== USER_ROLES.HOD && (
              <button
                onClick={() => router.push(`/dashboard/${role}/submit`)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white font-medium hover:shadow-lg transition-all"
              >
                New Complaint
              </button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints..."
                className="w-full pl-12 pr-4 py-3 glass-card rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-4 py-3 glass-card rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="all" className="bg-[#181820] text-white">All Status</option>
                <option value={COMPLAINT_STATUS.SUBMITTED} className="bg-[#181820] text-white">Submitted</option>
                <option value={COMPLAINT_STATUS.REVIEWED} className="bg-[#181820] text-white">Reviewed</option>
                <option value={COMPLAINT_STATUS.IN_PROGRESS} className="bg-[#181820] text-white">In Progress</option>
                <option value={COMPLAINT_STATUS.RESOLVED} className="bg-[#181820] text-white">Resolved</option>
                <option value={COMPLAINT_STATUS.REJECTED} className="bg-[#181820] text-white">Rejected</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading complaints...</p>
            </div>
          ) : error ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchComplaints}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white font-medium hover:shadow-lg transition-all"
              >
                Try Again
              </button>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No complaints found</p>
              <button
                onClick={() => router.push(`/dashboard/${role}/submit`)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white font-medium hover:shadow-lg transition-all"
              >
                Submit Your First Complaint
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComplaints.map((complaint, index) => (
                <motion.div
                  key={complaint.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => router.push(`/dashboard/${role}/complaint-details?id=${complaint.id}`)}
                  className="glass-card rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">{getStatusIcon(complaint.status)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-semibold text-white truncate">{complaint.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(complaint.status)}`}
                        >
                          {complaint.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">{complaint.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>Category: {complaint.category}</span>
                        <span>Priority: {complaint.priority.toUpperCase()}</span>
                        <span>Created: {new Date(complaint.createdAt || complaint.created_at).toLocaleDateString()}</span>
                        {role === USER_ROLES.STAFF && currentUser && (
                          ((complaint as any).assignedTo === currentUser.id || (complaint as any).assigned_to === currentUser.id) && (
                            <span className="text-sm">📌 Complaint assigned for you</span>
                          )
                        )}
                        {Array.isArray(complaint.attachments) && complaint.attachments.length > 0 && (
                          <span>{complaint.attachments.length} attachment(s)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}