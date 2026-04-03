"use client"

import type React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { GraduationCap, User, Users, Shield, Crown, Mail, Lock, Eye, EyeOff, ArrowLeft, ScanFace, KeyRound } from "lucide-react"
import { USER_ROLES, ROLE_COLORS, type UserRole } from "@/lib/constants"
import { mockStorage } from "@/lib/mock-data"
import { apiClient } from "@/lib/api"
import dynamic from "next/dynamic"

// Dynamically import FaceCaptureComponent (uses browser APIs)
const FaceCaptureComponent = dynamic(
  () => import("@/components/FaceCaptureComponent"),
  { ssr: false }
)

// Roles eligible for face recognition login
const FACE_RECOGNITION_ROLES: Set<string> = new Set([
  USER_ROLES.STUDENT,
  USER_ROLES.STAFF,
  USER_ROLES.HOD,
  USER_ROLES.PRINCIPAL,
  USER_ROLES.ADMIN,
])

const ROLE_OPTIONS = [
  { value: USER_ROLES.STUDENT, label: "Student", icon: GraduationCap },
  { value: USER_ROLES.STAFF, label: "Staff", icon: User },
  { value: USER_ROLES.HOD, label: "HOD", icon: Users },
  { value: USER_ROLES.PRINCIPAL, label: "Principal", icon: Crown },
  { value: USER_ROLES.ADMIN, label: "Admin", icon: Shield },
]

