"use client"

// Helper to format date as DD/MM/YYYY for consistent SSR/CSR output
function formatDate(dateString: string) {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
import React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Sidebar } from "@/components/layout/sidebar"
import { Chatbot } from "@/components/chatbot"
import { ROLE_COLORS } from "@/lib/constants"
import { Users, Search, Plus, Edit, Trash2, Shield } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useEffect } from "react"

interface UserData {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  created_at: string | null
}

export default function UserManagementPage({ params }: { params: { role: string } }) {
  const { role } = React.use(params) as { role: "admin" }
  const colors = ROLE_COLORS[role]
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        const fetchedUsers = await apiClient.getUsers()
        // Map API response to expected format
        const mappedUsers = fetchedUsers.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department || "N/A",
          created_at: u.created_at,
        }))
        setUsers(mappedUsers)
      } catch (error) {
        console.error("Failed to fetch users:", error)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "all" || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const stats = {
    total: users.length,
    students: users.filter((u) => u.role === "student").length,
    staff: users.filter((u) => u.role === "staff").length,
    active: users.length, // All database users are considered active
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
      <Sidebar role={role} />
      <main className="flex-1 p-8 lg:ml-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
              <p className="text-gray-400">Manage all system users and permissions</p>
            </div>
            <button
              className={`flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${colors.gradient} text-white hover:opacity-90 transition-opacity`}
            >
              <Plus className="w-5 h-5" />
              Add User
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Users", value: stats.total, icon: Users },
              { label: "Students", value: stats.students, icon: Users },
              { label: "Staff Members", value: stats.staff, icon: Shield },
              { label: "Active Users", value: stats.active, icon: Users },
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-2xl p-6 border border-white/10"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Filters */}
          <div className="glass-card rounded-2xl p-6 border border-white/10 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="staff">Staff</option>
                <option value="hod">HOD</option>
                <option value="principal">Principal</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl border border-white/10 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">User</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Role</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Department</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Joined</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </motion.div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === "student"
                            ? "bg-blue-500/20 text-blue-400"
                            : user.role === "staff"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : user.role === "hod"
                                ? "bg-violet-500/20 text-violet-400"
                                : user.role === "principal"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                        >
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">{user.department}</td>
                      <td className="p-4">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400"
                        >
                          active
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">{user.created_at ? formatDate(user.created_at) : "N/A"}</td>
                      {/* ...existing code... */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <Edit className="w-4 h-4 text-blue-400" />
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </main>
      <Chatbot role={role} />
    </div>
  )
}
