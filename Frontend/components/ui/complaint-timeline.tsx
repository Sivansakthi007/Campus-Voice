"use client"

import React from "react"
import { motion } from "framer-motion"
import {
    Send,
    CheckCircle,
    UserCheck,
    Clock,
    XCircle,
    User,
    Shield,
    Briefcase,
} from "lucide-react"

interface TimelineEvent {
    timestamp: string
    action?: string
    by?: string
    note?: string
    status?: string
}

interface ComplaintTimelineProps {
    timeline: TimelineEvent[]
    currentStatus: string
}

// Map status to timeline step config
const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
    submitted: {
        icon: Send,
        label: "Complaint Submitted",
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
    },
    reviewed: {
        icon: Shield,
        label: "Verified / Reviewed",
        color: "text-violet-400",
        bgColor: "bg-violet-500/20",
    },
    in_progress: {
        icon: Clock,
        label: "In Progress",
        color: "text-amber-400",
        bgColor: "bg-amber-500/20",
    },
    resolved: {
        icon: CheckCircle,
        label: "Resolved",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/20",
    },
    rejected: {
        icon: XCircle,
        label: "Rejected",
        color: "text-red-400",
        bgColor: "bg-red-500/20",
    },
}

// Get icon for action type
function getActionIcon(event: TimelineEvent): React.ElementType {
    const action = event.action?.toLowerCase() || event.note?.toLowerCase() || event.status?.toLowerCase() || ""

    if (action.includes("assigned")) return UserCheck
    if (action.includes("submitted")) return Send
    if (action.includes("verified") || action.includes("reviewed")) return Shield
    if (action.includes("resolved") || action.includes("completed")) return CheckCircle
    if (action.includes("rejected")) return XCircle
    if (action.includes("processing") || action.includes("in_progress") || action.includes("in progress")) return Clock
    if (event.status) return STATUS_CONFIG[event.status]?.icon || Briefcase

    return Briefcase
}

// Get color classes for action type
function getActionColor(event: TimelineEvent): { color: string; bgColor: string } {
    const action = event.action?.toLowerCase() || event.note?.toLowerCase() || event.status?.toLowerCase() || ""

    if (action.includes("assigned")) return { color: "text-violet-400", bgColor: "bg-violet-500/20" }
    if (action.includes("submitted")) return { color: "text-blue-400", bgColor: "bg-blue-500/20" }
    if (action.includes("verified") || action.includes("reviewed")) return { color: "text-purple-400", bgColor: "bg-purple-500/20" }
    if (action.includes("resolved") || action.includes("completed")) return { color: "text-emerald-400", bgColor: "bg-emerald-500/20" }
    if (action.includes("rejected")) return { color: "text-red-400", bgColor: "bg-red-500/20" }
    if (action.includes("processing") || action.includes("in_progress") || action.includes("in progress")) return { color: "text-amber-400", bgColor: "bg-amber-500/20" }
    if (event.status && STATUS_CONFIG[event.status]) {
        return { color: STATUS_CONFIG[event.status].color, bgColor: STATUS_CONFIG[event.status].bgColor }
    }

    return { color: "text-gray-400", bgColor: "bg-gray-500/20" }
}

// Format display text for the event
function getDisplayText(event: TimelineEvent): string {
    if (event.action) return event.action
    if (event.note) return event.note
    if (event.status) {
        const config = STATUS_CONFIG[event.status]
        if (config) return config.label
        return event.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())
    }
    return "Status Update"
}

export function ComplaintTimeline({ timeline, currentStatus }: ComplaintTimelineProps) {
    if (!timeline || timeline.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
                <p className="text-gray-400 text-center py-8">No timeline events yet</p>
            </div>
        )
    }

    return (
        <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Complaint Timeline
            </h3>

            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500/50 via-violet-500/50 to-emerald-500/50" />

                <div className="space-y-6">
                    {timeline.map((event, index) => {
                        const Icon = getActionIcon(event)
                        const { color, bgColor } = getActionColor(event)
                        const displayText = getDisplayText(event)
                        const isLatest = index === timeline.length - 1

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1, duration: 0.3 }}
                                className="relative flex gap-4"
                            >
                                {/* Icon node */}
                                <div
                                    className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${bgColor} flex items-center justify-center ring-4 ring-[rgb(24,24,32)] ${isLatest ? "animate-pulse" : ""
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${color}`} />
                                </div>

                                {/* Content */}
                                <div className={`flex-1 pb-2 ${isLatest ? "" : "opacity-80"}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`font-medium ${isLatest ? "text-white" : "text-gray-300"}`}>
                                            {displayText}
                                        </p>
                                        {isLatest && (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                Latest
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                        {event.by && (
                                            <>
                                                <User className="w-3 h-3" />
                                                <span>{event.by}</span>
                                                <span>•</span>
                                            </>
                                        )}
                                        <span>
                                            {new Date(event.timestamp).toLocaleString("en-US", {
                                                dateStyle: "medium",
                                                timeStyle: "short",
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* Current Status Badge */}
            <div className="mt-6 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Current Status</span>
                    <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${currentStatus === "resolved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : currentStatus === "rejected"
                                    ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                    : currentStatus === "in_progress"
                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                        : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            }`}
                    >
                        {currentStatus.replace("_", " ").toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default ComplaintTimeline
