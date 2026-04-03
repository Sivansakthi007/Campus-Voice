"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
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
  UserPlus,
  Hash,
  Building2,
  Briefcase,
  ScanFace,
} from "lucide-react"
import { USER_ROLES, ROLE_COLORS, STAFF_ROLES, type UserRole } from "@/lib/constants"
import dynamic from "next/dynamic"

// Dynamically import FaceCaptureComponent (it uses browser APIs)
const FaceCaptureComponent = dynamic(
  () => import("@/components/FaceCaptureComponent"),
  { ssr: false }
)

// Use the same backend URL as the API client for production deployments
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://campus-voice-backend-cr0o.onrender.com";

// Signup approval status fetched from backend
type SignupApprovalMap = Record<string, boolean>;

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

// Roles eligible for face recognition
const FACE_RECOGNITION_ROLES: Set<string> = new Set([
  USER_ROLES.STUDENT,
  USER_ROLES.STAFF,
  USER_ROLES.HOD,
  USER_ROLES.PRINCIPAL,
  USER_ROLES.ADMIN,
])

// Roles where the Department field must be removed because they operate at the institution level.
const INSTITUTIONAL_STAFF_ROLES = new Set([
  "Librarian",
  "Physical Director",
  "Exam Cell Coordinator",
  "Accountant",
  "Transport Manager",
  "Placement & Training Coordinator",
  "Warden",
]);

