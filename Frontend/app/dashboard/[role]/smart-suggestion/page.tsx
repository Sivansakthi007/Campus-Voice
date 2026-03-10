"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Lightbulb,
    Plus,
    Search,
    Filter,
    AlertCircle,
    TrendingUp,
    Clock,
    X,
    Image as ImageIcon,
    Loader2
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { apiClient } from "@/lib/api"
import { USER_ROLES } from "@/lib/constants"
import { SuggestionCard } from "@/components/suggestion-card"
import { toast } from "sonner"

const CATEGORIES = ["Campus", "Lab", "Library", "Hostel", "Other"]

export default function SmartSuggestionPage() {
    const router = useRouter()
    const params = useParams()
    const role = Array.isArray(params.role) ? params.role[0] : params.role

    const [suggestions, setSuggestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<"latest" | "votes">("latest")
    const [searchQuery, setSearchQuery] = useState("")
    const [filterCategory, setFilterCategory] = useState("all")

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [newSuggestion, setNewSuggestion] = useState({
        title: "",
        description: "",
        category: "Campus",
        image_url: ""
    })

    const fetchSuggestions = useCallback(async () => {
        try {
            setLoading(true)
            const data = await apiClient.getSuggestions(sortBy)
            setSuggestions(data)
            setError(null)
        } catch (err) {
            console.error("Failed to fetch suggestions:", err)
            setError("Failed to load suggestions. Please try again.")
        } finally {
            setLoading(false)
        }
    }, [sortBy])

    useEffect(() => {
        if (role) {
            fetchSuggestions()
        }
    }, [role, sortBy, fetchSuggestions])

    const handleVote = async (id: string) => {
        try {
            const res = await apiClient.voteSuggestion(id)
            toast.success("Vote recorded!")
            // Update local state
            setSuggestions(prev => prev.map(s =>
                s.id === id ? { ...s, vote_count: res.vote_count, has_voted: true } : s
            ))
        } catch (err: any) {
            toast.error(err.message || "Failed to vote")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSuggestion.title || !newSuggestion.description) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            setIsSubmitting(true)
            await apiClient.createSuggestion(newSuggestion)
            toast.success("Suggestion submitted successfully!")
            setIsModalOpen(false)
            setNewSuggestion({ title: "", description: "", category: "Campus", image_url: "" })
            fetchSuggestions()
        } catch (err: any) {
            toast.error(err.message || "Failed to submit suggestion")
        } finally {
            setIsSubmitting(false)
        }
    }

    const filteredSuggestions = suggestions.filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = filterCategory === "all" || s.category === filterCategory
        return matchesSearch && matchesCategory
    })

    const isPrincipal = role === USER_ROLES.PRINCIPAL

    return (
        <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
            <Sidebar role={role as any} />

            <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                                <Lightbulb className="text-yellow-400 w-8 h-8 md:w-10 md:h-10" />
                                Smart Suggestion
                            </h1>
                            <p className="text-gray-400 text-sm md:text-base">
                                {isPrincipal
                                    ? "Monitor top-voted student suggestions for campus improvement."
                                    : "Voice your ideas and vote on campus improvements."}
                            </p>
                        </div>
                        {!isPrincipal && role === USER_ROLES.STUDENT && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white font-medium hover:shadow-lg transition-all flex items-center gap-2 group"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                New Suggestion
                            </button>
                        )}
                    </div>

                    {/* Stats / Trending Info for Students */}
                    {!isPrincipal && filteredSuggestions.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="glass-card rounded-2xl p-6 border border-white/5 bg-blue-500/5">
                                <div className="flex items-center gap-3 mb-2 text-blue-400">
                                    <TrendingUp className="w-5 h-5" />
                                    <span className="font-bold">Trending Now</span>
                                </div>
                                <p className="text-white text-lg font-medium line-clamp-1">
                                    {suggestions[0]?.title}
                                </p>
                                <p className="text-gray-500 text-sm mt-1">Leading with {suggestions[0]?.vote_count} votes</p>
                            </div>
                        </div>
                    )}

                    {/* Search and Filters */}
                    <div className="flex flex-col lg:flex-row gap-4 mb-8">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search suggestions..."
                                className="w-full pl-12 pr-4 py-3 glass-card rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/5"
                            />
                        </div>

                        <div className="flex gap-2">
                            <div className="relative min-w-[140px]">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 glass-card rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none border border-white/5"
                                >
                                    <option value="all" className="bg-[#181820]">All Categories</option>
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c} className="bg-[#181820]">{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex rounded-xl glass-card p-1 border border-white/5">
                                <button
                                    onClick={() => setSortBy("latest")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${sortBy === "latest" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                                        }`}
                                >
                                    <Clock className="w-4 h-4" />
                                    Latest
                                </button>
                                <button
                                    onClick={() => setSortBy("votes")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${sortBy === "votes" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                                        }`}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Most Voted
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Suggestions List */}
                    {loading && suggestions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                            <p className="text-gray-400">Finding brilliant ideas...</p>
                        </div>
                    ) : error ? (
                        <div className="glass-card rounded-2xl p-12 text-center border border-red-500/10">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                            <p className="text-white mb-4">{error}</p>
                            <button
                                onClick={fetchSuggestions}
                                className="px-6 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all font-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredSuggestions.length === 0 ? (
                        <div className="glass-card rounded-2xl p-12 text-center border border-white/5">
                            <Lightbulb className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">No Suggestions Found</h3>
                            <p className="text-gray-400 mb-6">Be the first one to share a brilliant idea for campus improvement!</p>
                            {!isPrincipal && (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all"
                                >
                                    Create Suggestion
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredSuggestions.map((suggestion) => (
                                <SuggestionCard
                                    key={suggestion.id}
                                    suggestion={suggestion}
                                    onVote={handleVote}
                                    isPrincipal={isPrincipal}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </main>

            {/* Create Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg glass-card rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Plus className="text-blue-400 w-6 h-6" />
                                    New Suggestion
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                                    <input
                                        required
                                        type="text"
                                        value={newSuggestion.title}
                                        onChange={e => setNewSuggestion(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Briefly state your idea"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                                        <div className="relative">
                                            <select
                                                value={newSuggestion.category}
                                                onChange={e => setNewSuggestion(prev => ({ ...prev, category: e.target.value }))}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all"
                                            >
                                                {CATEGORIES.map(c => (
                                                    <option key={c} value={c} className="bg-[#181820]">{c}</option>
                                                ))}
                                            </select>
                                            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Optional Image Link</label>
                                        <div className="relative">
                                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="url"
                                                value={newSuggestion.image_url}
                                                onChange={e => setNewSuggestion(prev => ({ ...prev, image_url: e.target.value }))}
                                                placeholder="https://..."
                                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={newSuggestion.description}
                                        onChange={e => setNewSuggestion(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe how this will help our campus..."
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                    />
                                </div>

                                <button
                                    disabled={isSubmitting}
                                    type="submit"
                                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white font-bold hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        "Submit Suggestion"
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
