"use client"

import React, { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
    Trophy, Download, ToggleLeft, ToggleRight, Star,
    Users, TrendingUp, Award, Loader2, BarChart3, User, Crown
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import type { UserRole } from "@/lib/constants"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, ResponsiveContainer
} from "recharts"

const PIE_COLORS = ["#22c55e", "#ef4444"]
const BAR_COLORS = {
    student: "#6366f1",
    staff: "#f59e0b",
    overall: "#22c55e",
}

interface HODPerformance {
    hod_id: string
    hod_name: string
    department: string | null
    total_student_ratings: number
    total_staff_ratings: number
    avg_student_rating: number
    avg_staff_rating: number
    overall_rating: number
    performance_category: string
    student_good: number
    student_bad: number
    staff_good: number
    staff_bad: number
    student_criteria_avg: Record<string, number>
    staff_criteria_avg: Record<string, number>
    rank: number
    is_best_hod: boolean
}

function CategoryBadge({ category }: { category: string }) {
    const colors: Record<string, string> = {
        "Excellent": "from-emerald-500 to-green-500 text-white",
        "Very Good": "from-blue-500 to-cyan-500 text-white",
        "Good": "from-amber-500 to-yellow-500 text-white",
        "Needs Improvement": "from-red-500 to-rose-500 text-white",
    }
    return (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${colors[category] || "from-gray-500 to-gray-600 text-white"}`}>
            {category}
        </span>
    )
}

export default function HODPerformanceDashboardPage({ params }: { params: Promise<{ role: string }> }) {
    const { role } = React.use(params) as { role: UserRole }
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [semesterInfo, setSemesterInfo] = useState({ semester: 0, year: 0 })
    const [hodPerformance, setHodPerformance] = useState<HODPerformance[]>([])
    const [totalHODs, setTotalHODs] = useState(0)
    const [totalRatings, setTotalRatings] = useState(0)
    const [selectedHOD, setSelectedHOD] = useState<HODPerformance | null>(null)

    const loadData = useCallback(async () => {
        try {
            const [toggleData, dashboardData] = await Promise.all([
                apiClient.getHODEvalToggle(),
                apiClient.getHODEvalDashboard()
            ])
            setIsOpen(toggleData.is_open)
            setSemesterInfo({ semester: dashboardData.semester, year: dashboardData.year })
            setHodPerformance(dashboardData.hod_performance || [])
            setTotalHODs(dashboardData.total_hods || 0)
            setTotalRatings(dashboardData.total_ratings || 0)

            if (dashboardData.hod_performance?.length > 0 && !selectedHOD) {
                setSelectedHOD(dashboardData.hod_performance[0])
            }
        } catch (error) {
            console.error("Dashboard load error:", error)
            toast.error("Failed to load dashboard")
        } finally {
            setLoading(false)
        }
    }, [selectedHOD])

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem("auth_token")
            if (!token) { router.push("/login"); return }
            const user = await apiClient.getCurrentUser()
            if (!user || user.role !== "principal") {
                toast.error("Only the Principal can access this page")
                router.push(`/dashboard/${role}`)
                return
            }
            await loadData()
        }
        init()
    }, [role, router, loadData])

    const handleToggle = async () => {
        setToggling(true)
        try {
            const result = await apiClient.setHODEvalToggle(!isOpen)
            setIsOpen(result.is_open)
            toast.success(result.is_open ? "Report submission opened 🟢" : "Report submission closed 🔴")
        } catch (error: any) {
            toast.error(error.message || "Toggle failed")
        } finally {
            setToggling(false)
        }
    }

    const handleDownloadPDF = async () => {
        setDownloading(true)
        try {
            const blob = await apiClient.downloadHODReportPDF(semesterInfo.semester, semesterInfo.year)
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `hod_performance_report_${semesterInfo.semester === 1 ? "odd" : "even"}_${semesterInfo.year}.pdf`
            a.click()
            URL.revokeObjectURL(url)
            toast.success("PDF report downloaded!")
        } catch (error: any) {
            toast.error(error.message || "Download failed")
        } finally {
            setDownloading(false)
        }
    }

    const semesterLabel = semesterInfo.semester === 1 ? "Odd" : "Even"

    // Chart data for selected HOD
    const barChartData = selectedHOD ? [
        { name: "Student", rating: selectedHOD.avg_student_rating, fill: BAR_COLORS.student },
        { name: "Staff", rating: selectedHOD.avg_staff_rating, fill: BAR_COLORS.staff },
        { name: "Overall", rating: selectedHOD.overall_rating, fill: BAR_COLORS.overall },
    ] : []

    const studentPieData = selectedHOD ? [
        { name: "Good (4-5★)", value: selectedHOD.student_good },
        { name: "Bad (1-3★)", value: selectedHOD.student_bad },
    ] : []

    const staffPieData = selectedHOD ? [
        { name: "Good (4-5★)", value: selectedHOD.staff_good },
        { name: "Bad (1-3★)", value: selectedHOD.staff_bad },
    ] : []

    // Criteria labels
    const studentCriteriaLabels: Record<string, string> = {
        approachability: "Approachability", academic_support: "Academic Support",
        placement_guidance: "Placement Guidance", internship_support: "Internship Support",
        grievance_handling: "Grievance Handling", event_organization: "Event Organization",
        student_motivation: "Student Motivation", on_duty_permission: "OD Permission"
    }
    const staffCriteriaLabels: Record<string, string> = {
        leadership: "Leadership", workload_fairness: "Workload Fairness",
        staff_coordination: "Staff Coordination", academic_monitoring: "Academic Monitoring",
        research_encouragement: "Research/FDP", university_communication: "University Comm.",
        conflict_resolution: "Conflict Resolution", discipline_maintenance: "Discipline"
    }

    const studentCriteriaBar = selectedHOD?.student_criteria_avg
        ? Object.entries(selectedHOD.student_criteria_avg).map(([k, v]) => ({
            name: studentCriteriaLabels[k] || k, rating: v
        })) : []

    const staffCriteriaBar = selectedHOD?.staff_criteria_avg
        ? Object.entries(selectedHOD.staff_criteria_avg).map(([k, v]) => ({
            name: staffCriteriaLabels[k] || k, rating: v
        })) : []

    return (
        <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
            <Sidebar role={role} />

            <main className="flex-1 p-8 lg:p-12 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2">HOD Performance Dashboard</h1>
                                <p className="text-gray-400">{semesterLabel} Semester {semesterInfo.year}</p>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                                {/* Report Toggle */}
                                <button
                                    onClick={handleToggle}
                                    disabled={toggling}
                                    className="glass-card px-5 py-3 rounded-xl flex items-center gap-3 hover:bg-white/5 transition-all"
                                >
                                    {toggling ? (
                                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                    ) : isOpen ? (
                                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                                    ) : (
                                        <ToggleLeft className="w-8 h-8 text-red-400" />
                                    )}
                                    <div>
                                        <span className="text-sm text-gray-300">Report Submission</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                                            <span className={`text-xs font-medium ${isOpen ? "text-emerald-400" : "text-red-400"}`}>
                                                {isOpen ? "Open" : "Closed"}
                                            </span>
                                        </div>
                                    </div>
                                </button>

                                {/* PDF Download */}
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={downloading}
                                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                                >
                                    {downloading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Download className="w-5 h-5" />
                                    )}
                                    Download PDF Report
                                </button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { icon: Users, label: "Total HODs", value: totalHODs, color: "text-blue-400", bg: "from-blue-500/20 to-blue-600/10" },
                                { icon: Star, label: "Total Ratings", value: totalRatings, color: "text-yellow-400", bg: "from-yellow-500/20 to-amber-600/10" },
                                { icon: TrendingUp, label: "Avg Overall", value: hodPerformance.length > 0 ? (hodPerformance.reduce((s, h) => s + h.overall_rating, 0) / hodPerformance.length).toFixed(2) : "0", color: "text-emerald-400", bg: "from-emerald-500/20 to-green-600/10" },
                                {
                                    icon: Crown, label: "Best HOD",
                                    value: hodPerformance.find(h => h.is_best_hod)?.hod_name || "N/A",
                                    color: "text-amber-400", bg: "from-amber-500/20 to-orange-600/10"
                                },
                            ].map(({ icon: Icon, label, value, color, bg }, i) => (
                                <motion.div
                                    key={label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${bg}`}
                                >
                                    <div className="flex items-center gap-3 mb-1">
                                        <Icon className={`w-5 h-5 ${color}`} />
                                        <span className="text-sm text-gray-400">{label}</span>
                                    </div>
                                    <p className={`text-2xl font-bold ${color} truncate`}>{value}</p>
                                </motion.div>
                            ))}
                        </div>

                        {hodPerformance.length === 0 ? (
                            <div className="glass-card rounded-2xl p-12 text-center">
                                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-white mb-2">No Ratings Yet</h2>
                                <p className="text-gray-400">No HOD evaluations have been submitted this semester.</p>
                            </div>
                        ) : (
                            <>
                                {/* HOD Ranking Table */}
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 mb-8">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Trophy className="w-6 h-6 text-amber-400" />
                                        <h2 className="text-xl font-semibold text-white">HOD Performance Ranking</h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Rank</th>
                                                    <th className="text-left py-3 px-3 text-gray-400 font-medium">HOD Name</th>
                                                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Department</th>
                                                    <th className="text-center py-3 px-3 text-gray-400 font-medium">Student Avg</th>
                                                    <th className="text-center py-3 px-3 text-gray-400 font-medium">Staff Avg</th>
                                                    <th className="text-center py-3 px-3 text-gray-400 font-medium">Overall</th>
                                                    <th className="text-center py-3 px-3 text-gray-400 font-medium">Category</th>
                                                    <th className="text-center py-3 px-3 text-gray-400 font-medium">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {hodPerformance.map((hod) => (
                                                    <tr key={hod.hod_id} className={`border-b border-white/5 transition-colors hover:bg-white/5 ${selectedHOD?.hod_id === hod.hod_id ? "bg-white/5" : ""}`}>
                                                        <td className="py-3 px-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${hod.rank === 1 ? "bg-amber-500 text-white" : hod.rank === 2 ? "bg-gray-400 text-white" : hod.rank === 3 ? "bg-amber-700 text-white" : "bg-gray-700 text-gray-300"}`}>
                                                                    {hod.rank}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-white font-medium">{hod.hod_name}</span>
                                                                {hod.is_best_hod && <span title="Best Performing HOD" className="text-lg">🏆</span>}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 text-gray-400">{hod.department || "N/A"}</td>
                                                        <td className="py-3 px-3 text-center">
                                                            <span className="text-indigo-400 font-medium">{hod.avg_student_rating}/5</span>
                                                            <span className="text-gray-500 text-xs ml-1">({hod.total_student_ratings})</span>
                                                        </td>
                                                        <td className="py-3 px-3 text-center">
                                                            <span className="text-amber-400 font-medium">{hod.avg_staff_rating}/5</span>
                                                            <span className="text-gray-500 text-xs ml-1">({hod.total_staff_ratings})</span>
                                                        </td>
                                                        <td className="py-3 px-3 text-center">
                                                            <span className="text-emerald-400 font-bold text-lg">{hod.overall_rating}/5</span>
                                                        </td>
                                                        <td className="py-3 px-3 text-center">
                                                            <CategoryBadge category={hod.performance_category} />
                                                        </td>
                                                        <td className="py-3 px-3 text-center">
                                                            <button
                                                                onClick={() => setSelectedHOD(hod)}
                                                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedHOD?.hod_id === hod.hod_id
                                                                    ? "bg-blue-500 text-white"
                                                                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                                                                    }`}
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>

                                {/* Graphs Section */}
                                {selectedHOD && (
                                    <motion.div
                                        key={selectedHOD.hod_id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-semibold text-white">{selectedHOD.hod_name}</h2>
                                                <p className="text-sm text-gray-400">{selectedHOD.department || "N/A"} • Rank #{selectedHOD.rank}
                                                    {selectedHOD.is_best_hod && " 🏆 Best Performing HOD"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                            {/* Rating Comparison Bar */}
                                            <div className="glass-card rounded-2xl p-5">
                                                <h3 className="text-sm font-semibold text-gray-300 mb-4">Rating Overview</h3>
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <BarChart data={barChartData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                                        <YAxis domain={[0, 5]} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff' }} />
                                                        <Bar dataKey="rating" radius={[6, 6, 0, 0]}>
                                                            {barChartData.map((entry, i) => (
                                                                <Cell key={i} fill={entry.fill} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Student Pie */}
                                            <div className="glass-card rounded-2xl p-5">
                                                <h3 className="text-sm font-semibold text-gray-300 mb-4">Student Ratings Distribution</h3>
                                                {studentPieData[0]?.value || studentPieData[1]?.value ? (
                                                    <ResponsiveContainer width="100%" height={220}>
                                                        <PieChart>
                                                            <Pie data={studentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                                                                {studentPieData.map((_, i) => (
                                                                    <Cell key={i} fill={PIE_COLORS[i]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff' }} />
                                                            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="flex items-center justify-center h-[220px] text-gray-500">No data</div>
                                                )}
                                            </div>

                                            {/* Staff Pie */}
                                            <div className="glass-card rounded-2xl p-5">
                                                <h3 className="text-sm font-semibold text-gray-300 mb-4">Staff Ratings Distribution</h3>
                                                {staffPieData[0]?.value || staffPieData[1]?.value ? (
                                                    <ResponsiveContainer width="100%" height={220}>
                                                        <PieChart>
                                                            <Pie data={staffPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                                                                {staffPieData.map((_, i) => (
                                                                    <Cell key={i} fill={PIE_COLORS[i]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff' }} />
                                                            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="flex items-center justify-center h-[220px] text-gray-500">No data</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Per-criteria Bars */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Student Criteria */}
                                            {studentCriteriaBar.length > 0 && (
                                                <div className="glass-card rounded-2xl p-5">
                                                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Student Criteria Breakdown</h3>
                                                    <ResponsiveContainer width="100%" height={300}>
                                                        <BarChart data={studentCriteriaBar} layout="vertical">
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis type="number" domain={[0, 5]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                                            <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff' }} />
                                                            <Bar dataKey="rating" fill="#6366f1" radius={[0, 6, 6, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}

                                            {/* Staff Criteria */}
                                            {staffCriteriaBar.length > 0 && (
                                                <div className="glass-card rounded-2xl p-5">
                                                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Staff Criteria Breakdown</h3>
                                                    <ResponsiveContainer width="100%" height={300}>
                                                        <BarChart data={staffCriteriaBar} layout="vertical">
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis type="number" domain={[0, 5]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                                            <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff' }} />
                                                            <Bar dataKey="rating" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </main>
        </div>
    )
}
