"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Star, Trophy, Download, Loader2, Calendar, Users } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import type { UserRole } from "@/lib/constants"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface StaffPerformance {
    staff_id: string
    staff_name: string
    department: string | null
    average_rating: number
    total_ratings: number
    is_best_staff: boolean
}

interface WeeklyReport {
    week_number: number
    year: number
    week_start: string
    week_end: string
    staff_performance: StaffPerformance[]
    total_ratings: number
}

export default function StaffPerformanceReportPage({ params }: { params: Promise<{ role: string }> }) {
    const { role } = React.use(params) as { role: UserRole }
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const [report, setReport] = useState<WeeklyReport | null>(null)

    useEffect(() => {
        const init = async () => {
            try {
                const token = localStorage.getItem("auth_token")
                if (!token) {
                    router.push("/login")
                    return
                }

                const currentUser = await apiClient.getCurrentUser()
                if (!currentUser || !["hod", "principal", "admin"].includes(currentUser.role)) {
                    toast.error("Access denied")
                    router.push(`/dashboard/${role}`)
                    return
                }

                const data = await apiClient.getWeeklyStaffPerformance()
                setReport(data)
            } catch (error) {
                console.error("Failed to load report:", error)
                toast.error("Failed to load performance report")
            } finally {
                setLoading(false)
            }
        }

        init()
    }, [role, router])

    const handleDownloadPDF = async () => {
        setDownloading(true)
        try {
            const blob = await apiClient.downloadWeeklyPerformancePDF()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `staff_performance_week${report?.week_number}_${report?.year}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success("PDF downloaded successfully!")
        } catch (error) {
            console.error("Download failed:", error)
            toast.error("Failed to download PDF")
        } finally {
            setDownloading(false)
        }
    }

    const renderStars = (rating: number) => {
        const fullStars = Math.floor(rating)
        const hasHalf = rating - fullStars >= 0.5

        return (
            <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-4 h-4 ${i < fullStars
                                ? "fill-yellow-400 text-yellow-400"
                                : i === fullStars && hasHalf
                                    ? "fill-yellow-400/50 text-yellow-400"
                                    : "text-gray-500"
                            }`}
                    />
                ))}
                <span className="ml-2 text-sm text-gray-300">{rating.toFixed(2)}</span>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
            <Sidebar role={role} />

            <main className="flex-1 p-8 lg:p-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">Staff Performance Report</h1>
                            {report && (
                                <p className="text-gray-400">
                                    Week {report.week_number}, {report.year} • {report.week_start} to {report.week_end}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={downloading || !report?.staff_performance?.length}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${downloading || !report?.staff_performance?.length
                                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25"
                                }`}
                        >
                            {downloading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5" />
                                    Download PDF
                                </>
                            )}
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                        </div>
                    ) : !report?.staff_performance?.length ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass-card rounded-2xl p-12 text-center"
                        >
                            <Star className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                            <h2 className="text-2xl font-semibold text-white mb-2">No Ratings This Week</h2>
                            <p className="text-gray-400">
                                No staff have received ratings for Week {report?.week_number}, {report?.year}.
                                <br />
                                Ratings will appear here once students submit them.
                            </p>
                        </motion.div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card rounded-2xl p-6"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                            <Users className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-white">{report.staff_performance.length}</p>
                                            <p className="text-sm text-gray-400">Staff Rated</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="glass-card rounded-2xl p-6"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                                            <Star className="w-6 h-6 text-yellow-400" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-white">{report.total_ratings}</p>
                                            <p className="text-sm text-gray-400">Total Ratings</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="glass-card rounded-2xl p-6"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                            <Calendar className="w-6 h-6 text-violet-400" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-white">Week {report.week_number}</p>
                                            <p className="text-sm text-gray-400">{report.year}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Best Staff Highlight */}
                            {report.staff_performance[0] && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="glass-card rounded-2xl p-6 mb-8 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                                            <Trophy className="w-8 h-8 text-white" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-bold text-white">
                                                    {report.staff_performance[0].staff_name}
                                                </h3>
                                                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                                                    ⭐ Best Staff of the Week
                                                </span>
                                            </div>
                                            <p className="text-gray-400">
                                                {report.staff_performance[0].department || "Department N/A"} •
                                                Average Rating: {report.staff_performance[0].average_rating.toFixed(2)}/5.0 •
                                                {report.staff_performance[0].total_ratings} rating{report.staff_performance[0].total_ratings !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Performance Table */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="glass-card rounded-2xl overflow-hidden"
                            >
                                <div className="p-6 border-b border-white/10">
                                    <h2 className="text-xl font-semibold text-white">Staff Rankings</h2>
                                    <p className="text-sm text-gray-400">Sorted by average rating (highest first)</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Rank</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Staff Name</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Department</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Average Rating</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Total Ratings</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Badge</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.staff_performance.map((staff, index) => (
                                                <tr
                                                    key={staff.staff_id}
                                                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${index === 0 ? "bg-yellow-500/5" : ""
                                                        }`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <span className={`text-lg font-bold ${index === 0 ? "text-yellow-400" :
                                                                index === 1 ? "text-gray-300" :
                                                                    index === 2 ? "text-amber-600" : "text-gray-500"
                                                            }`}>
                                                            #{index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-white font-medium">{staff.staff_name}</td>
                                                    <td className="px-6 py-4 text-gray-400">{staff.department || "N/A"}</td>
                                                    <td className="px-6 py-4">{renderStars(staff.average_rating)}</td>
                                                    <td className="px-6 py-4 text-gray-300">{staff.total_ratings}</td>
                                                    <td className="px-6 py-4">
                                                        {staff.is_best_staff && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                                                                <Trophy className="w-3 h-3" />
                                                                Best Staff
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        </>
                    )}
                </motion.div>
            </main>
        </div>
    )
}
