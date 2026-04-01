"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Bot, Sparkles } from "lucide-react"
import { ROLE_COLORS, type UserRole } from "@/lib/constants"
import "@/styles/chatbot.css"

/* ===== Types ===== */
interface ChatMessage {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

interface ChatbotProps {
  role: UserRole
}

/* ===== Quick Reply Suggestions ===== */
const QUICK_REPLIES = [
  "How to submit a complaint?",
  "Check my status",
  "Anonymous complaints",
  "Help",
]

/* ===== Main Component ===== */
export function Chatbot({ role }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false) // controls DOM presence
  const [animState, setAnimState] = useState<"entering" | "exiting" | "idle">("idle")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "Hello! 👋 I'm your CampusVoice assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const colors = ROLE_COLORS[role]

  /* ===== Auto-scroll to newest message ===== */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  /* ===== Focus input when chat opens ===== */
  useEffect(() => {
    if (isOpen && animState === "idle") {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, animState])

  /* ===== Open / Close with animation ===== */
  const handleOpen = () => {
    setIsVisible(true)
    setIsOpen(true)
    setAnimState("entering")
    setTimeout(() => setAnimState("idle"), 400)
  }

  const handleClose = () => {
    setAnimState("exiting")
    setTimeout(() => {
      setIsOpen(false)
      setIsVisible(false)
      setAnimState("idle")
    }, 300)
  }

  /* ===== Send message ===== */
  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input
    setInput("")

    // Show typing indicator
    setIsTyping(true)

    // Simulate bot response with delay
    const responseDelay = 800 + Math.random() * 700
    setTimeout(() => {
      setIsTyping(false)
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(currentInput, role),
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    }, responseDelay)
  }

  /* ===== Handle Enter key ===== */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ===== Handle quick reply click ===== */
  const handleQuickReply = (text: string) => {
    setInput(text)
    // Auto-send the quick reply
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)

