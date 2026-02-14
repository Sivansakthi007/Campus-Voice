"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Star, User, Check, Loader2, Lock, AlertTriangle } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import type { UserRole } from "@/lib/constants"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface HODMember {
    id: string
    name: string
    department: string | null
    already_rated: boolean
}

const STUDENT_CRITERIA = [
    { key: "approachability", label: "Approachability" },
    { key: "academic_support", label: "Academic Support" },
    { key: "placement_guidance", label: "Placement Guidance" },
    { key: "internship_support", label: "Internship Support" },
    { key: "grievance_handling", label: "Grievance Handling" },
    { key: "event_organization", label: "Event & Workshop Organization" },
    { key: "student_motivation", label: "Student Motivation" },
    { key: "on_duty_permission", label: "On Duty Permission" },
]

const STAFF_CRITERIA = [
    { key: "leadership", label: "Leadership & Decision Making" },
    { key: "workload_fairness", label: "Workload Distribution Fairness" },
    { key: "staff_coordination", label: "Staff Coordination" },
    { key: "academic_monitoring", label: "Academic Monitoring" },
    { key: "research_encouragement", label: "Research & FDP Encouragement" },
    { key: "university_communication", label: "Communication with University" },
    { key: "conflict_resolution", label: "Conflict Resolution Ability" },
    { key: "discipline_maintenance", label: "Discipline Maintenance" },
]

function StarRating({ value, onChange, disabled = false }: {
    value: number
    onChange: (value: number) => void
    disabled?: boolean
}) {
    const [hoverValue, setHoverValue] = useState(0)

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(star)}
                    onMouseEnter={() => !disabled && setHoverValue(star)}
                    onMouseLeave={() => setHoverValue(0)}
                    className={`transition-all ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"}`}
                >
                    <Star
                        className={`w-8 h-8 ${star <= (hoverValue || value)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-500"
                            }`}
                    />
                </button>
            ))}
        </div>
    )
}

