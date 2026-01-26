"use client"
import React, { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  User,
  Hash,
  TrendingUp,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserPlus,
  MessageSquare,
  Trash2,
  Loader2,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { type UserRole, USER_ROLES, COMPLAINT_STATUS } from "@/lib/constants"
import { type Complaint } from "@/lib/mock-data"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { ComplaintTimeline } from "@/components/ui/complaint-timeline"

export default function ComplaintDetailsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = React.use(params) as { role: UserRole }
  const router = useRouter()
  const searchParams = useSearchParams()
  const complaintId = searchParams.get("id")

  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState("")

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [remark, setRemark] = useState("")
  const [selectedStaff, setSelectedStaff] = useState<string>("")
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; department?: string }>>([])

  // Handle complaint not found (deleted by another user)
  const handleNotFound = useCallback(() => {
    toast.error("This complaint no longer exists")
    router.push(`/dashboard/${role}/complaints`)
  }, [router, role])

  useEffect(() => {
    const initPage = async () => {
      // Check auth token
      const token = localStorage.getItem("auth_token")
      if (!token) {
        router.push("/login")
        return
      }

      if (!complaintId) return

      try {
        const userData = await apiClient.getCurrentUser()
        setCurrentUser(userData)

        if (userData.role !== role) {
          router.push("/login")
          return
        }

        // Initial fetch
        const complaintData = await apiClient.getComplaint(complaintId)
        setComplaint(complaintData)

        // Show feedback form if resolved and no feedback yet
        if (complaintData.status === "resolved" && !(complaintData as any).feedback && role === USER_ROLES.STUDENT) {
          setShowFeedback(true)
        }
      } catch (error: any) {
        console.error("Failed to load complaint:", error)
        if (error?.message?.includes("404") || error?.message?.includes("not found")) {
          handleNotFound()
        } else {
          toast.error("Failed to load complaint details")
        }
      }
    }

    initPage()
  }, [complaintId, role, router, handleNotFound])

  // Real-time polling subscription
  useEffect(() => {
    if (!complaintId || !currentUser) return

    const unsubscribe = apiClient.subscribeToComplaint(
      complaintId,
      (updatedComplaint) => {
        if (updatedComplaint) {
          setComplaint(updatedComplaint)
        }
      },
      handleNotFound,
      5000 // Poll every 5 seconds
    )

    return () => {
      unsubscribe()
    }
  }, [complaintId, currentUser, handleNotFound])

  const handleFeedbackSubmit = () => {
    if (!rating) {
      toast.error("Please provide a rating")
      return
    }
    toast.success("Thank you for your feedback!")
    setShowFeedback(false)
    if (complaint) {
      setComplaint({ ...complaint, feedback: { rating, comment: feedbackComment } })
    }
  }

  const handleStatusUpdate = async () => {
    if (!complaint || !selectedStatus) {
      toast.error("Please select a status")
      return
    }

    try {
      const updated = await apiClient.updateComplaint(complaint.id, {
        status: selectedStatus
      })

      setComplaint(updated)
      toast.success("Status updated successfully")
      setShowStatusModal(false)
    } catch (error) {
      console.error("Failed to update status:", error)
      toast.error("Failed to update status")
    }
  }

  const handleAddRemark = async () => {
    if (!complaint || !remark.trim()) {
      toast.error("Please enter a remark")
      return
    }

    try {
      const updated = await apiClient.updateComplaint(complaint.id, {
        response_text: remark
      })

      setComplaint(updated)
      toast.success("Remark added successfully")
      setShowRemarkModal(false)
      setRemark("")
    } catch (error) {
      console.error("Failed to add remark:", error)
      toast.error("Failed to add remark")
    }
  }

  const handleEscalate = async () => {
    if (!complaint) return
    toast.info("Escalation requires administrative approval (Backend update pending)")
  }

  const handleAcceptReject = async (action: "accept" | "reject") => {
    if (!complaint) return

    const newStatus = action === "accept" ? "in_progress" : "rejected"

    try {
      const updated = await apiClient.updateComplaint(complaint.id, {
        status: newStatus
      })
      setComplaint(updated)
      toast.success(`Complaint ${action === "accept" ? "accepted" : "rejected"} successfully`)
    } catch (error) {
      console.error("Failed to update complaint:", error)
      toast.error("Failed to update complaint")
    }
  }

  const handleAssignStaff = async () => {
    if (!complaint || !selectedStaff) {
      toast.error("Please select a staff member")
      return
    }

    try {
      console.log("Assigning staff - Complaint ID:", complaint.id, "Staff ID:", selectedStaff)
      const updated = await apiClient.updateComplaint(complaint.id, {
        assigned_to: selectedStaff
      })

      setComplaint(updated)
      toast.success(`Complaint assigned successfully`)
      setShowAssignModal(false)
    } catch (error) {
      console.error("Failed to assign staff:", error)
      toast.error("Failed to assign staff")
    }
  }

  // Handle Complete (Delete) complaint
  const handleComplete = async () => {
    if (!complaint) return

    setIsDeleting(true)
    try {
      await apiClient.deleteComplaint(complaint.id, true)
      toast.success("Complaint completed successfully!")
      router.push(`/dashboard/${role}/complaints`)
    } catch (error: any) {
      console.error("Failed to complete complaint:", error)
      toast.error(error?.message || "Failed to complete complaint")
      setIsDeleting(false)
      setShowCompleteModal(false)
    }
  }

  useEffect(() => {
    if (!showAssignModal || !complaint) return
      ; (async () => {
        try {
          // Use new eligible-staff endpoint that excludes staff mentioned in complaint
          const result = await apiClient.getEligibleStaff(complaint.id)
          setStaffList(result.staff || [])

          // Notify user if some staff were excluded due to conflict of interest
          if (result.excluded_count > 0) {
            toast.info(
              `${result.excluded_count} staff member(s) excluded due to conflict of interest`,
              { duration: 4000 }
            )
          }
        } catch (err) {
          console.error("Failed to fetch eligible staff list:", err)
          // Fallback to all staff if endpoint fails
          try {
            const users = await apiClient.getUsers("staff")
            setStaffList(users || [])
          } catch {
            setStaffList([])
            toast.error("Could not load staff list")
          }
        }
      })()
  }, [showAssignModal, complaint])

  if (!complaint) {
    if (!complaintId) return null
    return (
      <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">Loading complaint details...</p>
        </div>
      </div>
    )
  }

  const canUpdateStatus = role === USER_ROLES.STAFF
  const canAcceptReject = role === USER_ROLES.HOD || role === USER_ROLES.PRINCIPAL || role === USER_ROLES.ADMIN
  const canAssignStaff = role === USER_ROLES.HOD || role === USER_ROLES.PRINCIPAL || role === USER_ROLES.ADMIN
  const canEscalate = role === USER_ROLES.STAFF

  // Complete button: Staff can complete if assigned to them AND status is resolved
  // Admin can complete any resolved complaint
  const canComplete =
    (role === USER_ROLES.STAFF && complaint.assignedTo === currentUser?.id && complaint.status === COMPLAINT_STATUS.RESOLVED) ||
    (role === USER_ROLES.ADMIN && complaint.status === COMPLAINT_STATUS.RESOLVED)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role} />

      <main className="flex-1 p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push(`/dashboard/${role}/complaints`)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Complaints
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">Complaint Details</h1>
            <p className="text-gray-400">View complete information about this complaint</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            {role !== USER_ROLES.STUDENT && complaint.status !== "resolved" && complaint.status !== "rejected" && (
              <>
                {canUpdateStatus && (
                  <>
                    <button
                      onClick={() => setShowStatusModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl hover:shadow-lg transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Update Status
                    </button>
                    <button
                      onClick={() => setShowRemarkModal(true)}
                      className="flex items-center gap-2 px-4 py-2 glass-card text-white rounded-xl hover:bg-white/10 transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Add Remark
                    </button>
                  </>
                )}
                {canEscalate && (
                  <button
                    onClick={handleEscalate}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Escalate
                  </button>
                )}
                {canAcceptReject && complaint.status === "submitted" && (
                  <>
                    <button
                      onClick={() => handleAcceptReject("accept")}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleAcceptReject("reject")}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                {canAssignStaff && !complaint.assignedTo && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign Staff
                  </button>
                )}
              </>
            )}

            {/* Complete Button - Shows only for Staff (assigned) or Admin when resolved */}
            {canComplete && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all animate-pulse"
              >
                <Trash2 className="w-4 h-4" />
                Complete & Archive
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Description */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">{complaint.title}</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${complaint.status === "resolved"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : complaint.status === "in_progress"
                        ? "bg-violet-500/10 text-violet-400"
                        : complaint.status === "rejected"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                  >
                    {complaint.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-300 leading-relaxed">{complaint.description}</p>
              </div>

              {/* AI Analysis */}
              {complaint.aiAnalysis && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">AI Analysis</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Sentiment</p>
                      <p className="font-medium text-white capitalize">{complaint.aiAnalysis.sentiment}</p>
                    </div>
                    <div className="glass-card rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Priority</p>
                      <p className="font-medium text-white capitalize">{complaint.aiAnalysis.suggestedPriority}</p>
                    </div>
                    <div className="glass-card rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Category</p>
                      <p className="font-medium text-white">{complaint.aiAnalysis.suggestedCategory}</p>
                    </div>
                    <div className="glass-card rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Language Severity</p>
                      <p className="font-medium text-white capitalize">{complaint.aiAnalysis.foulLanguageSeverity}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {complaint.attachments && complaint.attachments.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Attachments</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {complaint.attachments.map((attachment, index) => (
                      <div key={index} className="glass-card rounded-xl p-2">
                        <img
                          src={attachment || "/placeholder.svg"}
                          alt={`Attachment ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline - Using new component */}
              <ComplaintTimeline timeline={complaint.timeline} currentStatus={complaint.status} />

              {/* Feedback Form */}
              {showFeedback && role === USER_ROLES.STUDENT && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-6 border-2 border-blue-500/30"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Rate This Resolution</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">How satisfied are you with the resolution?</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-8 h-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Additional Comments (Optional)</label>
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Share your experience..."
                      />
                    </div>
                    <button
                      onClick={handleFeedbackSubmit}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white font-medium hover:shadow-lg transition-all"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Show Existing Feedback */}
              {complaint.feedback && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Student Feedback</h3>
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${star <= complaint.feedback!.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
                      />
                    ))}
                  </div>
                  {complaint.feedback.comment && <p className="text-gray-300">{complaint.feedback.comment}</p>}
                </div>
              )}
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Created</p>
                      <p className="text-white font-medium">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Submitted by</p>
                      <p className="text-white font-medium">{complaint.studentName || "Anonymous"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Hash className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Category</p>
                      <p className="text-white font-medium">{complaint.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Priority</p>
                      <p className="text-white font-medium uppercase">{complaint.priority}</p>
                    </div>
                  </div>
                  {complaint.assignedToName && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-400">Assigned to</p>
                        <p className="text-white font-medium">{complaint.assignedToName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Evidence Tags */}
              {complaint.evidenceTags && complaint.evidenceTags.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Evidence Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {complaint.evidenceTags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Status Update Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Update Status</h3>
              <div className="space-y-3">
                {["in_progress", "resolved"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${selectedStatus === status
                      ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white"
                      : "glass-card text-gray-300 hover:bg-white/10"
                      }`}
                  >
                    {status.replace("_", " ").toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-3 glass-card text-white rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  Update
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Remark Modal */}
        {showRemarkModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Add Remark</h3>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter your remark or update..."
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRemarkModal(false)}
                  className="flex-1 px-4 py-3 glass-card text-white rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRemark}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  Add Remark
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Assign Staff Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Assign Staff Member</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {staffList.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedStaff(staff.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${selectedStaff === staff.id
                      ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white"
                      : "glass-card text-gray-300 hover:bg-white/10"
                      }`}
                  >
                    <p className="font-medium">{staff.name}</p>
                    <p className="text-sm opacity-70">{staff.department}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-3 glass-card text-white rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignStaff}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  Assign
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Complete Confirmation Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-2xl p-6 max-w-md w-full border-2 border-emerald-500/30"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Complete Complaint</h3>
                <p className="text-gray-400">
                  Are you sure you want to mark this complaint as complete? This action will permanently archive and remove the complaint from the system.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-400 mb-1">Complaint</p>
                <p className="text-white font-medium truncate">{complaint.title}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 glass-card text-white rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}