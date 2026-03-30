"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  GraduationCap,
  MessageCircle,
  Bell,
  Megaphone,
  ArrowRight,
  Sparkles,
  Wifi,
} from "lucide-react"
import "./welcome.css"

/* ------------------------------------------------------------------ */
/* Helpers — deterministic seeded PRNG (avoids SSR hydration mismatch) */
/* ------------------------------------------------------------------ */

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

function seededBetween(seed: number, min: number, max: number) {
  return Math.round((seededRandom(seed) * (max - min) + min) * 100) / 100
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

/** Twinkling stars */
function Stars({ count = 60 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${seededBetween(i * 4 + 1, 0, 100)}%`,
        top: `${seededBetween(i * 4 + 2, 0, 55)}%`,
        size: seededBetween(i * 4 + 3, 1, 3),
        delay: `${seededBetween(i * 4 + 4, 0, 5)}s`,
        duration: `${seededBetween(i * 4 + 5, 2, 5)}s`,
      })),
    [count]
  )

  return (
    <div className="stars-layer">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  )
}

/** Futuristic building silhouettes */
// Deterministic lit-window pattern to avoid SSR/client hydration mismatch
const LIT_PATTERN = [
  [1, 0, 1, 0, 1, 0, 1, 0, 1],
  [0, 1, 0, 1, 0, 1, 0, 1, 0],
  [1, 1, 0, 0, 1, 1, 0, 0, 1],
  [0, 0, 1, 1, 0, 0, 1, 1, 0],
  [1, 0, 0, 1, 1, 0, 0, 1, 0],
  [0, 1, 1, 0, 0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1],
  [0, 1, 0, 0, 1, 0, 1, 0, 0],
  [1, 1, 1, 0, 0, 1, 0, 0, 1],
]
const WINDOW_DELAYS = [0, 2.3, 1.1, 3.4, 0.6, 2.8, 1.7, 3.1, 0.4]

function Buildings() {
  const buildings = [
    { w: 48, h: 90, bg: "linear-gradient(180deg, #1a2d5a 0%, #0d1a3a 100%)" },
    { w: 36, h: 65, bg: "linear-gradient(180deg, #1e3560 0%, #0f1f42 100%)" },
    { w: 56, h: 110, bg: "linear-gradient(180deg, #1a2d5a 0%, #0d1a3a 100%)" },
    { w: 40, h: 75, bg: "linear-gradient(180deg, #162650 0%, #0c1835 100%)" },
    { w: 62, h: 130, bg: "linear-gradient(180deg, #1e3560 0%, #0f1f42 100%)" },
    { w: 44, h: 85, bg: "linear-gradient(180deg, #1a2d5a 0%, #0d1a3a 100%)" },
    { w: 50, h: 100, bg: "linear-gradient(180deg, #162650 0%, #0c1835 100%)" },
    { w: 34, h: 60, bg: "linear-gradient(180deg, #1e3560 0%, #0f1f42 100%)" },
    { w: 58, h: 120, bg: "linear-gradient(180deg, #1a2d5a 0%, #0d1a3a 100%)" },
  ]

  return (
    <div className="building-row">
      {buildings.map((b, i) => (
        <motion.div
          key={i}
          className="building"
          style={{
            width: b.w,
            height: b.h,
            background: b.bg,
          }}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: "easeOut" }}
        >
          <div className="building-windows">
            {Array.from({ length: 9 }, (_, j) => (
              <div
                key={j}
                className={`building-window ${LIT_PATTERN[i][j] ? "lit" : ""}`}
                style={{ animationDelay: `${WINDOW_DELAYS[j]}s` }}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/** Floating chat bubbles */
function FloatingBubbles() {
  const bubbles = [
    { icon: MessageCircle, label: "Ideas", left: "12%", top: "22%", delay: 0, color: "#3b82f6" },
    { icon: Megaphone, label: "Announce", left: "75%", top: "18%", delay: 0.5, color: "#8b5cf6" },
    { icon: Bell, label: "Alerts", left: "60%", top: "30%", delay: 1, color: "#14b8a6" },
    { icon: MessageCircle, label: "Discuss", left: "25%", top: "35%", delay: 1.5, color: "#6366f1" },
    { icon: Wifi, label: "Connect", left: "85%", top: "38%", delay: 0.8, color: "#3b82f6" },
    { icon: Sparkles, label: "Engage", left: "45%", top: "15%", delay: 1.2, color: "#a855f7" },
  ]

  return (
    <>
      {bubbles.map((b, i) => {
        const Icon = b.icon
        return (
          <motion.div
            key={i}
            className="chat-bubble"
            style={{
              left: b.left,
              top: b.top,
              animationDelay: `${b.delay}s`,
              borderColor: `${b.color}44`,
              background: `${b.color}18`,
            }}
            initial={{ opacity: 0, y: 30, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.2 + b.delay, duration: 0.6 }}
          >
            <Icon size={14} color={b.color} />
            <span style={{ color: b.color, fontSize: "0.72rem", fontWeight: 500 }}>
              {b.label}
            </span>
          </motion.div>
        )
      })}
    </>
  )
}

/** Voice waveform bars */
function VoiceWaveforms() {
  const waveforms = [
    { left: "18%", top: "42%", color: "#14b8a6", delay: 0 },
    { left: "78%", top: "25%", color: "#3b82f6", delay: 0.4 },
    { left: "55%", top: "44%", color: "#8b5cf6", delay: 0.8 },
  ]

  return (
    <>
      {waveforms.map((w, i) => (
        <motion.div
          key={i}
          className="voice-wave"
          style={{ left: w.left, top: w.top, animationDelay: `${w.delay}s` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8 + w.delay, duration: 0.5 }}
        >
          {Array.from({ length: 5 }, (_, j) => (
            <div
              key={j}
              className="voice-bar"
              style={{
                height: seededBetween(i * 10 + j + 500, 10, 24),
                backgroundColor: w.color,
                animationDelay: `${j * 0.15}s`,
              }}
            />
          ))}
        </motion.div>
      ))}
    </>
  )
}

/** Pulsing signal rings above buildings */
function SignalRings() {
  const rings = [
    { left: "20%", bottom: "32%", color: "#3b82f6", delay: 0 },
    { left: "50%", bottom: "38%", color: "#8b5cf6", delay: 0.6 },
    { left: "72%", bottom: "30%", color: "#14b8a6", delay: 1.2 },
    { left: "35%", bottom: "34%", color: "#6366f1", delay: 0.9 },
    { left: "62%", bottom: "36%", color: "#a855f7", delay: 1.5 },
  ]

  return (
    <>
      {rings.map((r, i) => (
        <div
          key={i}
          className="signal-ring"
          style={{
            left: r.left,
            bottom: r.bottom,
            width: 30,
            height: 30,
            borderColor: `${r.color}66`,
            animationDelay: `${r.delay}s`,
          }}
        />
      ))}
    </>
  )
}

/** Small floating particles */
function Particles() {
  const colors = ["#3b82f6", "#8b5cf6", "#14b8a6", "#6366f1", "#a855f7"]
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${seededBetween(i * 5 + 300, 5, 95)}%`,
        top: `${seededBetween(i * 5 + 301, 10, 50)}%`,
        size: seededBetween(i * 5 + 302, 2, 5),
        color: colors[Math.floor(seededRandom(i * 5 + 303) * 5)],
        delay: `${seededBetween(i * 5 + 304, 0, 5)}s`,
        duration: `${seededBetween(i * 5 + 305, 4, 8)}s`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}88`,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function WelcomePage() {
  const router = useRouter()
  const [showContent, setShowContent] = useState(false)
  const [showLogo, setShowLogo] = useState(false)
  const [showUI, setShowUI] = useState(false)

  useEffect(() => {
    // Phase 1 – scene fades in (immediate)
    const t1 = setTimeout(() => setShowContent(true), 300)
    // Phase 2 – logo converges
    const t2 = setTimeout(() => setShowLogo(true), 2200)
    // Phase 3 – UI elements appear
    const t3 = setTimeout(() => setShowUI(true), 3200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <div className="welcome-scene" suppressHydrationWarning>
      {/* ---------- Stars ---------- */}
      {showContent && <Stars />}

      {/* ---------- 3D Ground ---------- */}
      <motion.div
        className="campus-ground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <div className="campus-ground-inner" />
      </motion.div>

      {/* ---------- Buildings ---------- */}
      <AnimatePresence>{showContent && <Buildings />}</AnimatePresence>

      {/* ---------- Signal Rings ---------- */}
      {showContent && <SignalRings />}

      {/* ---------- Floating Elements ---------- */}
      {showContent && (
        <>
          <FloatingBubbles />
          <VoiceWaveforms />
          <Particles />
        </>
      )}

      {/* ---------- Center Content (Logo + UI) ---------- */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4"
        style={{ pointerEvents: "none" }}
      >
        {/* Logo Convergence */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              className="logo-glow flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
            >
              {/* Icon */}
              <motion.div
                className="relative"
                animate={{
                  scale: [1, 1.06, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #14b8a6 100%)",
                    boxShadow:
                      "0 0 40px rgba(59,130,246,0.4), 0 0 80px rgba(139,92,246,0.2)",
                  }}
                >
                  <GraduationCap className="w-10 h-10 md:w-12 md:h-12 text-white" />
                </div>
                {/* Outer glow ring */}
                <motion.div
                  className="absolute inset-[-8px] rounded-[28px]"
                  style={{
                    border: "2px solid rgba(59,130,246,0.3)",
                  }}
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.6, 0.2, 0.6],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>

              {/* Title */}
              <motion.h1
                className="text-4xl md:text-6xl font-bold text-center"
                style={{
                  background:
                    "linear-gradient(135deg, #60a5fa 0%, #a78bfa 40%, #5eead4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "none",
                  filter: "drop-shadow(0 0 30px rgba(59,130,246,0.3))",
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Campus Voice
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-sm md:text-base font-medium tracking-wide text-center"
                style={{ color: "rgba(148, 163, 184, 0.9)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                Your Voice Across the Campus
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Get Started Button */}
        <AnimatePresence>
          {showUI && (
            <motion.div
              className="mt-8 flex flex-col items-center w-full px-4"
              style={{ pointerEvents: "auto" }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2,
              }}
            >
              <motion.button
                className="get-started-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/register")}
                animate={{
                  y: [0, -4, 0],
                }}
                transition={{
                  y: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              >
                Get Started
                <ArrowRight size={18} />
              </motion.button>

              {/* Secondary link */}
              <motion.p
                className="text-center mt-5 text-sm"
                style={{ color: "rgba(148, 163, 184, 0.7)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Already have an account?{" "}
                <span
                  role="button"
                  tabIndex={0}
                  className="underline cursor-pointer transition-colors"
                  style={{ color: "#60a5fa" }}
                  onClick={() => router.push("/login")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push("/login")
                  }}
                >
                  Sign In
                </span>
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
