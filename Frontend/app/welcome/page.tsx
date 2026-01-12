"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { GraduationCap, ArrowRight, Shield, Zap, Users } from "lucide-react"

export default function WelcomePage() {
  const router = useRouter()

  const features = [
    { icon: Shield, text: "Secure & Anonymous" },
    { icon: Zap, text: "AI-Powered Analysis" },
    { icon: Users, text: "Role-Based Access" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)]">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-16"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            CampusVoice
          </span>
        </motion.div>

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-6xl font-bold mb-6 leading-tight">
              <span className="text-white">Your Voice,</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                Amplified
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              A premium grievance management system designed to empower students, streamline staff workflows, and enable
              transparent resolution tracking.
            </p>

            {/* Features */}
            <div className="flex flex-wrap gap-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 glass-card rounded-full"
                >
                  <feature.icon className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/register")}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 group"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/login")}
                className="px-8 py-4 glass-card rounded-xl font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Sign In
              </motion.button>
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <div className="relative glass-card rounded-3xl p-8 shadow-2xl">
              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-2xl backdrop-blur-sm border border-white/10"
              />
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-2xl backdrop-blur-sm border border-white/10"
              />

              {/* Stats */}
              <div className="relative space-y-6">
                {[
                  { label: "Total Complaints", value: "1,234", color: "blue" },
                  { label: "Resolved", value: "987", color: "emerald" },
                  { label: "Avg Resolution Time", value: "2.5 days", color: "violet" },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="glass-card rounded-xl p-6"
                  >
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className={`text-3xl font-bold text-${stat.color}-400`}>{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
