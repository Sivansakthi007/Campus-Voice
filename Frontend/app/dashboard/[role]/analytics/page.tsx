


"use client"
import React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart3, TrendingUp, Clock, CheckCircle } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import type { UserRole } from "@/lib/constants"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function AnalyticsPage({ params }: { params: { role: string } }) {
  const { role } = React.use(params) as { role: UserRole }
  const router = useRouter()
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    avgResolutionTime: "0 days",
    satisfactionRate: "0%",
  })
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await apiClient.getAnalyticsOverview()

        // Format the stats
        setStats({
          total: data.total_complaints,
          resolved: data.resolved_complaints,
          avgResolutionTime: data.avg_resolution_time ? `${data.avg_resolution_time} days` : "0 days",
          satisfactionRate: `${data.satisfaction_rate}%`,
        })

        // Set category breakdown
        setCategoryStats(data.by_category || {})
      } catch (error: any) {
        console.error("Failed to fetch analytics:", error)
        // If unauthorized, redirect to login
        if (error?.message?.includes("401") || error?.message?.includes("authenticated")) {
          router.push("/login")
        }
      }
    }

    fetchAnalytics()
  }, [role, router])


  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role} />

      <main className="flex-1 p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
            <p className="text-gray-400">Overview of your complaint statistics</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Complaints", value: stats.total, icon: BarChart3, color: "blue" },
              { label: "Resolved", value: stats.resolved, icon: CheckCircle, color: "emerald" },
              { label: "Avg Resolution", value: stats.avgResolutionTime, icon: Clock, color: "violet" },
              { label: "Satisfaction Rate", value: stats.satisfactionRate, icon: TrendingUp, color: "amber" },
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-2xl p-6"
                >
                  <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Category Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Complaints by Category</h2>
            <div className="space-y-4">
              {Object.entries(categoryStats).map(([category, count]) => {
                const percentage = ((count / stats.total) * 100).toFixed(0)
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{category}</span>
                      <span className="text-gray-400 text-sm">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
