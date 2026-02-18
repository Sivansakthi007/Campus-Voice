"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
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
} from "lucide-react"
import { USER_ROLES, ROLE_COLORS, type UserRole } from "@/lib/constants"

const ROLE_OPTIONS = [
  { value: USER_ROLES.STUDENT, label: "Student", icon: GraduationCap, description: "Submit and track complaints" },
  { value: USER_ROLES.STAFF, label: "Staff", icon: User, description: "Manage assigned complaints" },
  { value: USER_ROLES.HOD, label: "HOD", icon: Users, description: "Department oversight" },
  { value: USER_ROLES.PRINCIPAL, label: "Principal", icon: Crown, description: "Institute-wide management" },
  { value: USER_ROLES.ADMIN, label: "Admin", icon: Shield, description: "System administration" },
]

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
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
          department: formData.department,
          // Send as student_id for students, staff_id for other roles
          ...(selectedRole === USER_ROLES.STUDENT
            ? { student_id: formData.idNumber }
            : { staff_id: formData.idNumber }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.detail || "Registration failed")
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
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/welcome")}
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">CampusVoice</span>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2 text-center">Create Your Account</h1>
        <p className="text-gray-400 text-center mb-8">Choose your role and get started</p>

        {!selectedRole && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {ROLE_OPTIONS.map((role) => {
              const Icon = role.icon
              const colors = ROLE_COLORS[role.value]
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-6 rounded-xl text-center border ${colors.border}`}
                >
                  <div
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{role.label}</h3>
                  <p className="text-sm text-gray-400">{role.description}</p>
                </button>
              )
            })}
          </div>
        )}

        {selectedRole && (
          <form onSubmit={handleRegister} className="max-w-2xl mx-auto space-y-4">
            <input
              placeholder="Full Name"
              required
              className="w-full p-3 rounded bg-black/30 text-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <input
              type="email"
              placeholder="Email"
              required
              className="w-full p-3 rounded bg-black/30 text-white"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <input
              placeholder="Department"
              required
              className="w-full p-3 rounded bg-black/30 text-white"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />

            <input
              placeholder={selectedRole === USER_ROLES.STUDENT ? "Student ID" : "Staff ID"}
              required
              className="w-full p-3 rounded bg-black/30 text-white"
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
            />

            <input
              type="password"
              placeholder="Password"
              required
              className="w-full p-3 rounded bg-black/30 text-white"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <input
              type="password"
              placeholder="Confirm Password"
              required
              className="w-full p-3 rounded bg-black/30 text-white"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />

            <button
              type="submit"
              className={`w-full py-3 rounded bg-gradient-to-r ${ROLE_COLORS[selectedRole].gradient} text-white`}
            >
              Create Account
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
