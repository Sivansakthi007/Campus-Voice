"use client"
import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  GraduationCap,
  User,
  Users,
  Crown,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import type { UserRole } from "@/lib/constants"
import { USER_ROLES } from "@/lib/constants"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const ROLE_CONFIG = [
  {
    key: "student",
    label: "Student",
    description: "Allow students to create accounts",
    icon: GraduationCap,
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
  },
  {
    key: "staff",
    label: "Staff",
    description: "Allow staff members to create accounts",
    icon: User,
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  {
    key: "hod",
    label: "HOD",
    description: "Allow Heads of Department to create accounts",
    icon: Users,
    gradient: "from-violet-500 to-purple-500",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
  },
  {
    key: "principal",
    label: "Principal",
    description: "Allow the Principal to create an account",
    icon: Crown,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
]

export default function SignupApprovalPage({
  params,
}: {
  params: Promise<{ role: string }>
}) {
  const { role } = React.use(params) as { role: UserRole }
  const router = useRouter()
  const [settings, setSettings] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        if (!token) {
          router.push("/login")
          return
        }
        const user = await apiClient.getCurrentUser()
        if (!user || user.role !== USER_ROLES.ADMIN) {
          router.push("/login")
          return
        }
        const data = await apiClient.getSignupApprovalSettings()
        setSettings(data)
      } catch {
        toast.error("Failed to load signup approval settings")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleToggle = async (roleKey: string) => {
    const newValue = !settings[roleKey]
    setSaving(roleKey)
    try {
      const updated = await apiClient.updateSignupApprovalSettings({
        [roleKey]: newValue,
      })
      setSettings(updated)
      toast.success(
        `${ROLE_CONFIG.find((r) => r.key === roleKey)?.label} signup ${newValue ? "enabled" : "disabled"}`
      )
    } catch {
      toast.error("Failed to update setting")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role} />

      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  Signup Approval Settings
                </h1>
                <p className="text-sm md:text-base text-gray-400">
                  Control which roles are allowed to register
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="max-w-3xl space-y-4">
              {ROLE_CONFIG.map((cfg, index) => {
                const Icon = cfg.icon
                const enabled = settings[cfg.key] ?? true
                const isSaving = saving === cfg.key

                return (
                  <motion.div
                    key={cfg.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="glass-card rounded-2xl p-5 md:p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {cfg.label} Signup
                          </p>
                          <p className="text-sm text-gray-400">
                            {cfg.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            enabled
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {enabled ? "Enabled" : "Disabled"}
                        </span>

                        <button
                          onClick={() => handleToggle(cfg.key)}
                          disabled={isSaving}
                          className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                            enabled ? "bg-emerald-500" : "bg-gray-600"
                          } ${isSaving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                        >
                          {isSaving ? (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-white animate-spin" />
                            </span>
                          ) : (
                            <span
                              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow ${
                                enabled ? "translate-x-8" : "translate-x-1"
                              }`}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Info card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card rounded-2xl p-5 md:p-6 border border-blue-500/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">How it works</p>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      When a toggle is <span className="text-emerald-400 font-medium">ON</span>, users
                      with that role can register new accounts. When{" "}
                      <span className="text-red-400 font-medium">OFF</span>, the role
                      card is disabled on the signup page and attempts to register will be blocked.
                      Changes apply in real-time.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
