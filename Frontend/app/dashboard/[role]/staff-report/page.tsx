

"use client"
import React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Search, User, Mail, Phone, Building } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import type { UserRole } from "@/lib/constants"
import { mockStorage } from "@/lib/mock-data"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

interface StaffMember {
  id: string
  name: string
  email: string
  phone?: string
  department?: string
  role?: string
}

export default function StaffReportPage({ params }: { params: { role: string } }) {
  const { role } = React.use(params) as { role: UserRole }
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const user = mockStorage.getUser()
    if (!user || user.role !== role) {
      router.push("/login")
      return
    }
  }, [role, router])

  const [staffList, setStaffList] = useState<StaffMember[]>([])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const users = await apiClient.getUsers("staff")
        // Ensure only role === 'staff' are used and map to expected fields
        const filtered = (users || [])
          .filter((u: any) => u.role === "staff")
          .map((u: any) => ({
            id: u.id || u.user_id || u._id || String(u.email),
            name: u.name || "",
            email: u.email || "",
            department: u.department || "",
            phone: u.phone || u.mobile || "",
            role: u.role || "",
          }))

        if (!cancelled) setStaffList(filtered)
      } catch (err) {
        console.error("Failed to fetch staff:", err)
        if (!cancelled) setStaffList([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredStaff = staffList.filter(
    (staff) =>
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.department || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role} />

      <main className="flex-1 p-8 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Staff Directory</h1>
            <p className="text-gray-400">View and contact staff members</p>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, department, or email..."
              className="w-full pl-12 pr-4 py-3 glass-card rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffList.length === 0 ? (
              <div className="col-span-full text-center text-gray-400 py-12">No staff registered yet</div>
            ) : filteredStaff.length === 0 ? (
              <div className="col-span-full text-center text-gray-400 py-12">No staff match your search</div>
            ) : (
              filteredStaff.map((staff, index) => (
                <motion.div
                  key={staff.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-2xl p-6 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{staff.name}</h3>
                      <p className="text-sm text-gray-400">{staff.role}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{staff.department}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300 truncate">{staff.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{staff.phone}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
