"use client"

import React, { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users, Trophy, Download, Trash2, AlertTriangle,
    CheckCircle, Clock, FileText, Award, BarChart3, X,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { USER_ROLES, type UserRole } from "@/lib/constants"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, Legend, PieChart, Pie,
} from "recharts"

interface StaffPerf {
    staff_id: string
    staff_name: string
    staff_role: string | null
    total_assigned: number
    resolved: number
    in_process: number
    resolution_rate: number
    category_breakdown: Record<string, number>
    is_top_performer: boolean
}

interface CategoryAnalytics {
    [category: string]: { total: number; resolved: number }
}

const CHART_COLORS = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#06b6d4", "#3b82f6", "#2563eb", "#7c3aed",
]

export default function StaffGrievancePage({ params }: { params: Promise<{ role: string }> }) {
    const { role } = React.use(params) as { role: UserRole }
    const router = useRouter()
    const [staffPerformance, setStaffPerformance] = useState<StaffPerf[]>([])
    const [categoryAnalytics, setCategoryAnalytics] = useState<CategoryAnalytics>({})
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showDeleteBtn, setShowDeleteBtn] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("auth_token")
            if (!token) { router.push("/login"); return }
            const data = await apiClient.getStaffGrievanceOverview()
            setStaffPerformance(data.staff_performance)
            setCategoryAnalytics(data.category_analytics)
        } catch (err) {
            console.error("Failed to load staff grievance data:", err)
            toast.error("Failed to load staff grievance data")
        } finally {
            setLoading(false)
        }
    }, [router])

    useEffect(() => { fetchData() }, [fetchData])

    const handleDownloadPDF = async () => {
        try {
            setDownloading(true)
            const blob = await apiClient.downloadStaffGrievancePDF()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "staff_grievance_report.pdf"
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            toast.success("Report downloaded successfully!")
            setShowDeleteBtn(true)
        } catch (err) {
            console.error("Download failed:", err)
            toast.error("Failed to download report")
        } finally {
            setDownloading(false)
        }
    }

    const handleDeleteResolved = async () => {
        try {
            setDeleting(true)
            const result = await apiClient.deleteResolvedComplaints()
            toast.success(`Deleted ${result.deleted_count} resolved complaints`)
            setShowDeleteConfirm(false)
            setShowDeleteBtn(false)
            await fetchData()
        } catch (err) {
            console.error("Delete failed:", err)
            toast.error("Failed to delete resolved complaints")
        } finally {
            setDeleting(false)
        }
    }

    // Prepare chart data
    const barChartData = Object.entries(categoryAnalytics).map(([cat, stats]) => ({
        name: cat.length > 14 ? cat.slice(0, 12) + "…" : cat,
        fullName: cat,
        total: stats.total,
        resolved: stats.resolved,
    }))

    const pieChartData = Object.entries(categoryAnalytics).map(([cat, stats]) => ({
        name: cat,
        value: stats.total,
    }))

    // Compute totals
    const totalAssigned = staffPerformance.reduce((s, p) => s + p.total_assigned, 0)
    const totalResolved = staffPerformance.reduce((s, p) => s + p.resolved, 0)
    const totalInProcess = staffPerformance.reduce((s, p) => s + p.in_process, 0)

    // All unique categories for the table
    const allCategories = Array.from(
        new Set(staffPerformance.flatMap(s => Object.keys(s.category_breakdown)))
    ).sort()

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
                <Sidebar role={role} />
                <main className="flex-1 p-8 lg:p-12 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">Loading staff grievance data...</p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
            <Sidebar role={role} />

            <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-white flex items-center gap-3">
                                <AlertTriangle className="w-8 h-8 text-amber-400" />
                                Staff Grievance
                            </h1>
                            <p className="text-gray-400 mt-1">Real-time staff complaint handling performance</p>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={handleDownloadPDF}
                                disabled={downloading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" />
                                {downloading ? "Generating…" : "Download Report (PDF)"}
                            </button>
                            {showDeleteBtn && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Resolved Complaints
                                </motion.button>
                            )}
                        </div>
                    </div>

                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                        {[
                            { label: "Total Assigned", value: totalAssigned, icon: FileText, color: "blue" },
                            { label: "Total Resolved", value: totalResolved, icon: CheckCircle, color: "emerald" },
                            { label: "In Process", value: totalInProcess, icon: Clock, color: "amber" },
                        ].map((stat, i) => {
                            const Icon = stat.icon
                            return (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="glass-card rounded-2xl p-6"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                                            <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-white">{stat.value}</p>
                                            <p className="text-sm text-gray-400">{stat.label}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>

                    {/* Staff Performance Cards + Ranking */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                            Staff Performance &amp; Ranking
                        </h2>
                        {staffPerformance.length === 0 ? (
                            <div className="glass-card rounded-2xl p-12 text-center">
                                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">No staff members found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {staffPerformance.map((staff, idx) => (
                                    <motion.div
                                        key={staff.staff_id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.05 * idx }}
                                        className={`glass-card rounded-2xl p-6 relative overflow-hidden transition-all hover:scale-[1.02] ${staff.is_top_performer
                                            ? "ring-2 ring-yellow-400/70 bg-gradient-to-br from-yellow-900/20 to-amber-900/10"
                                            : ""
                                            }`}
                                    >
                                        {/* Rank badge */}
                                        <div className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? "bg-yellow-500 text-black" :
                                            idx === 1 ? "bg-gray-300 text-black" :
                                                idx === 2 ? "bg-amber-700 text-white" :
                                                    "bg-white/10 text-gray-400"
                                            }`}>
                                            #{idx + 1}
                                        </div>

                                        {/* Top performer badge */}
                                        {staff.is_top_performer && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-lg">🏆</span>
                                                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider bg-yellow-400/10 px-2 py-1 rounded-full">
                                                    Complaint Handling Hero
                                                </span>
                                            </div>
                                        )}

                                        <h3 className="text-lg font-bold text-white mb-1 pr-10">{staff.staff_name}</h3>
                                        <p className="text-sm text-gray-400 mb-4">{staff.staff_role || "Staff"}</p>

                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div className="bg-white/5 rounded-xl p-3">
                                                <p className="text-xl font-bold text-blue-400">{staff.total_assigned}</p>
                                                <p className="text-[11px] text-gray-500">Assigned</p>
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-3">
                                                <p className="text-xl font-bold text-emerald-400">{staff.resolved}</p>
                                                <p className="text-[11px] text-gray-500">Resolved</p>
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-3">
                                                <p className="text-xl font-bold text-amber-400">{staff.in_process}</p>
                                                <p className="text-[11px] text-gray-500">In Process</p>
                                            </div>
                                        </div>

                                        {/* Resolution rate bar */}
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>Resolution Rate</span>
                                                <span className="text-white font-semibold">{staff.resolution_rate}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${staff.resolution_rate}%` }}
                                                    transition={{ duration: 1, delay: 0.3 + idx * 0.05 }}
                                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Category-wise Report Table */}
                    {allCategories.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="glass-card rounded-2xl p-6 mb-8 overflow-x-auto"
                        >
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-violet-400" />
                                Category-wise Resolved Report
                            </h2>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Staff Name</th>
                                        {allCategories.map(cat => (
                                            <th key={cat} className="text-center py-3 px-3 text-gray-400 font-semibold whitespace-nowrap">
                                                {cat}
                                            </th>
                                        ))}
                                        <th className="text-center py-3 px-4 text-gray-400 font-semibold">Total Resolved</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffPerformance.map((staff, idx) => (
                                        <tr
                                            key={staff.staff_id}
                                            className={`border-b border-white/5 hover:bg-white/5 transition-colors ${staff.is_top_performer ? "bg-yellow-500/5" : ""
                                                }`}
                                        >
                                            <td className="py-3 px-4 text-white font-medium">
                                                {staff.is_top_performer && <span className="mr-1">🏆</span>}
                                                {staff.staff_name}
                                            </td>
                                            {allCategories.map(cat => (
                                                <td key={cat} className="text-center py-3 px-3 text-gray-300">
                                                    {staff.category_breakdown[cat] || 0}
                                                </td>
                                            ))}
                                            <td className="text-center py-3 px-4 text-emerald-400 font-bold">{staff.resolved}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}

                    {/* Category Analytics Charts */}
                    {barChartData.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 }}
                            className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8"
                        >
                            {/* Bar Chart */}
                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Complaints by Category</h3>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={barChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                                            angle={-35}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "rgba(30,30,40,0.95)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: 12,
                                                color: "#fff",
                                            }}
                                            labelFormatter={(_, payload) =>
                                                payload?.[0]?.payload?.fullName || ""
                                            }
                                        />
                                        <Legend wrapperStyle={{ color: "#9ca3af" }} />
                                        <Bar dataKey="total" name="Total" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Pie Chart */}
                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Complaint Distribution</h3>
                                <ResponsiveContainer width="100%" height={320}>
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={110}
                                            innerRadius={50}
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, percent }) =>
                                                `${name.length > 10 ? name.slice(0, 8) + "…" : name} ${(percent * 100).toFixed(0)}%`
                                            }
                                            labelLine
                                        >
                                            {pieChartData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "rgba(30,30,40,0.95)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: 12,
                                                color: "#fff",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    )}
                </motion.div>

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {showDeleteConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowDeleteConfirm(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                className="glass-card rounded-2xl p-8 max-w-md w-full"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                        <AlertTriangle className="w-6 h-6 text-red-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
                                </div>
                                <p className="text-gray-300 mb-6 leading-relaxed">
                                    Are you sure you want to delete <strong className="text-white">all resolved complaints</strong>?
                                    This action is <strong className="text-red-400">permanent</strong> and cannot be undone.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-5 py-2.5 rounded-xl text-gray-400 hover:bg-white/10 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteResolved}
                                        disabled={deleting}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {deleting ? "Deleting…" : "Yes, Delete All"}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}
