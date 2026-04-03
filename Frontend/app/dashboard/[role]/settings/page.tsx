

"use client"
import React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Bell, Lock, Moon, Sun, Shield, ScanFace, Trash2, Camera, User, Loader2 } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { USER_ROLES, ROLE_COLORS, type UserRole } from "@/lib/constants"
import { mockStorage } from "@/lib/mock-data"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useThemeToggle } from "@/hooks/use-theme-toggle"
import { apiClient } from "@/lib/api"
import dynamic from "next/dynamic"

const FaceCaptureComponent = dynamic(
  () => import("@/components/FaceCaptureComponent"),
  { ssr: false }
)


export default function SettingsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = React.use(params) as { role: UserRole }
  const router = useRouter()
  const { isDarkMode, toggleTheme, mounted } = useThemeToggle()
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true,
    twoFactor: false,
  })

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showFaceCapture, setShowFaceCapture] = useState(false)
  const [isRemovingFace, setIsRemovingFace] = useState(false)

  useEffect(() => {
    const initSettings = async () => {
      const user = mockStorage.getUser()
      if (!user || user.role !== role) {
        router.push("/login")
        return
      }

      try {
        const profileRes = await apiClient.getCurrentUser()
        if (profileRes) {
          setCurrentUser(profileRes)
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error)
        setCurrentUser(user) // Fallback to mock data
      }
    }
    initSettings()
  }, [role, router])

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] })
    toast.success("Setting updated successfully")
  }

  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    toast.success("Password changed successfully")
    setShowPasswordModal(false)
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
  }

  const handleRegisterFace = async (embedding: number[]) => {
    try {
      const res = await apiClient.registerFace(embedding)
      if (res.success) {
        toast.success("Face data updated successfully!")
        setShowFaceCapture(false)
        // Refresh profile
        const profileRes = await apiClient.getCurrentUser()
        if (profileRes) setCurrentUser(profileRes)
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to register face")
    }
  }

  const handleRemoveFace = async () => {
    if (!confirm("Are you sure you want to disable face login and remove your face data?")) return
    
    setIsRemovingFace(true)
    try {
      const res = await apiClient.removeFace()
      
      if (res.success) {
        toast.success("Face login disabled")
        // Refresh profile
        const profileRes = await apiClient.getCurrentUser()
        if (profileRes) setCurrentUser(profileRes)
      } else {
        toast.error(res.message || "Failed to remove face data")
      }
    } catch (error) {
      toast.error("Server error. Please try again.")
    } finally {
      setIsRemovingFace(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role} />

      <main className="flex-1 p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400">Manage your preferences and account settings</p>
          </div>

          <div className="max-w-3xl space-y-6">
            {/* Notifications */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Push Notifications</p>
                      <p className="text-sm text-gray-400">Receive notifications in the app</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting("notifications")}
                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.notifications ? "bg-blue-500" : "bg-gray-600"}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.notifications ? "translate-x-7" : "translate-x-1"}`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Email Alerts</p>
                      <p className="text-sm text-gray-400">Get updates via email</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting("emailAlerts")}
                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.emailAlerts ? "bg-blue-500" : "bg-gray-600"}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.emailAlerts ? "translate-x-7" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Appearance</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    {isDarkMode ? (
                      <Moon className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Sun className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">Dark Mode</p>
                    <p className="text-sm text-gray-400">Use dark theme</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    toggleTheme()
                    toast.success(`Switched to ${isDarkMode ? "Light" : "Dark"} Mode`)
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isDarkMode ? "bg-blue-500" : "bg-gray-600"}`}
                  disabled={!mounted}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isDarkMode ? "translate-x-7" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>

            {/* Security */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Security</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-400">Add an extra layer of security</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting("twoFactor")}
                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.twoFactor ? "bg-blue-500" : "bg-gray-600"}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.twoFactor ? "translate-x-7" : "translate-x-1"}`}
                    />
                  </button>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center justify-center gap-3 glass-card rounded-xl p-4 hover:bg-white/10 transition-all font-medium text-white"
                >
                  <Lock className="w-5 h-5 text-gray-400" />
                  <span>Change Password</span>
                </button>
              </div>
            </div>

            {/* Face Recognition */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Face Recognition</h3>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${currentUser?.face_enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                  {currentUser?.face_enabled ? 'ENABLED' : 'DISABLED'}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentUser?.face_enabled ? `bg-gradient-to-br ${ROLE_COLORS[role].gradient}` : 'bg-white/10'}`}>
                    <ScanFace className={`w-5 h-5 ${currentUser?.face_enabled ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Automatic Face Login</p>
                    <p className="text-sm text-gray-400">
                      {currentUser?.face_enabled 
                        ? "You can login automatically using face recognition." 
                        : "Enable face recognition for a faster and more secure login experience."}
                    </p>
                  </div>
                </div>

                {!showFaceCapture ? (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowFaceCapture(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r ${ROLE_COLORS[role].gradient} text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-95`}
                    >
                      <Camera className="w-4 h-4" />
                      {currentUser?.face_enabled ? "Update Face Data" : "Register Face"}
                    </button>
                    
                    {currentUser?.face_enabled && (
                      <button
                        onClick={handleRemoveFace}
                        disabled={isRemovingFace}
                        className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isRemovingFace ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-sm font-medium text-white italic">Face Registration</span>
                      <button 
                        onClick={() => setShowFaceCapture(false)}
                        className="text-xs text-gray-500 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <FaceCaptureComponent
                      mode="register"
                      accentGradient={ROLE_COLORS[role].gradient}
                      onCapture={handleRegisterFace}
                      onClear={() => {}}
                    />
                  </div>
                )}
              </div>
              
              <p className="text-[11px] text-gray-500 mt-4 text-center">
                Face login is optional. You can still use email & password anytime. Your face data is stored securely as a mathematical embedding.
              </p>
            </div>
          </div>
        </motion.div>

        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all"
                >
                  Update Password
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}
