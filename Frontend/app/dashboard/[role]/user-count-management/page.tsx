"use client"
import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  GraduationCap,
  User,
  Users,
  Crown,
  Loader2,
  Hash,
  Save,
  AlertTriangle,
  ShieldAlert,
  Info,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import type { UserRole } from "@/lib/constants"
import { USER_ROLES } from "@/lib/constants"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface RoleLimitData {
  max_count: number
  current_count: number
}

const ROLE_CONFIG = [
  {
    key: "student",
    label: "Students",
    description: "Maximum student registrations",
    icon: GraduationCap,
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    barColor: "bg-gradient-to-r from-blue-500 to-cyan-400",
    ring: "ring-blue-500/30",
  },
  {
    key: "staff",
    label: "Staff",
    description: "Maximum staff registrations",
    icon: User,
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    barColor: "bg-gradient-to-r from-emerald-500 to-teal-400",
    ring: "ring-emerald-500/30",
  },
  {
    key: "hod",
    label: "HOD",
    description: "Maximum HOD registrations",
    icon: Users,
    gradient: "from-violet-500 to-purple-500",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    barColor: "bg-gradient-to-r from-violet-500 to-purple-400",
    ring: "ring-violet-500/30",
  },
  {
    key: "principal",
    label: "Principal",
    description: "Maximum Principal registrations",
    icon: Crown,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    barColor: "bg-gradient-to-r from-amber-500 to-orange-400",
    ring: "ring-amber-500/30",
  },
]

