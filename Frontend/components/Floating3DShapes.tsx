"use client"

import { useEffect, useState } from "react"

interface Shape {
  id: number
  type: "cube" | "ring" | "pyramid" | "sphere" | "hexagon"
  size: number
  x: number
  y: number
  delay: number
  duration: number
  color: string
}

const COLORS = [
  "rgba(99, 102, 241, 0.15)",   // indigo
  "rgba(139, 92, 246, 0.15)",   // violet
  "rgba(59, 130, 246, 0.12)",   // blue
  "rgba(168, 85, 247, 0.12)",   // purple
  "rgba(236, 72, 153, 0.1)",    // pink
  "rgba(6, 182, 212, 0.12)",    // cyan
]

const BORDER_COLORS = [
  "rgba(99, 102, 241, 0.35)",
  "rgba(139, 92, 246, 0.35)",
  "rgba(59, 130, 246, 0.3)",
  "rgba(168, 85, 247, 0.3)",
  "rgba(236, 72, 153, 0.25)",
  "rgba(6, 182, 212, 0.3)",
]

const GLOW_COLORS = [
  "rgba(99, 102, 241, 0.3)",
  "rgba(139, 92, 246, 0.3)",
  "rgba(59, 130, 246, 0.25)",
  "rgba(168, 85, 247, 0.25)",
  "rgba(236, 72, 153, 0.2)",
  "rgba(6, 182, 212, 0.25)",
]

function generateShapes(): Shape[] {
  const types: Shape["type"][] = ["cube", "ring", "pyramid", "sphere", "hexagon"]
  const shapes: Shape[] = []

  for (let i = 0; i < 12; i++) {
    const colorIndex = i % COLORS.length
    shapes.push({
      id: i,
      type: types[i % types.length],
      size: 30 + Math.random() * 60,
      x: 5 + Math.random() * 85,
      y: 5 + Math.random() * 85,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 12,
      color: COLORS[colorIndex],
    })
  }

  return shapes
}

function ShapeElement({ shape }: { shape: Shape }) {
  const colorIndex = shape.id % COLORS.length
  const borderColor = BORDER_COLORS[colorIndex]
  const glowColor = GLOW_COLORS[colorIndex]

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${shape.x}%`,
    top: `${shape.y}%`,
    animationDelay: `${shape.delay}s`,
    animationDuration: `${shape.duration}s`,
    willChange: "transform",
    pointerEvents: "none",
  }

  switch (shape.type) {
    case "cube":
      return (
        <div
          style={{
            ...baseStyle,
            width: shape.size,
            height: shape.size,
            perspective: "200px",
          }}
          className="floating-3d-shape"
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: shape.color,
              border: `1.5px solid ${borderColor}`,
              borderRadius: "12px",
              boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px ${glowColor}`,
              backdropFilter: "blur(4px)",
              transformStyle: "preserve-3d",
            }}
            className="animate-float-rotate"
          />
        </div>
      )

    case "ring":
      return (
        <div
          style={{
            ...baseStyle,
            width: shape.size * 1.2,
            height: shape.size * 1.2,
          }}
          className="floating-3d-shape"
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: `2px solid ${borderColor}`,
              boxShadow: `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}`,
              background: "transparent",
            }}
            className="animate-orbit"
          />
        </div>
      )

    case "pyramid":
      return (
        <div
          style={{
            ...baseStyle,
            width: shape.size,
            height: shape.size,
          }}
          className="floating-3d-shape"
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${shape.size / 2}px solid transparent`,
              borderRight: `${shape.size / 2}px solid transparent`,
              borderBottom: `${shape.size}px solid ${borderColor}`,
              filter: `drop-shadow(0 0 12px ${glowColor})`,
            }}
            className="animate-float-rotate"
          />
        </div>
      )

    case "sphere":
      return (
        <div
          style={{
            ...baseStyle,
            width: shape.size * 0.8,
            height: shape.size * 0.8,
          }}
          className="floating-3d-shape"
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${borderColor}, ${shape.color}, transparent)`,
              boxShadow: `0 0 25px ${glowColor}`,
            }}
            className="animate-morph"
          />
        </div>
      )

    case "hexagon":
      return (
        <div
          style={{
            ...baseStyle,
            width: shape.size,
            height: shape.size,
          }}
          className="floating-3d-shape"
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: shape.color,
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              border: "none",
              boxShadow: `0 0 20px ${glowColor}`,
              position: "relative",
            }}
            className="animate-float-rotate"
          >
            {/* Inner border hex via overlay */}
            <div
              style={{
                position: "absolute",
                inset: "2px",
                background: "transparent",
                border: `1.5px solid ${borderColor}`,
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }}
            />
          </div>
        </div>
      )
  }
}

export default function Floating3DShapes() {
  const [shapes, setShapes] = useState<Shape[]>([])

  useEffect(() => {
    setShapes(generateShapes())
  }, [])

  if (shapes.length === 0) return null

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: "none", zIndex: 1 }}
      aria-hidden="true"
    >
      {shapes.map((shape) => (
        <ShapeElement key={shape.id} shape={shape} />
      ))}
    </div>
  )
}
