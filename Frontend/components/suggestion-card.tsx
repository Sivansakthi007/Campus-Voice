"use client"

import React from "react"
import { motion } from "framer-motion"
import { ThumbsUp, MessageSquare, User, Calendar, Tag } from "lucide-react"
import { format } from "date-fns"

interface SuggestionCardProps {
    suggestion: {
        id: string
        title: string
        description: string
        category: string
        student_name: string
        vote_count: number
        has_voted: boolean
        created_at: string
        image_url?: string
    }
    onVote: (id: string) => void
    isPrincipal?: boolean
}

export function SuggestionCard({ suggestion, onVote, isPrincipal = false }: SuggestionCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 glass-card-hover flex flex-col h-full border border-white/10"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                    <Tag className="w-3 h-3" />
                    {suggestion.category}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(suggestion.created_at), "MMM d, yyyy")}
                </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{suggestion.title}</h3>
            <p className="text-gray-400 text-sm mb-6 flex-1 line-clamp-3">{suggestion.description}</p>

            {suggestion.image_url && (
                <div className="mb-4 rounded-xl overflow-hidden aspect-video bg-white/5">
                    <img
                        src={suggestion.image_url}
                        alt={suggestion.title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{suggestion.student_name || "Student"}</span>
                        <span className="text-xs text-gray-500">Suggested by</span>
                    </div>
                </div>

                {!isPrincipal && (
                    <button
                        onClick={() => onVote(suggestion.id)}
                        disabled={suggestion.has_voted}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${suggestion.has_voted
                                ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                                : "bg-white/5 hover:bg-white/10 text-white"
                            }`}
                    >
                        <ThumbsUp className={`w-4 h-4 ${suggestion.has_voted ? "fill-current" : ""}`} />
                        <span className="font-bold">{suggestion.vote_count}</span>
                    </button>
                )}

                {isPrincipal && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400">
                        <ThumbsUp className="w-4 h-4 fill-current" />
                        <span className="font-bold">{suggestion.vote_count} votes</span>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