export default function HODSemesterReportPage({ params }: { params: Promise<{ role: string }> }) {
    const { role } = React.use(params) as { role: UserRole }
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [hodList, setHodList] = useState<HODMember[]>([])
    const [selectedHOD, setSelectedHOD] = useState<string>("")
    const [semesterInfo, setSemesterInfo] = useState({ semester: 0, year: 0 })
    const [isOpen, setIsOpen] = useState(false)
    const [hasSubmitted, setHasSubmitted] = useState(false)
    const [submittedRatings, setSubmittedRatings] = useState<any[]>([])
    const [userRole, setUserRole] = useState<string>("")

    const [ratings, setRatings] = useState<Record<string, number>>({})

    const criteria = userRole === "student" ? STUDENT_CRITERIA : STAFF_CRITERIA

    useEffect(() => {
        const init = async () => {
            try {
                const token = localStorage.getItem("auth_token")
                if (!token) { router.push("/login"); return }

                const currentUser = await apiClient.getCurrentUser()
                if (!currentUser || (currentUser.role !== "student" && currentUser.role !== "staff")) {
                    toast.error("Only students and staff can access this page")
                    router.push(`/dashboard/${role}`)
                    return
                }
                setUserRole(currentUser.role)

                // Initialize ratings
                const crit = currentUser.role === "student" ? STUDENT_CRITERIA : STAFF_CRITERIA
                const initialRatings: Record<string, number> = {}
                crit.forEach(c => { initialRatings[c.key] = 0 })
                setRatings(initialRatings)

                // Fetch toggle status, HOD list, and existing ratings
                const [toggleData, hodsData, myRatingData] = await Promise.all([
                    apiClient.getHODEvalToggle(),
                    apiClient.getHODsForRating(),
                    apiClient.getMyHODRating()
                ])

                setIsOpen(toggleData.is_open)
                setSemesterInfo({ semester: toggleData.semester, year: toggleData.year })
                setHodList(hodsData.hods || [])
                setSubmittedRatings(myRatingData.ratings || [])
                setHasSubmitted(myRatingData.has_submitted)
            } catch (error) {
                console.error("Failed to load data:", error)
                toast.error("Failed to load page data")
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [role, router])

    const handleSubmit = async () => {
        if (!selectedHOD) { toast.error("Please select an HOD"); return }
        const allRated = Object.values(ratings).every(v => v > 0)
        if (!allRated) { toast.error("Please rate all criteria"); return }

        setSubmitting(true)
        try {
            if (userRole === "student") {
                await apiClient.submitStudentHODRating({
                    hod_id: selectedHOD,
                    approachability: ratings.approachability,
                    academic_support: ratings.academic_support,
                    placement_guidance: ratings.placement_guidance,
                    internship_support: ratings.internship_support,
                    grievance_handling: ratings.grievance_handling,
                    event_organization: ratings.event_organization,
                    student_motivation: ratings.student_motivation,
                    on_duty_permission: ratings.on_duty_permission,
                })
            } else {
                await apiClient.submitStaffHODRating({
                    hod_id: selectedHOD,
                    leadership: ratings.leadership,
                    workload_fairness: ratings.workload_fairness,
                    staff_coordination: ratings.staff_coordination,
                    academic_monitoring: ratings.academic_monitoring,
                    research_encouragement: ratings.research_encouragement,
                    university_communication: ratings.university_communication,
                    conflict_resolution: ratings.conflict_resolution,
                    discipline_maintenance: ratings.discipline_maintenance,
                })
            }

            toast.success("HOD rating submitted successfully! ⭐")

            // Refresh data
            const [hodsData, myRatingData] = await Promise.all([
                apiClient.getHODsForRating(),
                apiClient.getMyHODRating()
            ])
            setHodList(hodsData.hods || [])
            setSubmittedRatings(myRatingData.ratings || [])
            setHasSubmitted(myRatingData.has_submitted)
            setSelectedHOD("")
            const resetRatings: Record<string, number> = {}
            criteria.forEach(c => { resetRatings[c.key] = 0 })
            setRatings(resetRatings)
        } catch (error: any) {
            toast.error(error.message || "Failed to submit rating")
        } finally {
            setSubmitting(false)
        }
    }

    const selectedHODData = hodList.find(h => h.id === selectedHOD)
    const canSubmit = selectedHOD && Object.values(ratings).every(v => v > 0) && !selectedHODData?.already_rated

    const averageRating = () => {
        const vals = Object.values(ratings).filter(v => v > 0)
        if (vals.length === 0) return 0
        return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
    }

    const semesterLabel = semesterInfo.semester === 1 ? "Odd" : "Even"

    return (
        <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
            <Sidebar role={role} />

            <main className="flex-1 p-8 lg:p-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2">
                            HOD Semester Report – {userRole === "student" ? "Students" : "Staff"}
                        </h1>
                        <p className="text-gray-400">
                            {semesterLabel} Semester {semesterInfo.year} • Rate your HOD's performance
                        </p>
                    </div>

                    {/* Closed Banner */}
                    {!isOpen && !loading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card rounded-2xl p-8 text-center mb-8 border border-red-500/30"
                        >
                            <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Report Submission Closed by Principal</h2>
                            <p className="text-gray-400">The HOD evaluation report submission is currently closed. Please contact the principal for more information.</p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                                <span className="text-red-400 font-medium">Report Submission Closed</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                        </div>
                    )}

                    {/* Form Area */}
                    {!loading && isOpen && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Rating Form */}
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-white">Submit Rating</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
                                        <span className="text-emerald-400 text-sm font-medium">Submission Open</span>
                                    </div>
                                </div>

                                {/* HOD Selection */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Select HOD</label>
                                    <select
                                        value={selectedHOD}
                                        onChange={(e) => setSelectedHOD(e.target.value)}
                                        className="w-full px-4 py-3 glass-card rounded-xl text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="" className="bg-gray-800">Choose an HOD...</option>
                                        {hodList.map((hod) => (
                                            <option key={hod.id} value={hod.id} disabled={hod.already_rated} className="bg-gray-800">
                                                {hod.name} {hod.department ? `(${hod.department})` : ""}
                                                {hod.already_rated ? " ✓ Rated" : ""}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedHODData?.already_rated && (
                                        <p className="mt-2 text-sm text-emerald-400 flex items-center gap-1">
                                            <Check className="w-4 h-4" /> Already rated this semester
                                        </p>
                                    )}
                                </div>

                                {/* Rating Criteria */}
                                <div className="space-y-5">
                                    {criteria.map(({ key, label }) => (
                                        <div key={key}>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
                                            <StarRating
                                                value={ratings[key] || 0}
                                                onChange={(value) => setRatings({ ...ratings, [key]: value })}
                                                disabled={selectedHODData?.already_rated || !selectedHOD}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Average Display */}
                                {Object.values(ratings).some(v => v > 0) && (
                                    <div className="mt-6 glass-card rounded-xl p-4 border border-blue-500/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-300 font-medium">Average Score</span>
                                            <div className="flex items-center gap-2">
                                                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                                <span className="text-2xl font-bold text-yellow-400">{averageRating()}</span>
                                                <span className="text-gray-400 text-sm">/5</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={!canSubmit || submitting}
                                    className={`mt-6 w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${canSubmit && !submitting
                                        ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:shadow-lg hover:shadow-blue-500/25"
                                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                                        }`}
                                >
                                    {submitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                                    ) : (
                                        <><Star className="w-5 h-5" /> Submit Rating</>
                                    )}
                                </button>
                            </motion.div>

                            {/* Submitted Ratings */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-2xl p-6">
                                <h2 className="text-xl font-semibold text-white mb-6">
                                    My Submitted Ratings ({semesterLabel} Semester {semesterInfo.year})
                                </h2>

                                {submittedRatings.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-400">No ratings submitted this semester</p>
                                        <p className="text-sm text-gray-500 mt-2">Select an HOD and rate them!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {submittedRatings.map((rating) => {
                                            const hodName = hodList.find(h => h.id === rating.hod_id)?.name || "HOD"
                                            const ratingCriteria = rating.rater_role === "student" ? STUDENT_CRITERIA : STAFF_CRITERIA
                                            return (
                                                <div key={rating.id} className="glass-card rounded-xl p-4 border border-white/5">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                                                                <User className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold text-white">{hodName}</h3>
                                                                <p className="text-xs text-gray-400">
                                                                    Submitted on {new Date(rating.created_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
                                                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                            <span className="text-yellow-400 font-medium">{rating.average_rating}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 mb-3">
                                                        <Lock className="w-3 h-3 text-gray-500" />
                                                        <span className="text-xs text-gray-500">Locked after submission</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        {ratingCriteria.map(({ key, label }) => (
                                                            <div key={key} className="flex justify-between text-gray-400">
                                                                <span className="truncate mr-2">{label}:</span>
                                                                <span className="text-white font-medium">{rating[key]}/5</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    )
}