    const responseDelay = 800 + Math.random() * 700
    setTimeout(() => {
      setIsTyping(false)
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(text, role),
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    }, responseDelay)
    setInput("")
  }

  /* ===== Format timestamp ===== */
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <>
      {/* ===== Floating Action Button ===== */}
      {!isOpen && (
        <button
          id="chatbot-fab"
          onClick={handleOpen}
          className={`chatbot-fab`}
          style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
          aria-label="Open chat assistant"
        >
          <div className={`chatbot-fab-badge`} />
          <MessageCircle />
        </button>
      )}

      {/* ===== Chat Window ===== */}
      {isVisible && (
        <div
          id="chatbot-window"
          className={`chatbot-window ${
            animState === "entering"
              ? "chatbot-entering"
              : animState === "exiting"
              ? "chatbot-exiting"
              : ""
          }`}
          role="dialog"
          aria-label="Chat assistant"
        >
          {/* --- Header --- */}
          <div
            className="chatbot-header"
            style={{
              background: `linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)`,
            }}
          >
            <div className="chatbot-header-info">
              <div className="chatbot-header-avatar">
                <Bot />
              </div>
              <div className="chatbot-header-text">
                <h3>CampusVoice AI</h3>
                <p>
                  <span className="chatbot-online-dot" />
                  Always here to help
                </p>
              </div>
            </div>
            <button
              id="chatbot-close"
              className="chatbot-header-close"
              onClick={handleClose}
              aria-label="Close chat"
            >
              <X />
            </button>
          </div>

          {/* --- Messages --- */}
          <div className="chatbot-messages" id="chatbot-messages">
            {/* Welcome state for first-time */}
            {messages.length === 1 && (
              <div className="chatbot-welcome">
                <div className="chatbot-welcome-icon">
                  <Sparkles />
                </div>
                <h4>Welcome to CampusVoice AI</h4>
                <p>
                  Ask me anything about submitting complaints, checking status,
                  or navigating the system.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`chatbot-msg ${
                  message.sender === "user"
                    ? "chatbot-msg--user"
                    : "chatbot-msg--bot"
                }`}
              >
                <div className="chatbot-msg-avatar">
                  {message.sender === "bot" ? (
                    <Bot style={{ width: 16, height: 16 }} />
                  ) : (
                    "You"
                  )}
                </div>
                <div className="chatbot-msg-content">
                  <div className="chatbot-msg-bubble">
                    {message.text}
                  </div>
                  <span className="chatbot-msg-time">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="chatbot-typing">
                <div className="chatbot-msg-avatar" style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Bot style={{ width: 14, height: 14, color: "#fff" }} />
                </div>
                <div className="chatbot-typing-bubble">
                  <div className="chatbot-typing-dot" />
                  <div className="chatbot-typing-dot" />
                  <div className="chatbot-typing-dot" />
                </div>
              </div>
            )}

            {/* Invisible anchor for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>

          {/* --- Quick Replies (shown only at start) --- */}
          {messages.length <= 2 && !isTyping && (
            <div className="chatbot-quick-replies">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  className="chatbot-quick-reply"
                  onClick={() => handleQuickReply(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* --- Input Area --- */}
          <div className="chatbot-input-area">
            <div className="chatbot-input-wrapper">
              <input
                ref={inputRef}
                id="chatbot-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="chatbot-input"
                autoComplete="off"
              />
              <button
                id="chatbot-send"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="chatbot-send-btn"
                aria-label="Send message"
              >
                <Send />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ===== Bot Response Logic ===== */
function getBotResponse(input: string, role: UserRole): string {
  const lowerInput = input.toLowerCase()

  // Greetings
  if (lowerInput.includes("hello") || lowerInput.includes("hi") || lowerInput.includes("hey")) {
    return "Hello! 😊 How can I assist you with your grievances today?"
  }

  // Help
  if (lowerInput.includes("help")) {
    return "I can help you with:\n• Submitting complaints\n• Checking complaint status\n• Anonymous submissions\n• Understanding the complaint process\n\nJust ask me anything!"
  }

  // Status
  if (lowerInput.includes("status") || lowerInput.includes("check")) {
    return "You can check your complaint status from the 'My Complaints' page. Each complaint shows its current status and timeline with real-time updates. 📊"
  }

  // Submit / complaint
  if (lowerInput.includes("submit") || lowerInput.includes("complaint") || lowerInput.includes("how to")) {
    return "To submit a complaint, click on 'Submit Complaint' in the sidebar. You'll be guided through a simple 3-step process with AI assistance to categorize and prioritize your issue. ✍️"
  }

  // Anonymous
  if (lowerInput.includes("anonymous")) {
    return "Yes, absolutely! You can submit complaints anonymously. Your identity will be fully protected throughout the entire process — from submission to resolution. 🔒"
  }

  // Thanks
  if (lowerInput.includes("thank") || lowerInput.includes("thanks")) {
    return "You're welcome! 😄 Feel free to ask if you need anything else."
  }

  // Role-specific responses
  if (role === "student") {
    return "As a student, you can submit complaints, track their status, view analytics, provide feedback once resolved, and even submit anonymously. Need help with anything specific? 🎓"
  }

  if (role === "staff") {
    return "As staff, you can manage assigned complaints, update their status, and view your performance metrics on the dashboard. What would you like to know? 👨‍💼"
  }

  if (role === "hod") {
    return "As HOD, you can oversee departmental complaints, manage staff assignments, and access detailed analytics for your department. How can I help? 📋"
  }

  if (role === "principal") {
    return "As Principal, you have access to institution-wide analytics, can handle critical escalated issues, and oversee the entire grievance lifecycle. What information do you need? 🏛️"
  }

  if (role === "admin") {
    return "As Admin, you can manage all users, configure system settings, handle signup approvals, and access comprehensive analytics. What would you like to do? ⚙️"
  }

  return "I'm here to help you navigate CampusVoice! You can ask me about submitting complaints, checking status, understanding the process, or using any feature of the system. 💬"
}