export default function UserCountManagementPage({
  params,
}: {
  params: Promise<{ role: string }>
}) {
  const { role } = React.use(params) as { role: UserRole }
  const router = useRouter()
  const [limitsData, setLimitsData] = useState<Record<string, RoleLimitData>>({})
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)

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
        const data = await apiClient.getUserLimits()
        setLimitsData(data)
        // Initialize edit values
        const values: Record<string, string> = {}
        for (const key of Object.keys(data)) {
          values[key] = String(data[key].max_count)
        }
        setEditValues(values)
      } catch {
        toast.error("Failed to load user count limits")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const getUsagePercent = (current: number, max: number): number => {
    if (max <= 0) return 0
    return Math.min((current / max) * 100, 100)
  }

  const getStatusInfo = (current: number, max: number) => {
    if (max <= 0) return { status: "unlimited", color: "text-gray-400", badge: "bg-gray-500/10 text-gray-400", label: "Unlimited" }
    const percent = getUsagePercent(current, max)
    if (percent >= 100) return { status: "full", color: "text-red-400", badge: "bg-red-500/10 text-red-400", label: "Full" }
    if (percent >= 90) return { status: "warning", color: "text-amber-400", badge: "bg-amber-500/10 text-amber-400", label: "Almost Full" }
    return { status: "ok", color: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400", label: "Available" }
  }

  const handleSave = async (roleKey: string) => {
    const newMax = parseInt(editValues[roleKey] || "0", 10)
    if (isNaN(newMax) || newMax < 0) {
      toast.error("Please enter a valid non-negative number")
      return
    }
    setSaving(roleKey)
    try {
      const updated = await apiClient.updateUserLimits({ [roleKey]: newMax })
      setLimitsData(updated)
      toast.success(
        `${ROLE_CONFIG.find((r) => r.key === roleKey)?.label} limit updated to ${newMax === 0 ? "Unlimited" : newMax}`
      )
    } catch {
      toast.error("Failed to update limit")
    } finally {
      setSaving(null)
    }
  }

  const handleSaveAll = async () => {
    const updates: Record<string, number> = {}
    for (const cfg of ROLE_CONFIG) {
      const val = parseInt(editValues[cfg.key] || "0", 10)
      if (isNaN(val) || val < 0) {
        toast.error(`Invalid value for ${cfg.label}`)
        return
      }
      updates[cfg.key] = val
    }
    setSavingAll(true)
    try {
      const updated = await apiClient.updateUserLimits(updates)
      setLimitsData(updated)
      toast.success("All user limits updated successfully")
    } catch {
      toast.error("Failed to update limits")
    } finally {
      setSavingAll(false)
    }
  }

  const hasChanges = () => {
    return ROLE_CONFIG.some((cfg) => {
      const currentMax = limitsData[cfg.key]?.max_count ?? 0
      const editVal = parseInt(editValues[cfg.key] || "0", 10)
      return currentMax !== editVal
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role} />

      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Hash className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  User Count Management
                </h1>
                <p className="text-sm md:text-base text-gray-400">
                  Set maximum registration limits per role
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="max-w-4xl space-y-5">
              {ROLE_CONFIG.map((cfg, index) => {
                const Icon = cfg.icon
                const data = limitsData[cfg.key] || { max_count: 0, current_count: 0 }
                const percent = getUsagePercent(data.current_count, data.max_count)
                const statusInfo = getStatusInfo(data.current_count, data.max_count)
                const isSaving = saving === cfg.key
                const currentEditVal = parseInt(editValues[cfg.key] || "0", 10)
                const hasChanged = data.max_count !== currentEditVal

                return (
                  <motion.div
                    key={cfg.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`glass-card rounded-2xl p-5 md:p-6 transition-all ${
                      statusInfo.status === "full"
                        ? "ring-1 ring-red-500/30"
                        : statusInfo.status === "warning"
                        ? "ring-1 ring-amber-500/20"
                        : ""
                    }`}
                  >
                    {/* Top row: Icon + Title + Status badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {cfg.label}
                          </p>
                          <p className="text-sm text-gray-400">
                            {cfg.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {statusInfo.status === "full" && (
                          <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                        )}
                        {statusInfo.status === "warning" && (
                          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                        )}
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.badge}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Usage display */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Current Usage</span>
                        <span className={`text-sm font-semibold ${statusInfo.color}`}>
                          {data.current_count}
                          {data.max_count > 0 ? ` / ${data.max_count}` : " (No Limit)"}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {data.max_count > 0 && (
                        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                            className={`h-full rounded-full ${
                              percent >= 100
                                ? "bg-gradient-to-r from-red-500 to-rose-400"
                                : percent >= 90
                                ? "bg-gradient-to-r from-amber-500 to-orange-400"
                                : cfg.barColor
                            }`}
                          />
                        </div>
                      )}
                      {data.max_count <= 0 && (
                        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full w-full bg-gradient-to-r from-gray-600/40 to-gray-500/20 rounded-full" />
                        </div>
                      )}
                    </div>

                    {/* Input + Save row */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">
                          Max Limit (0 = unlimited)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editValues[cfg.key] || "0"}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [cfg.key]: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition-all text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="pt-5">
                        <button
                          onClick={() => handleSave(cfg.key)}
                          disabled={isSaving || !hasChanged}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                            hasChanged
                              ? `bg-gradient-to-r ${cfg.gradient} text-white hover:shadow-lg hover:shadow-${cfg.key === "student" ? "blue" : cfg.key === "staff" ? "emerald" : cfg.key === "hod" ? "violet" : "amber"}-500/20`
                              : "bg-white/5 text-gray-500 cursor-not-allowed"
                          } ${isSaving ? "opacity-50 cursor-wait" : ""}`}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Save All Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-end"
              >
                <button
                  onClick={handleSaveAll}
                  disabled={savingAll || !hasChanges()}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                    hasChanges()
                      ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02]"
                      : "bg-white/5 text-gray-500 cursor-not-allowed"
                  } ${savingAll ? "opacity-50 cursor-wait" : ""}`}
                >
                  {savingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save All Changes
                </button>
              </motion.div>

              {/* Info card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card rounded-2xl p-5 md:p-6 border border-indigo-500/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">How it works</p>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Set a <span className="text-cyan-400 font-medium">maximum registration limit</span> for
                      each user role. When the limit is reached, new registrations for that role will be{" "}
                      <span className="text-red-400 font-medium">blocked</span> with a notification to contact
                      the admin. Set the limit to{" "}
                      <span className="text-gray-300 font-medium">0</span> for unlimited registrations.
                      Changes apply immediately.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Available — below 90%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Almost Full — above 90%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span>Full — registrations blocked</span>
                      </div>
                    </div>
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
