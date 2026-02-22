"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  GraduationCap,
  User,
  Users,
  Shield,
  Crown,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  X,
  KeyRound,
  Loader2,
} from "lucide-react"
import { USER_ROLES, ROLE_COLORS, STAFF_ROLES, type UserRole } from "@/lib/constants"

const ROLE_OPTIONS = [
  { value: USER_ROLES.STUDENT, label: "Student", icon: GraduationCap, description: "Submit and track complaints" },
  { value: USER_ROLES.STAFF, label: "Staff", icon: User, description: "Manage assigned complaints" },
  { value: USER_ROLES.HOD, label: "HOD", icon: Users, description: "Department oversight" },
  { value: USER_ROLES.PRINCIPAL, label: "Principal", icon: Crown, description: "Institute-wide management" },
  { value: USER_ROLES.ADMIN, label: "Admin", icon: Shield, description: "System administration" },
]

// Roles that require a registration password
const PASSWORD_PROTECTED_ROLES: Set<string> = new Set([
  USER_ROLES.STAFF,
  USER_ROLES.HOD,
  USER_ROLES.PRINCIPAL,
  USER_ROLES.ADMIN,
])

export default function RegisterPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    idNumber: "",
    staffRole: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Registration password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null)
  const [registrationPassword, setRegistrationPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [verifiedPassword, setVerifiedPassword] = useState("")

  const handleRoleSelect = (role: UserRole) => {
    if (PASSWORD_PROTECTED_ROLES.has(role)) {
      // Show password modal for protected roles
      setPendingRole(role)
      setRegistrationPassword("")
      setPasswordError("")
      setShowRegPassword(false)
      setShowPasswordModal(true)
    } else {
      // Students go directly to the form
      setSelectedRole(role)
    }
  }

  const handlePasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingRole || !registrationPassword.trim()) {
      setPasswordError("Please enter the registration password")
      return
    }

    setVerifying(true)
    setPasswordError("")

    try {
      const response = await fetch("/api/auth/verify-registration-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: pendingRole,
          registration_password: registrationPassword,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Password verified — store it and show registration form
        setVerifiedPassword(registrationPassword)
        setSelectedRole(pendingRole)
        setShowPasswordModal(false)
        setPendingRole(null)
        setRegistrationPassword("")
      } else {
        setPasswordError(data.message || "Invalid Registration Password")
      }
    } catch {
      setPasswordError("Server error. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  const handleCloseModal = () => {
    setShowPasswordModal(false)
    setPendingRole(null)
    setRegistrationPassword("")
    setPasswordError("")
  }

  // ✅ FIXED FUNCTION
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRole) {
      toast.error("Please select a role")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: selectedRole,
          department: (selectedRole === USER_ROLES.PRINCIPAL || selectedRole === USER_ROLES.ADMIN) ? undefined : formData.department,
          // Send as student_id for students, staff_id for other roles
          ...(selectedRole === USER_ROLES.STUDENT
            ? { student_id: formData.idNumber }
            : { staff_id: formData.idNumber }),
          // Send staff_role only for staff
          ...(selectedRole === USER_ROLES.STAFF && formData.staffRole
            ? { staff_role: formData.staffRole }
            : {}),
          // Include registration password for non-student roles
          ...(PASSWORD_PROTECTED_ROLES.has(selectedRole)
            ? { registration_password: verifiedPassword }
            : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || data.detail || "Registration failed")
        return
      }

      toast.success("Account created successfully!")

      setTimeout(() => {
        router.push(`/login?role=${selectedRole}`)
      }, 1000)
    } catch (error) {
      toast.error("Server error. Please try again")
    }
  }

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: "url('/campus-voice-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark Overlay for text visibility */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen py-8 px-4 flex flex-col">
        <div className="container mx-auto max-w-6xl flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push("/welcome")}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors backdrop-blur-sm bg-white/10 px-4 py-2 rounded-xl border border-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex items-center gap-3 backdrop-blur-sm bg-white/10 px-4 py-2 rounded-xl border border-white/20">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CampusVoice</span>
            </div>
          </div>

          {/* Glassmorphism Card Container */}
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-5xl rounded-3xl border border-white/20 shadow-2xl p-8 md:p-10"
              style={{
                background: "rgba(15, 15, 25, 0.55)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center drop-shadow-lg">
                Create Your Account
              </h1>
              <p className="text-white/60 text-center mb-8">Choose your role and get started</p>

              {!selectedRole && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  {ROLE_OPTIONS.map((role) => {
                    const Icon = role.icon
                    const colors = ROLE_COLORS[role.value]
                    return (
                      <motion.button
                        key={role.value}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRoleSelect(role.value)}
                        className={`p-5 rounded-2xl text-center border ${colors.border} hover:border-white/30 transition-all duration-300`}
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <div
                          className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-base font-semibold text-white">{role.label}</h3>
                        <p className="text-xs text-white/50 mt-1">{role.description}</p>
                        {PASSWORD_PROTECTED_ROLES.has(role.value) && (
                          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-400/70">
                            <Lock className="w-3 h-3" />
                            <span>Password Required</span>
                          </div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              )}

              {selectedRole && (
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleRegister}
                  className="max-w-2xl mx-auto space-y-4"
                >
                  <input
                    placeholder="Full Name"
                    required
                    className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30 transition-all backdrop-blur-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />

                  <input
                    type="email"
                    placeholder="Email"
                    required
                    className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30 transition-all backdrop-blur-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />

                  {selectedRole !== USER_ROLES.PRINCIPAL && selectedRole !== USER_ROLES.ADMIN && (
                    <input
                      placeholder="Department"
                      required
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30 transition-all backdrop-blur-sm"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  )}

                  <input
                    placeholder={selectedRole === USER_ROLES.STUDENT ? "Student ID" : "Staff ID"}
                    required
                    className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30 transition-all backdrop-blur-sm"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  />

                  {selectedRole === USER_ROLES.STAFF && (
                    <select
                      required
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30 transition-all backdrop-blur-sm"
                      value={formData.staffRole}
                      onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}
                    >
                      <option value="" disabled className="bg-gray-900 text-white">Select Staff Role</option>
                      {STAFF_ROLES.map((role) => (
                        <option key={role} value={role} className="bg-gray-900 text-white">{role}</option>
                      ))}
                    </select>
                  )}

                  <input
                    type="password"
                    placeholder="Password"
                    required
                    className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30 transition-all backdrop-blur-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />

                  <input
                    type="password"
                    placeholder="Confirm Password"
                    required
                    className="w-full p-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30 transition-all backdrop-blur-sm"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole(null)}
                      className="flex-1 py-3 rounded-xl border border-white/20 text-white/80 hover:bg-white/10 transition-colors font-medium backdrop-blur-sm"
                    >
                      Back to Roles
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${ROLE_COLORS[selectedRole].gradient} text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      Create Account
                    </button>
                  </div>
                </motion.form>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Registration Password Modal */}
      <AnimatePresence>
        {showPasswordModal && pendingRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-2xl border border-white/15 shadow-2xl"
              style={{
                background: "rgba(15, 15, 30, 0.85)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 pb-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_COLORS[pendingRole].gradient} flex items-center justify-center`}>
                    <KeyRound className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Registration Password</h2>
                    <p className="text-sm text-white/50">
                      {ROLE_OPTIONS.find(r => r.value === pendingRole)?.label} Access
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handlePasswordVerify} className="p-6 space-y-4">
                <p className="text-sm text-white/70">
                  Enter the registration password to access the <span className="font-semibold text-white">{ROLE_OPTIONS.find(r => r.value === pendingRole)?.label}</span> registration form.
                </p>

                {/* Password Input */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    placeholder="Enter registration password"
                    value={registrationPassword}
                    onChange={(e) => {
                      setRegistrationPassword(e.target.value)
                      setPasswordError("")
                    }}
                    autoFocus
                    className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {passwordError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30"
                    >
                      <Shield className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-sm text-red-400">{passwordError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-3 rounded-xl border border-white/15 text-white/70 hover:bg-white/10 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifying || !registrationPassword.trim()}
                    className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${ROLE_COLORS[pendingRole].gradient} text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity`}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Continue"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