// ── Component ───────────────────────────────────────────────────────
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
  const [signupApproval, setSignupApproval] = useState<SignupApprovalMap>({})

  // Face recognition state
  const [faceEnabled, setFaceEnabled] = useState(false)
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null)

  // Fetch signup approval status on mount
  useEffect(() => {
    const fetchApproval = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/signup-approval-status`, { cache: "no-store" })
        const json = await res.json()
        if (json.data) setSignupApproval(json.data)
      } catch {
        // Silently fall back — allow all roles if fetch fails
      }
    }
    fetchApproval()
  }, [])

  // Reset face state when role changes
  useEffect(() => {
    setFaceEnabled(false)
    setFaceEmbedding(null)
  }, [selectedRole])

  const handleRoleSelect = (role: UserRole) => {
    // Check signup approval
    const approvalStatus = signupApproval[role]
    if (approvalStatus === false) {
      toast.error("Signup is currently disabled for this role. Please contact Admin.")
      return
    }

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
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-registration-password`, {
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

    const isInstitutionalRole = selectedRole === USER_ROLES.STAFF && INSTITUTIONAL_STAFF_ROLES.has(formData.staffRole);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: selectedRole,
          // Hide department for Principal, Admin, and Internal Staff Roles
          department: (selectedRole === USER_ROLES.PRINCIPAL || selectedRole === USER_ROLES.ADMIN || isInstitutionalRole) ? undefined : formData.department,
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
          // Include face embedding if enabled
          ...(faceEnabled && faceEmbedding
            ? { face_embedding: faceEmbedding }
            : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || data.detail || "Registration failed")
        return
      }

      if (faceEnabled && faceEmbedding) {
        toast.success("Account created with face recognition enabled! 🎉")
      } else {
        toast.success("Account created successfully!")
      }

      setTimeout(() => {
        router.push(`/login?role=${selectedRole}`)
      }, 1000)
    } catch (error) {
      toast.error("Server error. Please try again")
    }
  }

  const showFaceOption = selectedRole && FACE_RECOGNITION_ROLES.has(selectedRole)

  return (
    <div className="relative min-h-screen w-full">
      {/* Background image with dimmed filter — positioned absolutely behind everything */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/campus-auth-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          filter: "brightness(1.0) contrast(1.1) saturate(1.0)",
          zIndex: 0,
        }}
      />

      {/* Dark overlay for content visibility */}
      <div className="auth-overlay" />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
          zIndex: 2,
        }}
      />

      <div className="relative z-10 min-h-screen py-8 px-4 flex flex-col">
        <div className="container mx-auto max-w-6xl flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => (selectedRole ? setSelectedRole(null) : router.push("/welcome"))}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                CampusVoice
              </span>
            </div>
          </div>

          {/* Main container with glassmorphism */}
          <div>
            {/* Title animations */}
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-3 text-center auth-heading-glow"
            >
              Create Your Account
            </h1>
            <p className="auth-subtext text-center mb-8 text-lg">
              Choose your role and get started
            </p>

            {/* Role Selection & Form */}
            {!selectedRole && (
              <div className="max-w-4xl mx-auto glass-role-panel">
                <p className="text-center auth-subtext mb-6 text-sm md:text-lg">
                  Select your role to continue
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-4">
                  {ROLE_OPTIONS.map((role, index) => {
                    const Icon = role.icon
                    const colors = ROLE_COLORS[role.value]
                    const isDisabled = signupApproval[role.value] === false
                    return (
                      <button
                        key={role.value}
                        onClick={() => handleRoleSelect(role.value)}
                        disabled={isDisabled}
                        className={`role-card-premium glass-card p-4 md:p-6 rounded-2xl text-center group hover:border-opacity-50 transition-all ${colors.border} ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                        style={{
                          boxShadow: isDisabled ? "none" : "0 4px 20px rgba(0,0,0,0.2)",
                        }}
                      >
                        <div
                          className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-xl md:rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                        </div>
                        <h3 className="text-sm md:text-lg font-semibold text-white">{role.label}</h3>
                        <p className="text-[10px] md:text-xs text-white/50 mt-1">{role.description}</p>

                        {/* Disabled indicator */}
                        {isDisabled && (
                          <div className="mt-2 flex items-center justify-center gap-1 text-[10px] md:text-xs text-red-400/80">
                            <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            <span>Registration Closed</span>
                          </div>
                        )}

                        {/* Password Required indicator */}
                        {!isDisabled && PASSWORD_PROTECTED_ROLES.has(role.value) && (
                          <div className="mt-2 flex items-center justify-center gap-1 text-[10px] md:text-xs text-amber-400/80">
                            <Lock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            <span>Password Required</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Registration Form */}
            {selectedRole && (
              <div className="auth-form-container">
                <div className="glass-login-container rounded-2xl p-6 md:p-8 shadow-2xl">
                  {/* Selected Role Badge */}
                  <div className="flex items-center justify-center mb-6">
                    {(() => {
                      const role = ROLE_OPTIONS.find((r) => r.value === selectedRole)
                      const Icon = role?.icon
                      const colors = ROLE_COLORS[selectedRole]
                      return (
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg mb-3`}
                            style={{
                              boxShadow: `0 8px 30px rgba(0,0,0,0.3)`,
                            }}
                          >
                            {Icon && <Icon className="w-10 h-10 text-white" />}
                          </div>
                          <p className="text-sm text-gray-400">Registering as</p>
                          <p className="text-xl font-semibold text-white">{role?.label}</p>
                        </div>
                      )
                    })()}
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm auth-label mb-2">Full Name</label>
                      <div className="relative group">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 glass-input"
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm auth-label mb-2">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 glass-input"
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>

                    {/* Department (conditional) */}
                    {selectedRole !== USER_ROLES.PRINCIPAL &&
                      selectedRole !== USER_ROLES.ADMIN &&
                      !(selectedRole === USER_ROLES.STAFF && INSTITUTIONAL_STAFF_ROLES.has(formData.staffRole)) && (
                        <div>
                          <label className="block text-sm auth-label mb-2">Department</label>
                          <div className="relative group">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                            <input
                              type="text"
                              required
                              value={formData.department}
                              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                              className="w-full pl-11 pr-4 py-3 glass-input"
                              placeholder="Enter your department"
                            />
                          </div>
                        </div>
                      )}

                    {/* Student/Staff ID */}
                    <div>
                      <label className="block text-sm auth-label mb-2">
                        {selectedRole === USER_ROLES.STUDENT ? "Student ID" : "Staff ID"}
                      </label>
                      <div className="relative group">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="text"
                          required
                          value={formData.idNumber}
                          onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 glass-input"
                          placeholder={selectedRole === USER_ROLES.STUDENT ? "Enter your student ID" : "Enter your staff ID"}
                        />
                      </div>
                    </div>

                    {/* Staff Role (only for staff) */}
                    {selectedRole === USER_ROLES.STAFF && (
                      <div>
                        <label className="block text-sm auth-label mb-2">Staff Role</label>
                        <div className="relative group">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                          <select
                            required
                            value={formData.staffRole}
                            onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}
                            className="w-full pl-11 pr-4 py-3 glass-input appearance-none"
                          >
                            <option value="" disabled className="bg-gray-900 text-white">Select Staff Role</option>
                            {STAFF_ROLES.map((role) => (
                              <option key={role} value={role} className="bg-gray-900 text-white">{role}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Password */}
                    <div>
                      <label className="block text-sm auth-label mb-2">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-11 pr-12 py-3 glass-input"
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm auth-label mb-2">Confirm Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="w-full pl-11 pr-12 py-3 glass-input"
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* ═══ FACE RECOGNITION TOGGLE (Admin/Principal only) ═══ */}
                    {showFaceOption && (
                      <div className="pt-2">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                          {/* Toggle Header */}
                          <button
                            type="button"
                            onClick={() => {
                              if (faceEnabled) {
                                setFaceEnabled(false)
                                setFaceEmbedding(null)
                              } else {
                                setFaceEnabled(true)
                              }
                            }}
                            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${faceEnabled ? `bg-gradient-to-br ${ROLE_COLORS[selectedRole].gradient}` : 'bg-white/10'} transition-all duration-300`}>
                                <ScanFace className={`w-5 h-5 ${faceEnabled ? 'text-white' : 'text-gray-400'} transition-colors`} />
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-medium text-white">Enable Face Recognition</p>
                                <p className="text-[11px] text-gray-500">Optional · Login with your face</p>
                              </div>
                            </div>
                            {/* Toggle Switch */}
                            <div
                              className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${faceEnabled
                                ? 'bg-gradient-to-r ' + ROLE_COLORS[selectedRole].gradient
                                : 'bg-white/15'
                                }`}
                            >
                              <div
                                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${faceEnabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                              />
                            </div>
                          </button>

                          {/* Face Capture Area */}
                          {faceEnabled && (
                            <div className="px-4 pb-4 pt-1">
                              <FaceCaptureComponent
                                mode="register"
                                accentGradient={ROLE_COLORS[selectedRole].gradient}
                                onCapture={(embedding) => {
                                  setFaceEmbedding(embedding)
                                  toast.success("Face captured! It will be saved with your account.")
                                }}
                                onClear={() => setFaceEmbedding(null)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Optional label */}
                        <p className="text-[11px] text-gray-500 mt-2 text-center">
                          Face login is optional. You can still use email & password.
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedRole(null)}
                        className="flex-1 py-3.5 rounded-xl border border-white/15 text-white/80 hover:bg-white/10 transition-all duration-300 font-medium active:scale-95"
                      >
                        Back to Roles
                      </button>
                      <button
                        type="submit"
                        className={`flex-1 py-3.5 bg-gradient-to-r ${ROLE_COLORS[selectedRole].gradient} rounded-xl font-semibold text-white shadow-lg relative overflow-hidden transition-all active:scale-95 hover:shadow-xl hover:scale-[1.02]`}
                        style={{
                          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                        }}
                      >
                        <span className="relative z-10">Create Account</span>
                      </button>
                    </div>
                  </form>

                  {/* Login Link */}
                  <p className="text-center text-sm auth-footer-text mt-6">
                    Already have an account?{" "}
                    <button
                      onClick={() => router.push("/login")}
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Registration Password Modal */}
      {showPasswordModal && pendingRole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            className="w-full max-w-md glass-login-container rounded-2xl shadow-2xl"
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
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type={showRegPassword ? "text" : "password"}
                  placeholder="Enter registration password"
                  value={registrationPassword}
                  onChange={(e) => {
                    setRegistrationPassword(e.target.value)
                    setPasswordError("")
                  }}
                  autoFocus
                  className="w-full pl-11 pr-12 py-3 glass-input"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Error Message */}
              {passwordError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <Shield className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-400">{passwordError}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 rounded-xl border border-white/15 text-white/70 hover:bg-white/10 transition-colors font-medium active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || !registrationPassword.trim()}
                  className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${ROLE_COLORS[pendingRole].gradient} text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden active:scale-95`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Continue"
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
