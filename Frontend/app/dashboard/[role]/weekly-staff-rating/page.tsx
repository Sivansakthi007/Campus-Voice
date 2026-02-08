"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Star, User, Check, Loader2 } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import type { UserRole } from "@/lib/constants"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface StaffMember {
    id: string
    name: string
    department: string | null
    already_rated_this_week: boolean
}

interface RatingCriteria {
    key: string
    label: string
    value: number
}

const RATING_CRITERIA = [
    { key: "subject_knowledge", label: "Subject Knowledge" },
    { key: "teaching_clarity", label: "Teaching Clarity" },
    { key: "student_interaction", label: "Interaction with Students" },
    { key: "punctuality", label: "Punctuality" },
    { key: "overall_effectiveness", label: "Overall Effectiveness" },
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

export default function WeeklyStaffRatingPage({ params }: { params: Promise<{ role: string }> }) {
    const { role } = React.use(params) as { role: UserRole }
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [staffList, setStaffList] = useState<StaffMember[]>([])
    const [selectedStaff, setSelectedStaff] = useState<string>("")
    const [weekInfo, setWeekInfo] = useState({ week_number: 0, year: 0 })
    const [myRatings, setMyRatings] = useState<any[]>([])

    const [ratings, setRatings] = useState<Record<string, number>>({
        subject_knowledge: 0,
        teaching_clarity: 0,
        student_interaction: 0,
        punctuality: 0,
        overall_effectiveness: 0,
    })

    useEffect(() => {
        const init = async () => {
            try {
                const token = localStorage.getItem("auth_token")
                if (!token) {
                    router.push("/login")
                    return
                }

                const currentUser = await apiClient.getCurrentUser()
                if (!currentUser || currentUser.role !== "student") {
                    toast.error("Only students can access this page")
                    router.push(`/dashboard/${role}`)
                    return
                }

                // Fetch staff list and my ratings
                const [staffData, ratingsData] = await Promise.all([
                    apiClient.getStaffForRating(),
                    apiClient.getMyStaffRatings()
                ])

                setStaffList(staffData.staff || [])
                setWeekInfo({ week_number: staffData.week_number, year: staffData.year })
                setMyRatings(ratingsData.ratings || [])
            } catch (error) {
                console.error("Failed to load data:", error)
                toast.error("Failed to load staff data")
            } finally {
                setLoading(false)
            }
        }

        init()
    }, [role, router])

    const handleSubmit = async () => {
        if (!selectedStaff) {
            toast.error("Please select a staff member")
            return
        }

        const allRated = Object.values(ratings).every(v => v > 0)
        if (!allRated) {
            toast.error("Please rate all criteria")
            return
        }

        setSubmitting(true)
        try {
            await apiClient.submitStaffRating({
                staff_id: selectedStaff,
                subject_knowledge: ratings.subject_knowledge,
                teaching_clarity: ratings.teaching_clarity,
                student_interaction: ratings.student_interaction,
                punctuality: ratings.punctuality,
                overall_effectiveness: ratings.overall_effectiveness,
            })

            toast.success("Rating submitted successfully! ⭐")

            // Refresh data
            const [staffData, ratingsData] = await Promise.all([
                apiClient.getStaffForRating(),
                apiClient.getMyStaffRatings()
            ])
            setStaffList(staffData.staff || [])
            setMyRatings(ratingsData.ratings || [])

            // Reset form
            setSelectedStaff("")
            setRatings({
                subject_knowledge: 0,
                teaching_clarity: 0,
                student_interaction: 0,
                punctuality: 0,
                overall_effectiveness: 0,
            })
        } catch (error: any) {
            toast.error(error.message || "Failed to submit rating")
        } finally {
            setSubmitting(false)
        }
    }

    const selectedStaffData = staffList.find(s => s.id === selectedStaff)
    const canSubmit = selectedStaff &&
        Object.values(ratings).every(v => v > 0) &&
        !selectedStaffData?.already_rated_this_week

    return (
        <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
            <Sidebar role={role} />

            <main className="flex-1 p-8 lg:p-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2">Weekly Staff Rating</h1>
                        <p className="text-gray-400">
                            Rate staff performance for Week {weekInfo.week_number}, {weekInfo.year}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Rating Form */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card rounded-2xl p-6"
                        >
                            <h2 className="text-xl font-semibold text-white mb-6">Submit Rating</h2>

                            {/* Staff Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Select Staff Member
                                </label>
                                <select
                                    value={selectedStaff}
                                    onChange={(e) => setSelectedStaff(e.target.value)}
                                    className="w-full px-4 py-3 glass-card rounded-xl text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="" className="bg-gray-800">Choose a staff member...</option>
                                    {staffList.map((staff) => (
                                        <option
                                            key={staff.id}
                                            value={staff.id}
                                            disabled={staff.already_rated_this_week}
                                            className="bg-gray-800"
                                        >
                                            {staff.name} {staff.department ? `(${staff.department})` : ""}
                                            {staff.already_rated_this_week ? " ✓ Rated" : ""}
                                        </option>
                                    ))}
                                </select>
                                {selectedStaffData?.already_rated_this_week && (
                                    <p className="mt-2 text-sm text-emerald-400 flex items-center gap-1">
                                        <Check className="w-4 h-4" />
                                        Already rated this week
                                    </p>
                                )}
                            </div>

                            {/* Rating Criteria */}
                            <div className="space-y-6">
                                {RATING_CRITERIA.map(({ key, label }) => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            {label}
                                        </label>
                                        <StarRating
                                            value={ratings[key]}
                                            onChange={(value) => setRatings({ ...ratings, [key]: value })}
                                            disabled={selectedStaffData?.already_rated_this_week}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit || submitting}
                                className={`mt-8 w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${canSubmit && !submitting
                                    ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:shadow-lg hover:shadow-blue-500/25"
                                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Star className="w-5 h-5" />
                                        Submit Rating
                                    </>
                                )}
                            </button>
                        </motion.div>

                        {/* My Ratings This Week */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card rounded-2xl p-6"
                        >
                            <h2 className="text-xl font-semibold text-white mb-6">
                                My Ratings This Week
                            </h2>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                </div>
                            ) : myRatings.length === 0 ? (
                                <div className="text-center py-12">
                                    <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">No ratings submitted this week</p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Select a staff member and rate them!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {myRatings.map((rating) => (
                                        <div
                                            key={rating.id}
                                            className="glass-card rounded-xl p-4 hover:bg-white/10 transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                                                        <User className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-white">{rating.staff_name}</h3>
                                                        <p className="text-xs text-gray-400">
                                                            Rated on {new Date(rating.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
                                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-yellow-400 font-medium">
                                                        {rating.average_rating}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Subject Knowledge:</span>
                                                    <span className="text-white">{rating.subject_knowledge}/5</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Teaching Clarity:</span>
                                                    <span className="text-white">{rating.teaching_clarity}/5</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Interaction:</span>
                                                    <span className="text-white">{rating.student_interaction}/5</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Punctuality:</span>
                                                    <span className="text-white">{rating.punctuality}/5</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400 col-span-2">
                                                    <span>Overall Effectiveness:</span>
                                                    <span className="text-white">{rating.overall_effectiveness}/5</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}
