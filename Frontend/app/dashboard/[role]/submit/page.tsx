"use client"

import React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  Upload,
  X,
  Mic,
  MicOff,
  Eye,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Brain,
  Hash,
  TrendingUp,
  ShieldAlert,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import type { UserRole, ComplaintCategory } from "@/lib/constants"
import { COMPLAINT_CATEGORIES } from "@/lib/constants"
import { mockStorage, type Complaint } from "@/lib/mock-data"
import { apiClient } from "@/lib/api"

const EVIDENCE_TAGS = ["Photo", "Video", "Document", "Screenshot", "Other"]

export default function SubmitComplaintPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = React.use(params) as { role: UserRole }
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isRecording, setIsRecording] = useState(false)
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const recognitionRef = React.useRef<any>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    isAnonymous: false,
    category: "",
    attachments: [] as string[],
    evidenceTags: [] as string[],
  })

  const [aiAnalysis, setAiAnalysis] = useState({
    sentiment: "urgent" as "positive" | "negative" | "angry" | "urgent",
    suggestedCategory: "" as ComplaintCategory | "",
    suggestedPriority: "high" as "low" | "medium" | "high" | "urgent",
    isDuplicate: false,
    duplicateComplaints: [] as Complaint[],
    foulLanguageSeverity: "mild" as "none" | "mild" | "moderate" | "severe",
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const fileUrls = files.map((file) => URL.createObjectURL(file))
    setFormData({ ...formData, attachments: [...formData.attachments, ...fileUrls] })
  }

  const toggleEvidenceTag = (tag: string) => {
    if (formData.evidenceTags.includes(tag)) {
      setFormData({ ...formData, evidenceTags: formData.evidenceTags.filter((t) => t !== tag) })
    } else {
      setFormData({ ...formData, evidenceTags: [...formData.evidenceTags, tag] })
    }
  }

  const handleVoiceInput = () => {
    if (!isRecording) {
      // Check for Web Speech API support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        toast.error("Voice input is not supported in this browser.")
        return
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-US"

      recognition.onstart = () => {
        setIsRecording(true)
        toast.info("Listening... Speak now.")
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setFormData((prev) => ({ ...prev, description: prev.description ? prev.description + " " + transcript : transcript }))
          toast.success("Voice input added")
        }
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        toast.error("Voice input failed: " + event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
        recognitionRef.current = null
      }

      recognitionRef.current = recognition
      recognition.start()
    } else {
      // Stop recording and finalize any recognized speech
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      toast.info("Recording stopped")
    }
  }

  const handleNext = () => {
    if (step === 1) {
      if (!formData.title || !formData.description || !formData.category) {
        toast.error("Please fill in all required fields, including Category")
        return
      }
      // Simulate AI analysis
      setStep(2)
      setTimeout(() => {
        const allComplaints = mockStorage.getAllComplaints()
        const possibleDuplicates = allComplaints
          .filter(
            (c) =>
              c.title.toLowerCase().includes(formData.title.toLowerCase().split(" ")[0]) ||
              c.description.toLowerCase().includes(formData.description.toLowerCase().split(" ").slice(0, 3).join(" ")),
          )
          .slice(0, 2)

        setAiAnalysis({
          ...aiAnalysis,
          isDuplicate: possibleDuplicates.length > 0,
          duplicateComplaints: possibleDuplicates,
          // In a real app, backend would return these. For now, we don't simulate them strictly or we leave them as user selected.
          suggestedCategory: formData.category as ComplaintCategory, // Trust user selection for this flow
        })
        setShowAIAnalysis(true)
      }, 1500)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Use the explicitly selected category. Validation ensures it is set.
      const chosenCategory = formData.category

      const complaintData = {
        title: formData.title,
        description: formData.description,
        is_anonymous: formData.isAnonymous,
        category: chosenCategory,
        voice_text: undefined, // Add voice text if available
      }

      console.log("Submitting complaint:", complaintData)
      const createdComplaint = await apiClient.createComplaint(complaintData)
      console.log("Complaint created:", createdComplaint)

      toast.success("Complaint submitted successfully!")

      // Re-fetch complaints to update UI
      router.refresh()
      router.push(`/dashboard/${role}/complaints`)
    } catch (error) {
      console.error("Failed to submit complaint:", error)
      toast.error("Failed to submit complaint. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(15,15,20)] via-[rgb(24,24,32)] to-[rgb(15,15,20)] flex">
      <Sidebar role={role} />

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>Submit Complaint</h1>
            <p style={{ color: '#D1D5DB' }}>We're here to help resolve your concerns</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/10" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
            {[1, 2, 3].map((s) => (
              <div key={s} className="relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${s <= step
                    ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg"
                    : "bg-white/10 text-gray-400"
                    }`}
                >
                  {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  {s === 1 ? "Details" : s === 2 ? "AI Analysis" : "Review"}
                </p>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-8 mt-12">
            {/* Step 1: Details */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Complaint Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief summary of your complaint"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">Description</label>
                    <button
                      onClick={handleVoiceInput}

                      className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all ${isRecording
                        ? "bg-red-500/20 text-red-400 animate-pulse"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-4 h-4" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          Voice Input
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Provide detailed information about your complaint..."
                  />
                </div>

                {/* Anonymous Toggle */}
                <div className="flex items-center gap-3 glass-card rounded-xl p-4">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={formData.isAnonymous}
                    onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/10 border-white/20"
                  />
                  <label htmlFor="anonymous" className="text-gray-300 cursor-pointer">
                    Submit anonymously (your identity will be hidden)
                  </label>
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white [&>option]:bg-[rgb(30,30,40)] [&>option]:text-white"
                  >
                    <option value="" className="bg-[rgb(30,30,40)] text-gray-400">Select category</option>
                    {COMPLAINT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[rgb(30,30,40)] text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Attachments (Optional)</label>
                  <label className="block glass-card rounded-xl p-6 border-2 border-dashed border-white/20 hover:border-blue-500/50 cursor-pointer transition-all">
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Click to upload files</p>
                      <p className="text-gray-500 text-xs mt-1">PDF, Images, Videos supported</p>
                    </div>
                  </label>

                  {/* Uploaded Files */}
                  {formData.attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="relative glass-card rounded-xl p-2 group">
                          <img
                            src={file || "/placeholder.svg"}
                            alt="attachment"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() =>
                              setFormData({
                                ...formData,
                                attachments: formData.attachments.filter((_, i) => i !== index),
                              })
                            }
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Evidence Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Evidence Type</label>
                  <div className="flex flex-wrap gap-2">
                    {EVIDENCE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleEvidenceTag(tag)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formData.evidenceTags.includes(tag)
                          ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: AI Analysis */}
            {step === 2 && (
              <div className="space-y-6">
                {!showAIAnalysis ? (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="w-20 h-20 mx-auto mb-6"
                    >
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center">
                        <Brain className="w-10 h-10 text-white" />
                      </div>
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">Analyzing Your Complaint</h3>
                    <p className="text-gray-400">AI is processing your submission...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">AI Analysis Complete</h3>
                      <p className="text-gray-400">Here's what we found</p>
                    </div>

                    {/* Sentiment */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="glass-card rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-400">Sentiment Analysis</p>
                          <p className="font-semibold text-white capitalize">{aiAnalysis.sentiment}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Category */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="glass-card rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Hash className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-400">Suggested Category</p>
                          <p className="font-semibold text-white">{aiAnalysis.suggestedCategory}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Priority */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="glass-card rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-400">Priority Level</p>
                          <p className="font-semibold text-white capitalize">{aiAnalysis.suggestedPriority}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Foul Language */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="glass-card rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <ShieldAlert className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-400">Language Severity</p>
                          <p className="font-semibold text-white capitalize">{aiAnalysis.foulLanguageSeverity}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Duplicate Check */}
                    {aiAnalysis.isDuplicate ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="glass-card rounded-xl p-4 border border-yellow-500/30"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-yellow-400 font-medium mb-1">Possible duplicate complaints found</p>
                            <p className="text-sm text-gray-400">Similar complaints have been submitted:</p>
                          </div>
                        </div>
                        <div className="space-y-2 mt-3">
                          {aiAnalysis.duplicateComplaints.map((complaint) => (
                            <div key={complaint.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                              <p className="text-white font-medium text-sm">{complaint.title}</p>
                              <p className="text-xs text-gray-400 mt-1">Status: {complaint.status}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-3">You can still proceed if your complaint is unique.</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="glass-card rounded-xl p-4 border border-emerald-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <p className="text-emerald-400 font-medium">No duplicate complaints found</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Eye className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Review Your Complaint</h3>
                  <p className="text-gray-400">Make sure everything looks correct</p>
                </div>

                <div className="space-y-4">
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-1">Title</p>
                    <p className="text-white font-medium">{formData.title}</p>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-1">Description</p>
                    <p className="text-white">{formData.description}</p>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-1">Category & Priority</p>
                    <p className="text-white font-medium">
                      {formData.category || aiAnalysis.suggestedCategory} - {aiAnalysis.suggestedPriority.toUpperCase()}
                    </p>
                  </div>
                  {formData.attachments.length > 0 && (
                    <div className="glass-card rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-2">Attachments</p>
                      <p className="text-white">{formData.attachments.length} file(s) attached</p>
                    </div>
                  )}
                  {formData.isAnonymous && (
                    <div className="glass-card rounded-xl p-4 border border-blue-500/30">
                      <p className="text-blue-400">This complaint will be submitted anonymously</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-6 py-3 glass-card rounded-xl text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={step === 2 && !showAIAnalysis}
                className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl text-white font-medium ml-auto ${step === 2 && !showAIAnalysis ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg"
                  } transition-all`}
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white font-medium ml-auto hover:shadow-lg transition-all ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {isSubmitting ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                {isSubmitting ? "Submitting..." : "Submit Complaint"}
              </button>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}                 