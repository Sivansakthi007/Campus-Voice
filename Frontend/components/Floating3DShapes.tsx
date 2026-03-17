"use client"

import { useEffect, useState, useRef, useCallback } from "react"

// ── Neon shape types ────────────────────────────────────────────────
interface NeonShape {
  id: number
  type: "circle" | "triangle" | "line" | "ring" | "hexagon"
  size: number
  x: number
  y: number
  delay: number
  duration: number
  color: string
  borderColor: string
  glowColor: string
  parallaxFactor: number
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  duration: number
  delay: number
}

// Vibrant neon palette
const NEON_PALETTE = [
  { bg: "rgba(99, 102, 241, 0.08)",  border: "rgba(99, 102, 241, 0.5)",  glow: "rgba(99, 102, 241, 0.35)" },   // indigo
  { bg: "rgba(139, 92, 246, 0.08)",  border: "rgba(139, 92, 246, 0.5)",  glow: "rgba(139, 92, 246, 0.35)" },   // violet
  { bg: "rgba(59, 130, 246, 0.06)",  border: "rgba(59, 130, 246, 0.45)", glow: "rgba(59, 130, 246, 0.3)" },    // blue
  { bg: "rgba(6, 182, 212, 0.06)",   border: "rgba(6, 182, 212, 0.45)", glow: "rgba(6, 182, 212, 0.3)" },     // cyan
  { bg: "rgba(236, 72, 153, 0.06)",  border: "rgba(236, 72, 153, 0.4)", glow: "rgba(236, 72, 153, 0.25)" },   // pink
  { bg: "rgba(168, 85, 247, 0.06)",  border: "rgba(168, 85, 247, 0.45)", glow: "rgba(168, 85, 247, 0.3)" },   // purple
]

const PARTICLE_COLORS = [
  "rgba(99, 102, 241, 0.6)",
  "rgba(139, 92, 246, 0.6)",
  "rgba(59, 130, 246, 0.5)",
  "rgba(6, 182, 212, 0.5)",
  "rgba(236, 72, 153, 0.4)",
  "rgba(255, 200, 100, 0.4)",
]

// ── Generate shapes ─────────────────────────────────────────────────
function generateShapes(): NeonShape[] {
  const types: NeonShape["type"][] = ["circle", "triangle", "line", "ring", "hexagon"]
  const shapes: NeonShape[] = []

  for (let i = 0; i < 14; i++) {
    const palette = NEON_PALETTE[i % NEON_PALETTE.length]
    shapes.push({
      id: i,
      type: types[i % types.length],
      size: 25 + Math.random() * 70,
      x: 3 + Math.random() * 90,
      y: 3 + Math.random() * 90,
      delay: Math.random() * 6,
      duration: 10 + Math.random() * 15,
      color: palette.bg,
      borderColor: palette.border,
      glowColor: palette.glow,
      parallaxFactor: 0.5 + Math.random() * 1.5,
    })
  }
  return shapes
}

function generateParticles(): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < 35; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 3,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      duration: 12 + Math.random() * 20,
      delay: Math.random() * 15,
    })
  }
  return particles
}

// ── Shape renderer ──────────────────────────────────────────────────
function NeonShapeEl({ shape, mouseOffset }: { shape: NeonShape; mouseOffset: { x: number; y: number } }) {
  const px = shape.parallaxFactor
  const translateX = mouseOffset.x * px
  const translateY = mouseOffset.y * px

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${shape.x}%`,
    top: `${shape.y}%`,
    transform: `translate(${translateX}px, ${translateY}px)`,
    transition: "transform 0.3s ease-out",
    animationDelay: `${shape.delay}s`,
    animationDuration: `${shape.duration}s`,
    willChange: "transform",
    pointerEvents: "none",
  }

  switch (shape.type) {
    case "circle":
      return (
        <div style={baseStyle} className="neon-shape">
          <div
            style={{
              width: shape.size,
              height: shape.size,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 35%, ${shape.borderColor}, ${shape.color}, transparent)`,
              boxShadow: `0 0 20px ${shape.glowColor}, 0 0 40px ${shape.glowColor}`,
            }}
          />
        </div>
      )

    case "triangle":
      return (
        <div style={baseStyle} className="neon-shape">
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${shape.size / 2}px solid transparent`,
              borderRight: `${shape.size / 2}px solid transparent`,
              borderBottom: `${shape.size}px solid ${shape.borderColor}`,
              filter: `drop-shadow(0 0 15px ${shape.glowColor}) drop-shadow(0 0 30px ${shape.glowColor})`,
              opacity: 0.7,
            }}
          />
        </div>
      )

    case "line":
      const angle = (shape.id * 37) % 180
      return (
        <div style={baseStyle} className="neon-shape">
          <div
            style={{
              width: shape.size * 1.5,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${shape.borderColor}, transparent)`,
              boxShadow: `0 0 8px ${shape.glowColor}, 0 0 16px ${shape.glowColor}`,
              transform: `rotate(${angle}deg)`,
              borderRadius: 1,
            }}
          />
        </div>
      )

    case "ring":
      return (
        <div style={baseStyle} className="neon-shape">
          <div
            style={{
              width: shape.size * 1.2,
              height: shape.size * 1.2,
              borderRadius: "50%",
              border: `1.5px solid ${shape.borderColor}`,
              boxShadow: `0 0 12px ${shape.glowColor}, inset 0 0 12px ${shape.glowColor}`,
              background: "transparent",
            }}
          />
        </div>
      )

    case "hexagon":
      return (
        <div style={baseStyle} className="neon-shape">
          <div
            style={{
              width: shape.size,
              height: shape.size,
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              background: shape.color,
              boxShadow: `0 0 15px ${shape.glowColor}`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "2px",
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                border: `1.5px solid ${shape.borderColor}`,
              }}
            />
          </div>
        </div>
      )
  }
}

// ── Main component ──────────────────────────────────────────────────
export default function Floating3DShapes() {
  const [shapes, setShapes] = useState<NeonShape[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)
  const targetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setShapes(generateShapes())
    setParticles(generateParticles())
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    targetRef.current = {
      x: (e.clientX - cx) / cx * 15,
      y: (e.clientY - cy) / cy * 15,
    }
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true })

    const animate = () => {
      setMouseOffset(prev => ({
        x: prev.x + (targetRef.current.x - prev.x) * 0.06,
        y: prev.y + (targetRef.current.y - prev.y) * 0.06,
      }))
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [handleMouseMove])

  if (shapes.length === 0) return null

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: "none", zIndex: 1 }}
      aria-hidden="true"
    >
      {/* Lens flare top-right */}
      <div
        className="lens-flare"
        style={{
          width: 350,
          height: 350,
          top: "-80px",
          right: "-60px",
        }}
      />

      {/* Secondary lens flare bottom-left */}
      <div
        className="lens-flare"
        style={{
          width: 200,
          height: 200,
          bottom: "10%",
          left: "-40px",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.05) 40%, transparent 70%)",
          animationDelay: "3s",
        }}
      />

      {/* Neon geometric shapes */}
      {shapes.map((shape) => (
        <NeonShapeEl key={shape.id} shape={shape} mouseOffset={mouseOffset} />
      ))}

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={`p-${p.id}`}
          className="particle-dot"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            transform: `translate(${mouseOffset.x * 0.3}px, ${mouseOffset.y * 0.3}px)`,
            transition: "transform 0.4s ease-out",
          }}
        />
      ))}

      {/* Light reflections on glass — top sweep */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "20%",
          width: "60%",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          filter: "blur(1px)",
        }}
      />
    </div>
  )
}
