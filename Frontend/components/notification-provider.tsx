"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

export interface NotificationItem {
    id: string
    complaint_id: string
    title: string
    message: string
    category: string | null
    student_name: string | null
    is_read: boolean
    created_at: string | null
}

interface NotificationContextType {
    notifications: NotificationItem[]
    unreadCount: number
    markAsRead: (id: string) => Promise<void>
    refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    markAsRead: async () => { },
    refreshNotifications: async () => { },
})

export const useNotifications = () => useContext(NotificationContext)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const previousUnreadCount = useRef(0)
    const notifiedIds = useRef<Set<string>>(new Set())
    const router = useRouter()

    // Request browser notification permission on mount
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission()
            }
        }
    }, [])

    const fetchNotifications = useCallback(async () => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
            if (!token) return

            const data = await apiClient.getNotifications()
            setNotifications(data)

            const newUnread = data.filter((n: NotificationItem) => !n.is_read).length
            setUnreadCount(newUnread)

            // Send browser push notifications for NEW unread items
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                const newItems = data.filter(
                    (n: NotificationItem) => !n.is_read && !notifiedIds.current.has(n.id)
                )

                for (const item of newItems) {
                    notifiedIds.current.add(item.id)

                    const notification = new Notification(item.title, {
                        body: item.message,
                        icon: "/icon.svg",
                        tag: item.id,
                        data: { complaintId: item.complaint_id },
                    })

                    notification.onclick = () => {
                        window.focus()
                        // Navigate to complaint details — detect role from URL
                        const pathParts = window.location.pathname.split("/")
                        const roleIndex = pathParts.indexOf("dashboard") + 1
                        const role = roleIndex > 0 ? pathParts[roleIndex] : "staff"
                        router.push(`/dashboard/${role}/complaint-details?id=${item.complaint_id}`)
                        notification.close()
                    }
                }
            }

            previousUnreadCount.current = newUnread
        } catch (error) {
            // Silently fail — user may not be logged in
        }
    }, [router])

    // Poll for new notifications every 10 seconds
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 10000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const markAsRead = useCallback(async (id: string) => {
        try {
            await apiClient.markNotificationRead(id)
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            )
            setUnreadCount((prev) => Math.max(0, prev - 1))
        } catch (error) {
            console.error("Failed to mark notification as read:", error)
        }
    }, [])

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                refreshNotifications: fetchNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    )
}
