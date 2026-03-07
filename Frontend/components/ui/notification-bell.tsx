"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X, ExternalLink } from "lucide-react"
import { useNotifications, type NotificationItem } from "@/components/notification-provider"
import { useRouter } from "next/navigation"

interface NotificationBellProps {
    role: string
}

export function NotificationBell({ role }: NotificationBellProps) {
    const { notifications, unreadCount, markAsRead } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen])

    const handleNotificationClick = async (notification: NotificationItem) => {
        if (!notification.is_read) {
            await markAsRead(notification.id)
        }
        setIsOpen(false)
        router.push(`/dashboard/${role}/complaint-details?id=${notification.complaint_id}`)
    }

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return ""
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        if (minutes < 1) return "Just now"
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        return `${days}d ago`
    }

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-white/10 transition-all group"
                aria-label="Notifications"
                id="notification-bell-button"
            >
                <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-full shadow-lg"
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* Notification Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[420px] glass-card rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                        id="notification-panel"
                    >
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-blue-400" />
                                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Notification List */}
                        <div className="overflow-y-auto max-h-[360px] divide-y divide-white/5">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-all group ${!notification.is_read ? "bg-blue-500/5" : ""
                                            }`}
                                        id={`notification-item-${notification.id}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Unread indicator */}
                                            <div className="mt-1.5 flex-shrink-0">
                                                {!notification.is_read ? (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-gray-700" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${!notification.is_read ? "text-white" : "text-gray-400"}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center justify-between mt-1.5">
                                                    {notification.category && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/10 text-violet-400 rounded-full font-medium">
                                                            {notification.category}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-600">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
