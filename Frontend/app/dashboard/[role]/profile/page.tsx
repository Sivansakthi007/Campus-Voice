"use client"
import React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { User, Mail, Building, Hash, Camera } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { apiClient } from "@/lib/api"
import { Sidebar } from "@/components/layout/sidebar"
import { type UserRole, ROLE_COLORS } from "@/lib/constants"
import { mockStorage } from "@/lib/mock-data"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ProfilePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = React.use(params) as { role: UserRole }
  const router = useRouter()
  const [user, setUser] = useState<ReturnType<typeof mockStorage.getUser>>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
  })

  // Initialize stats with default values to avoid hydration mismatch
  const [userStats, setUserStats] = useState({
    total: 0,
    resolved: 0,
    resolutionRate: 0,
  })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // First get from localStorage for immediate display
        const currentUser = mockStorage.getUser()
        if (!currentUser || currentUser.role !== role) {
          router.push("/login")
          return
        }
        setUser(currentUser)
        setFormData({
          name: currentUser.name,
          email: currentUser.email,
          department: currentUser.department || "",
        })

        // Then fetch fresh data from API to get the latest role
        if (apiClient.isAuthenticated()) {
          const freshUser = await apiClient.getCurrentUser()
          if (freshUser) {
            // Map snake_case to camelCase for studentId (API returns student_id)
            const mappedUser = {
              ...freshUser,
              studentId: (freshUser as any).student_id || freshUser.studentId || "",
              staff_id: (freshUser as any).staff_id || freshUser.staff_id || "",
              staff_role: (freshUser as any).staff_role || freshUser.staff_role || "",
            }
            setUser(mappedUser)
            mockStorage.setUser(mappedUser)
            setFormData({
              name: mappedUser.name,
              email: mappedUser.email,
              department: mappedUser.department || "",
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error)
      }
    }

    fetchUser()

    // Calculate stats on client side
    const complaints = mockStorage.getComplaints()
    const resolvedCount = complaints.filter((c) => c.status === "resolved").length
    setUserStats({
      total: complaints.length,
      resolved: resolvedCount,
      resolutionRate: complaints.length > 0 ? Math.round((resolvedCount / complaints.length) * 100) : 0,
    })
  }, [role, router])

  const handleSave = () => {
    if (!user) return
    const updatedUser = { ...user, ...formData }
    mockStorage.setUser(updatedUser)
    setUser(updatedUser)
    setIsEditing(false)
    toast.success("Profile updated successfully!")
  }

  const colors = ROLE_COLORS[role]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role} />

      <main className="flex-1 p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
            <p className="text-gray-400">Manage your personal information</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="glass-card rounded-2xl p-6">
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    <Avatar className={`w-24 h-24 rounded-full ${colors.gradient}`}>
                      {(user?.avatar || mockStorage.getProfileImage?.(user?.id || "")) ? (
                        <AvatarImage src={user?.avatar || mockStorage.getProfileImage?.(user?.id || "") || undefined} />
                      ) : (
                        <AvatarFallback>
                          <User className="w-12 h-12 text-white" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <input
                      id="profile-photo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || !user) return
                        if (!file.type.startsWith("image/")) {
                          toast.error("Please upload an image file")
                          return
                        }
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Image must be <= 2MB")
                          return
                        }

                        // Read as data URL for local persistence and immediate preview
                        const reader = new FileReader()
                        reader.onload = async () => {
                          const dataUrl = reader.result as string
                          try {
                            // Persist locally keyed by user id
                            const saved = mockStorage.setProfileImage?.(user.id, dataUrl)
                            if (saved === false) {
                              toast.error("Image too large to store locally. Try a smaller image.")
                              return
                            }
                            // Update stored user avatar and UI
                            const updated = { ...user, avatar: dataUrl }
                            mockStorage.setUser(updated)
                            setUser(updated)
                            toast.success("Profile photo updated locally")

                            // Attempt server upload if authenticated; ignore server failures
                            if (apiClient.isAuthenticated()) {
                              try {
                                await apiClient.uploadProfilePhoto(file)
                                toast.success("Profile photo uploaded to server")
                              } catch (err) {
                                console.warn("Server upload failed:", err)
                              }
                            }
                          } catch (err) {
                            console.error(err)
                            toast.error("Failed to save profile image")
                          }
                        }
                        reader.readAsDataURL(file)
                      }}
                    />
                    <label htmlFor="profile-photo-input" className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                      <Camera className="w-4 h-4 text-white" />
                    </label>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">{user?.name}</h2>
                  <p className={`text-sm ${colors.text} mb-4 uppercase`}>{role}</p>
                  <div className="glass-card rounded-xl p-3">
                    <p className="text-sm text-gray-400 mb-1">{role === "student" ? "Student ID" : "Staff ID"}</p>
                    <p className="text-white font-bold text-lg">
                      {role === "student"
                        ? (user?.studentId || "Student ID Not Available")
                        : (user?.staff_id || "Staff ID Not Available")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="glass-card rounded-2xl p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-400">Total Complaints</span>
                      <span className="text-white font-medium">{userStats.total}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-400">Resolved</span>
                      <span className="text-emerald-400 font-medium">{userStats.resolved}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Resolution Rate</span>
                      <span className="text-white font-medium">{userStats.resolutionRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        style={{ width: `${userStats.resolutionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="lg:col-span-2">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Personal Information</h3>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setFormData({
                            name: user?.name || "",
                            email: user?.email || "",
                            department: user?.department || "",
                          })
                        }}
                        className="px-4 py-2 glass-card rounded-xl text-gray-400 hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white hover:shadow-lg transition-all"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="flex items-center gap-3 glass-card rounded-xl p-4">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="text-white">{user?.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="flex items-center gap-3 glass-card rounded-xl p-4">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-white">{user?.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Staff Role (Conditional) */}
                  {user?.role === "staff" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Staff Role</label>
                      <div className="flex items-center gap-3 glass-card rounded-xl p-4">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="text-white">
                          {user?.staff_role || "Role Not Assigned"}
                        </span>
                      </div>
                    </div>
                  )}


                  {/* Department — hidden for Principal and Admin */}
                  {role !== "principal" && role !== "admin" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Department</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center gap-3 glass-card rounded-xl p-4">
                          <Building className="w-5 h-5 text-gray-400" />
                          <span className="text-white">{user?.department || "Not specified"}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {role === "student" ? "Student ID" : "Staff ID"}
                    </label>
                    <div className="flex items-center gap-3 glass-card rounded-xl p-4">
                      <Hash className="w-5 h-5 text-gray-400" />
                      <span className="text-white font-bold">
                        {role === "student"
                          ? (user?.studentId || "Student ID Not Available")
                          : (user?.staff_id || "Staff ID Not Available")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