// ── Component ───────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  // Face login state
  const [showFaceLogin, setShowFaceLogin] = useState(false)
  const [faceLoginProcessing, setFaceLoginProcessing] = useState(false)
  const [faceLoginMessage, setFaceLoginMessage] = useState<string | null>(null)
  const [faceLoginAttempts, setFaceLoginAttempts] = useState(0)
  const faceLoginDebounceRef = useRef(false)

  useEffect(() => {
    const roleParam = searchParams.get("role") as UserRole | null
    if (roleParam && Object.values(USER_ROLES).includes(roleParam)) {
      setSelectedRole(roleParam)
    }
  }, [searchParams])

  // Reset/Auto-activate face login state when role changes
  useEffect(() => {
    const isEligible = selectedRole && FACE_RECOGNITION_ROLES.has(selectedRole)
    setShowFaceLogin(!!isEligible)
    setFaceLoginMessage(null)
    setFaceLoginProcessing(false)
    setFaceLoginAttempts(0)
    faceLoginDebounceRef.current = false
  }, [selectedRole])

  const handleFaceDetected = useCallback(async (embedding: number[]) => {
    // Debounce — prevent multiple simultaneous calls
    if (faceLoginDebounceRef.current) return
    faceLoginDebounceRef.current = true
    setFaceLoginProcessing(true)
    setFaceLoginMessage(null)

    try {
      if (!selectedRole) throw new Error("Role not selected")
      const res = await apiClient.loginWithFace(embedding, selectedRole)
      if (res && res.success && res.data?.user) {
        const user = res.data.user as any
        const persistedAvatar = mockStorage.getProfileImage?.(user.id) || null
        mockStorage.setUser({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          studentId: user.student_id || user.studentId || "",
          staff_id: user.staff_id || user.staffId || "",
          avatar: persistedAvatar || user.avatar || "",
        })
        toast.success(`Welcome back, ${user.name}! 🎉 (Face login)`)
        setTimeout(() => {
          router.push(`/dashboard/${user.role}`)
        }, 800)
        return
      }
    } catch (error: any) {
      console.error("Face login error:", error)
      const msg = error?.message || "Face not recognized."
      setFaceLoginMessage(msg.includes("not recognized") || msg.includes("No face data")
        ? "Face not recognized. Please login manually."
        : msg
      )
      setFaceLoginAttempts(prev => prev + 1)
    } finally {
      setFaceLoginProcessing(false)
      // Reset debounce after a delay to prevent rapid-fire
      setTimeout(() => {
        faceLoginDebounceRef.current = false
      }, 3000)
    }
  }, [router, selectedRole])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRole) {
      toast.error("Please select a role")
      return
    }

    try {
      const res = await apiClient.login({
        email: formData.email,
        password: formData.password,
      });
      if (!res || !res.user) {
        toast.error("Login failed: Invalid response from server");
        return;
      }
      const user = res.user as any;
      const persistedAvatar = mockStorage.getProfileImage?.(user.id) || null
      mockStorage.setUser({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        studentId: user.student_id || user.studentId || "",
        staff_id: user.staff_id || user.staffId || "",
        avatar: persistedAvatar || user.avatar || "",
      });
      toast.success(`Welcome back, ${user.name}!`);
      setTimeout(() => {
        router.push(`/dashboard/${selectedRole}`);
      }, 1000);
    } catch (error) {
      console.error("Login error:", error)
      toast.error(error instanceof Error ? error.message : "Login failed")
    }
  }

  const isFaceEligible = selectedRole && FACE_RECOGNITION_ROLES.has(selectedRole)

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: "url('/campus-auth-bg.png')",
        backgroundSize: "cover",

        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
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

      {/* Content */}
      <div className="relative z-10 min-h-screen py-12 px-4 flex flex-col">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
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
              className="text-4xl md:text-5xl font-bold text-white mb-3 text-center"
              style={{
                textShadow: "0 0 40px rgba(99, 102, 241, 0.15)",
              }}
            >
              Welcome Back
            </h1>
            <p className="text-gray-400 text-center mb-8 text-lg">
              Sign in to continue
            </p>

            {/* Role Selection */}
            {!selectedRole && (
              <div className="max-w-4xl mx-auto">
                <p className="text-center text-gray-300 mb-6 text-sm md:text-lg">
                  Select your role to continue
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-4">
                  {ROLE_OPTIONS.map((role, index) => {
                    const Icon = role.icon
                    const colors = ROLE_COLORS[role.value]
                    return (
                      <button
                        key={role.value}
                        onClick={() => setSelectedRole(role.value)}
                        className={`role-card-premium glass-card p-4 md:p-6 rounded-xl text-center group transition-all ${colors.border}`}
                        style={{
                          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        }}
                      >
                        <div
                          className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-xl md:rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                        </div>
                        <h3 className="text-sm md:text-lg font-semibold text-white">{role.label}</h3>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Login Form */}
            {selectedRole && (
              <div className="auth-form-container">
                <div className="glass-login-container rounded-2xl p-6 md:p-8 shadow-2xl">
                  {/* Selected Role Badge */}
                  <div className="flex items-center justify-center mb-8">
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
                          <p className="text-sm text-gray-400">Signing in as</p>
                          <p className="text-xl font-semibold text-white">{role?.label}</p>
                        </div>
                      )
                    })()}
                  </div>

                  {/* ═══ FACE LOGIN SECTION (Admin/Principal) ═══ */}
                  {isFaceEligible && (
                    <div className="mb-6">
                      {/* Face Login Toggle (only shown if manually closed or failed) */}
                      {!showFaceLogin && (
                        <button
                          type="button"
                          onClick={() => setShowFaceLogin(true)}
                          className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all group`}
                        >
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ROLE_COLORS[selectedRole].gradient} flex items-center justify-center`}>
                            <ScanFace className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                            Login with Face Recognition
                          </span>
                        </button>
                      )}

                      {/* Face Login Active */}
                      {showFaceLogin && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <ScanFace className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium text-white">Face Login</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowFaceLogin(false)
                                setFaceLoginMessage(null)
                                setFaceLoginProcessing(false)
                              }}
                              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              Skip →
                            </button>
                          </div>

                          <FaceCaptureComponent
                            mode="login"
                            accentGradient={ROLE_COLORS[selectedRole].gradient}
                            autoStart={true}
                            onCapture={() => {}}
                            onFaceDetected={handleFaceDetected}
                            isProcessing={faceLoginProcessing}
                          />

                          {/* Face login message */}
                          {faceLoginMessage && (
                            <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <KeyRound className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              <span className="text-xs text-amber-400">{faceLoginMessage}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show after failed face attempt */}
                      {faceLoginAttempts > 0 && !showFaceLogin && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10">
                          <ScanFace className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-xs text-gray-500">
                            Face login was not matched.{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setShowFaceLogin(true)
                                setFaceLoginMessage(null)
                                setFaceLoginAttempts(0)
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Try again
                            </button>
                          </span>
                        </div>
                      )}

                      <p className="text-[11px] text-gray-500 mt-2 text-center">
                        Face login is optional. You can still use normal login anytime.
                      </p>

                      {/* Divider */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-gray-500 uppercase tracking-wider">or login with credentials</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
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

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-11 pr-12 py-3 glass-input"
                          placeholder="Enter your password"
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

                    {/* Forgot Password */}
                    <div className="text-right">
                      <button type="button" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        Forgot password?
                      </button>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className={`w-full py-4 bg-gradient-to-r ${ROLE_COLORS[selectedRole].gradient} rounded-xl font-semibold text-white shadow-lg mt-6 relative overflow-hidden transition-all active:scale-95 hover:shadow-xl hover:scale-[1.02]`}
                      style={{
                        boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                      }}
                    >
                      <span className="relative z-10">Sign In</span>
                    </button>
                  </form>

                  {/* Register Link */}
                  <p className="text-center text-sm text-gray-400 mt-6">
                    {"Don't have an account? "}
                    <button
                      onClick={() => router.push("/register")}
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Create one
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
