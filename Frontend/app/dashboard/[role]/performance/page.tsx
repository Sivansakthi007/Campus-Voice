"use client"
import React from "react"
import { motion } from "framer-motion"
import { Sidebar } from "@/components/layout/sidebar"
import { Chatbot } from "@/components/chatbot"
import { ROLE_COLORS } from "@/lib/constants"
import { Clock, CheckCircle, Star, Award } from "lucide-react"

export default function PerformancePage({ params }: { params: { role: string } }) {
  const { role } = React.use(params) as { role: "staff" }
  const colors = ROLE_COLORS[role]

  const performanceData = {
    totalAssigned: 45,
    resolved: 38,
    pending: 5,
    inProgress: 2,
    avgResolutionTime: "2.3 days",
    satisfactionRating: 4.6,
    thisMonth: {
      resolved: 12,
      avgTime: "1.8 days",
      rating: 4.8,
    },
  }

  const achievements = [
    { title: "Quick Resolver", description: "Resolved 10 complaints in under 24 hours", icon: Clock, earned: true },
    { title: "5-Star Staff", description: "Maintained 4.5+ rating for 3 months", icon: Star, earned: true },
    { title: "Problem Solver", description: "Resolved 50+ complaints", icon: CheckCircle, earned: false },
    { title: "Student Champion", description: "Received 100+ positive feedbacks", icon: Award, earned: false },
  ]

  const monthlyStats = [
    { month: "Jan", resolved: 8, rating: 4.5 },
    { month: "Feb", resolved: 10, rating: 4.6 },
    { month: "Mar", resolved: 12, rating: 4.8 },
    { month: "Apr", resolved: 8, rating: 4.4 },
  ]

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
      <Sidebar role={role} />
      <main className="flex-1 p-8 lg:ml-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">My Performance</h1>
            <p className="text-gray-400">Track your complaint resolution metrics and achievements</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}
                >
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Resolution Rate</h3>
              <p className="text-3xl font-bold text-white mb-1">
                {((performanceData.resolved / performanceData.totalAssigned) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {performanceData.resolved} of {performanceData.totalAssigned} complaints
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}
                >
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl">⏱️</span>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Avg Resolution Time</h3>
              <p className="text-3xl font-bold text-white mb-1">{performanceData.avgResolutionTime}</p>
              <p className="text-xs text-emerald-400">↓ 0.5 days faster than last month</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}
                >
                  <Star className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Satisfaction Rating</h3>
              <p className="text-3xl font-bold text-white mb-1">{performanceData.satisfactionRating}/5.0</p>
              <p className="text-xs text-emerald-400">↑ 0.2 points improvement</p>
            </motion.div>
          </div>

          {/* Monthly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6 border border-white/10 mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-6">Monthly Performance Trend</h2>
            <div className="space-y-4">
              {monthlyStats.map((stat, index) => (
                <div key={stat.month} className="flex items-center gap-4">
                  <div className="w-16 text-sm text-gray-400">{stat.month}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(stat.resolved / 12) * 100}%` }}
                          transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                          className={`h-full bg-gradient-to-r ${colors.gradient}`}
                        />
                      </div>
                      <div className="w-20 text-sm text-white">{stat.resolved} resolved</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span>{stat.rating}/5.0 rating</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <Award className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">Achievements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => {
                const Icon = achievement.icon
                return (
                  <div
                    key={achievement.title}
                    className={`p-4 rounded-xl border transition-all ${
                      achievement.earned
                        ? `bg-gradient-to-br ${colors.gradient} border-transparent`
                        : "bg-white/5 border-white/10 opacity-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${achievement.earned ? "bg-white/20" : "bg-white/10"}`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{achievement.title}</h3>
                        <p className="text-xs text-white/80">{achievement.description}</p>
                        {achievement.earned && <p className="text-xs text-white/60 mt-2">✓ Earned</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      </main>
      <Chatbot role={role} />
    </div>
  )
}
