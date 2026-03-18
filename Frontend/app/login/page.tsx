"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { GraduationCap, User, Users, Shield, Crown, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { USER_ROLES, ROLE_COLORS, type UserRole } from "@/lib/constants"
import { mockStorage } from "@/lib/mock-data"
import { apiClient } from "@/lib/api"

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

  useEffect(() => {
    const roleParam = searchParams.get("role") as UserRole | null
    if (roleParam && Object.values(USER_ROLES).includes(roleParam)) {
      setSelectedRole(roleParam)
    }
  }, [searchParams])

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

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: "url('/signin-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Cinematic dark gradient overlay with depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(0, 0, 0, 0.55) 0%, 
              rgba(10, 5, 30, 0.7) 40%, 
              rgba(15, 10, 40, 0.8) 70%,
              rgba(5, 0, 20, 0.9) 100%
            )
          `,
        }}
      />

      {/* Depth-of-field vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen py-12 px-4">
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
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-4">
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
              <div className="max-w-md mx-auto">
                <div className="glass-login-container rounded-2xl p-8 shadow-2xl">
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
                          className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-300"
                          placeholder="your.email@example.com"
                          style={{
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                          }}
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
                          className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-300"
                          placeholder="Enter your password"
                          style={{
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                          }}
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
                      className={`w-full py-4 bg-gradient-to-r ${ROLE_COLORS[selectedRole].gradient} rounded-xl font-semibold text-white shadow-lg mt-6 relative overflow-hidden transition-transform active:scale-95`}
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
