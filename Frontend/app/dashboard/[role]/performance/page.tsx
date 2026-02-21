"use client"
import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Sidebar } from "@/components/layout/sidebar"
import { Chatbot } from "@/components/chatbot"
import { ROLE_COLORS } from "@/lib/constants"
import { Clock, CheckCircle, XCircle, AlertTriangle, Award, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface PerformanceData {
  total_assigned: number
  resolved: number
  rejected: number
  pending: number
  in_progress: number
  resolution_rate: number
  avg_resolution_time_days: number
  staff_name: string
}

interface ComplaintRecord {
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
}

export default function PerformancePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = React.use(params) as { role: "staff" }
  const router = useRouter()
  const colors = ROLE_COLORS[role]

  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check auth
        const token = localStorage.getItem("auth_token")
        if (!token) {
          router.push("/login")
          return
        }

        // Verify staff role
        const user = await apiClient.getCurrentUser()
        if (user.role !== "staff") {
          toast.error("This page is only accessible to staff members")
          router.push(`/dashboard/${user.role}`)
          return
        }

        // Fetch performance data and complaints
        const [perfData, complaintsData] = await Promise.all([
          apiClient.getMyPerformance(),
          apiClient.getMyComplaints()
        ])

        setPerformanceData(perfData)
        setComplaints(complaintsData)
      } catch (error) {
        console.error("Failed to load performance data:", error)
        toast.error("Failed to load performance data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleDownload = async (format: 'pdf' | 'excel') => {
    const setDownloading = format === 'pdf' ? setDownloadingPdf : setDownloadingExcel
    setDownloading(true)

    try {
      const blob = await apiClient.downloadPerformanceReport(format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `performance_report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(`${format.toUpperCase()} report downloaded successfully`)
    } catch (error) {
      console.error("Download failed:", error)
      toast.error(`Failed to download ${format.toUpperCase()} report`)
    } finally {
      setDownloading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-emerald-500/10 text-emerald-400"
      case "rejected":
        return "bg-red-500/10 text-red-400"
      case "in_progress":
        return "bg-violet-500/10 text-violet-400"
      default:
        return "bg-yellow-500/10 text-yellow-400"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "text-red-400"
      case "medium":
        return "text-yellow-400"
      default:
        return "text-green-400"
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
        <Sidebar role={role} />
        <main className="flex-1 p-8 lg:ml-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            <p className="text-gray-400">Loading performance data...</p>
          </div>
        </main>
      </div>
    )
  }

  const data = performanceData || {
    total_assigned: 0,
    resolved: 0,
    rejected: 0,
    pending: 0,
    in_progress: 0,
    resolution_rate: 0,
    avg_resolution_time_days: 0,
    staff_name: "Staff"
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
      <Sidebar role={role} />
      <main className="flex-1 p-8 lg:ml-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">My Performance</h1>
            <p className="text-gray-400">Track your complaint resolution metrics and download reports</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}
                >
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-white">{data.total_assigned}</span>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Total Assigned</h3>
              <p className="text-xs text-gray-500">All complaints assigned to you</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-3xl font-bold text-emerald-400">{data.resolved}</span>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Resolved</h3>
              <p className="text-xs text-emerald-400">{data.resolution_rate}% resolution rate</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <span className="text-3xl font-bold text-red-400">{data.rejected}</span>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Rejected</h3>
              <p className="text-xs text-gray-500">Complaints rejected</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="text-3xl font-bold text-yellow-400">{data.pending}</span>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Pending</h3>
              <p className="text-xs text-gray-500">Awaiting resolution</p>
            </motion.div>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{data.avg_resolution_time_days} days</p>
                  <p className="text-gray-400 text-sm">Average Resolution Time</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Award className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{data.resolution_rate}%</p>
                  <p className="text-gray-400 text-sm">Resolution Rate</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Report Download Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card rounded-2xl p-6 border border-white/10 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Download Report</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">Export your performance report in your preferred format</p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloadingPdf}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                Download PDF
              </button>
              <button
                onClick={() => handleDownload('excel')}
                disabled={downloadingExcel}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingExcel ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5" />
                )}
                Download Excel
              </button>
            </div>
          </motion.div>

          {/* Complaints Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="glass-card rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-violet-400" />
              <h2 className="text-xl font-bold text-white">Complaint Details</h2>
              <span className="ml-auto text-sm text-gray-400">{complaints.length} complaints</span>
            </div>

            {complaints.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No complaints assigned yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">ID</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Title</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Category</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Date</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Priority</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Status</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((complaint, index) => (
                      <motion.tr
                        key={complaint.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/${role}/complaint-details?id=${complaint.id}`)}
                      >
                        <td className="py-4 px-4 text-gray-300 font-mono text-sm">
                          {complaint.id.substring(0, 8)}...
                        </td>
                        <td className="py-4 px-4 text-white max-w-[200px]">
                          <p className="truncate">{complaint.title}</p>
                        </td>
                        <td className="py-4 px-4 text-gray-300">{complaint.category || "N/A"}</td>
                        <td className="py-4 px-4 text-gray-300 text-sm">
                          {complaint.created_at ? new Date(complaint.created_at).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-medium ${getPriorityColor(complaint.priority)}`}>
                            {complaint.priority || "N/A"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                            {complaint.status?.replace("_", " ").toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-300 text-sm max-w-[150px]">
                          <p className="truncate">{complaint.resolution_outcome || "-"}</p>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>
      <Chatbot role={role} />
    </div>
  )
}
