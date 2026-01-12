"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Bot } from "lucide-react"
import { ROLE_COLORS, type UserRole } from "@/lib/constants"

interface ChatMessage {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

interface ChatbotProps {
  role: UserRole
}

export function Chatbot({ role }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hello! I'm your CampusVoice assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const colors = ROLE_COLORS[role]

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Simulate bot response
    setTimeout(() => {
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(input, role),
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    }, 1000)
  }

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br ${colors.gradient} shadow-2xl flex items-center justify-center hover:scale-110 transition-transform`}
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-40 w-96 h-[600px] glass-card rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${colors.gradient} p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">CampusVoice AI</h3>
                  <p className="text-xs text-white/80">Always here to help</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      message.sender === "user"
                        ? `bg-gradient-to-r ${colors.gradient} text-white`
                        : "glass-card text-gray-200"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                />
                <button
                  onClick={handleSend}
                  className={`bg-gradient-to-r ${colors.gradient} p-3 rounded-xl hover:opacity-90 transition-opacity`}
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function getBotResponse(input: string, role: UserRole): string {
  const lowerInput = input.toLowerCase()

  // Common responses
  if (lowerInput.includes("hello") || lowerInput.includes("hi")) {
    return "Hello! How can I assist you with your grievances today?"
  }

  if (lowerInput.includes("status")) {
    return "You can check your complaint status from the 'My Complaints' page. Each complaint shows its current status and timeline."
  }

  if (lowerInput.includes("submit") || lowerInput.includes("complaint")) {
    return "To submit a complaint, click on 'Submit Complaint' in the sidebar. You'll be guided through a 3-step process with AI assistance."
  }

  // Role-specific responses
  if (role === "student") {
    if (lowerInput.includes("anonymous")) {
      return "Yes, you can submit complaints anonymously. Your identity will be protected throughout the process."
    }
    return "Students can submit complaints, track their status, view analytics, and provide feedback once resolved. Need help with anything specific?"
  }

  if (role === "staff") {
    return "As staff, you can manage assigned complaints, update their status, and view your performance metrics. What would you like to know?"
  }

  if (role === "hod") {
    return "As HOD, you can oversee departmental complaints, manage staff assignments, and access detailed analytics. How can I help?"
  }

  if (role === "principal") {
    return "As Principal, you have access to institution-wide analytics and can handle critical escalated issues. What information do you need?"
  }

  if (role === "admin") {
    return "As Admin, you can manage all users, configure system settings, and access comprehensive analytics. What would you like to do?"
  }

  return "I'm here to help you navigate CampusVoice. You can ask me about submitting complaints, checking status, or using any feature of the system."
}
