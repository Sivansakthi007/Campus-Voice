"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import {
  Camera,
  CameraOff,
  RefreshCw,
  Check,
  AlertTriangle,
  Loader2,
  Scan,
  X,
  Users,
  ShieldCheck,
  Eye,
} from "lucide-react"
import {
  loadFaceModels,
  detectFace,
  stopCamera,
  drawFaceBox,
  checkLiveness,
  type FaceDetectionResult,
} from "@/lib/face-recognition"

interface FaceCaptureComponentProps {
  /** Called when a face embedding is captured successfully */
  onCapture: (embedding: number[]) => void
  /** Called when face data is cleared */
  onClear?: () => void
  /** Mode: 'register' for registration flow, 'login' for auto-login detection */
  mode: "register" | "login"
  /** Gradient class for buttons (e.g. 'from-red-500 to-pink-500') */
  accentGradient?: string
  /** Called when face detected in login mode, with embedding */
  onFaceDetected?: (embedding: number[]) => void
  /** Whether to auto-start camera */
  autoStart?: boolean
  /** Whether face login is in progress */
  isProcessing?: boolean
}

type CameraState =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "error"
  | "captured"

type DetectionState =
  | "none"
  | "loading-models"
  | "detecting"
  | "found"
  | "multiple"

export default function FaceCaptureComponent({
  onCapture,
  onClear,
  mode,
  accentGradient = "from-blue-500 to-violet-500",
  onFaceDetected,
  autoStart = false,
  isProcessing = false,
}: FaceCaptureComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const livenessRef = useRef<{ results: FaceDetectionResult[], startTime: number }>({ results: [], startTime: 0 })

  const [cameraState, setCameraState] = useState<CameraState>("idle")
  const [detectionState, setDetectionState] = useState<DetectionState>("none")
  const [lastResult, setLastResult] = useState<FaceDetectionResult | null>(null)
  const [capturedEmbedding, setCapturedEmbedding] = useState<number[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [modelsReady, setModelsReady] = useState(false)
  const [livenessProgress, setLivenessProgress] = useState(0) // 0 to 100
  const [isLivenessVerified, setIsLivenessVerified] = useState(false)

  // Load models on mount
  useEffect(() => {
    let cancelled = false
    setDetectionState("loading-models")
    loadFaceModels()
      .then(() => {
        if (!cancelled) {
          setModelsReady(true)
          setDetectionState("none")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage("Failed to load face detection models.")
          setDetectionState("none")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-start camera
  useEffect(() => {
    if (autoStart && modelsReady && cameraState === "idle") {
      handleStartCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, modelsReady])

  // When cameraState becomes "active" and we have a stream, attach it to the video element
  useEffect(() => {
    if (cameraState === "active" && streamRef.current && videoRef.current) {
      const video = videoRef.current
      video.srcObject = streamRef.current
      video.play().then(() => {
        startDetection()
      }).catch((err) => {
        console.error("[FaceCapture] Video play error:", err)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cleanupCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    stopCamera(streamRef.current)
    streamRef.current = null
  }, [])

  const handleStartCamera = async () => {
    setCameraState("requesting")
    setErrorMessage(null)

    try {
      // Get the media stream FIRST (doesn't need a video element)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      // Store the stream and switch to active state
      // The useEffect above will attach it to the video element once it renders
      streamRef.current = stream
      setCameraState("active")
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraState("denied")
        setErrorMessage(
          "Camera access denied. Please allow camera access in your browser settings."
        )
      } else {
        setCameraState("error")
        setErrorMessage("Unable to access camera. Please check your device.")
      }
    }
  }

  const startDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }

    setDetectionState("detecting")

    detectionIntervalRef.current = setInterval(async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return
      if (video.readyState < 2) return

      const result = await detectFace(video)
      setLastResult(result)

      if (!videoRef.current || !canvasRef.current) return

      let boxStatus: "detecting" | "found" | "multiple" | "none" = "none"
      if (result.faceCount === 1) boxStatus = "found"
      else if (result.faceCount > 1) boxStatus = "multiple"
      else boxStatus = "detecting"

      drawFaceBox(canvasRef.current, videoRef.current, result.box, boxStatus)

      if (result.faceCount === 1 && result.embedding) {
        setDetectionState("found")
        
        // ── LIVENESS LOGIC ──
        const now = Date.now()
        if (livenessRef.current.startTime === 0) {
          livenessRef.current.startTime = now
          livenessRef.current.results = [result]
          setLivenessProgress(10)
        } else {
          // Check for movement compared to previous results
          const history = livenessRef.current.results
          const hasMovement = history.some(prev => checkLiveness(prev, result, 5)) // Low threshold for subtle movement
          
          if (hasMovement || history.length > 5) {
            livenessRef.current.results.push(result)
            if (livenessRef.current.results.length > 10) livenessRef.current.results.shift()
            
            const elapsed = now - livenessRef.current.startTime
            const progress = Math.min(100, (elapsed / 1500) * 100) // 1.5s for full verification
            setLivenessProgress(progress)

            if (progress >= 100 && (hasMovement || history.length > 8)) {
              setIsLivenessVerified(true)
              // In login mode, automatically fire event ONLY after liveness check
              if (mode === "login" && onFaceDetected && !isProcessing) {
                onFaceDetected(result.embedding)
              }
            }
          }
        }
      } else {
        // Reset liveness if face lost
        livenessRef.current = { results: [], startTime: 0 }
        setLivenessProgress(0)
        setIsLivenessVerified(false)
        setDetectionState(result.faceCount > 1 ? "multiple" : "detecting")
      }
    }, 200) // Faster detection for liveness (200ms)
  }

  const handleCapture = () => {
    if (lastResult?.embedding) {
      setCapturedEmbedding(lastResult.embedding)
      setCameraState("captured")
      cleanupCamera()
      onCapture(lastResult.embedding)
    }
  }

  const handleRetake = () => {
    setCapturedEmbedding(null)
    setCameraState("idle")
    setDetectionState("none")
    setLastResult(null)
    onClear?.()
    // Re-start camera
    setTimeout(() => handleStartCamera(), 100)
  }

  const handleClose = () => {
    cleanupCamera()
    setCameraState("idle")
    setDetectionState("none")
    setLastResult(null)
    setCapturedEmbedding(null)
    setLivenessProgress(0)
    setIsLivenessVerified(false)
    livenessRef.current = { results: [], startTime: 0 }
    onClear?.()
  }

  // ---------- RENDER ----------

  // Models loading state
  if (!modelsReady && detectionState === "loading-models") {
    return (
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 border border-white/10">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-gray-400">Loading face detection models...</p>
        <p className="text-xs text-gray-500">This may take a few seconds on first load</p>
      </div>
    )
  }

  // Error state
  if (errorMessage && (cameraState === "denied" || cameraState === "error")) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-red-500/5 border border-red-500/20">
        <CameraOff className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-400 text-center">{errorMessage}</p>
        <button
          onClick={handleStartCamera}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  // Captured state (registration mode)
  if (cameraState === "captured" && capturedEmbedding) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <p className="text-sm text-emerald-400 font-medium">Face captured successfully!</p>
        <p className="text-xs text-gray-500">Face data will be securely stored as an embedding.</p>
        <button
          onClick={handleRetake}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retake
        </button>
      </div>
    )
  }

  // Idle state — show start button
  if (cameraState === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 border border-white/10">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
          <Camera className="w-7 h-7 text-blue-400" />
        </div>
        <p className="text-sm text-gray-300">
          {mode === "register"
            ? "Capture your face for quick login"
            : "Use face recognition to login"}
        </p>
        <button
          onClick={handleStartCamera}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${accentGradient} text-white font-medium text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95`}
        >
          <Camera className="w-4 h-4" />
          {mode === "register" ? "Start Camera" : "Start Face Login"}
        </button>
        <p className="text-[11px] text-gray-500 text-center">
          Face login is optional. You can still use email & password.
        </p>
      </div>
    )
  }

  // Camera requesting state
  if (cameraState === "requesting") {
    return (
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 border border-white/10">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-gray-400">Requesting camera access...</p>
      </div>
    )
  }

  // Active camera — live preview
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Video container */}
      <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-xl overflow-hidden bg-black/50 shadow-2xl border border-white/10">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full scale-x-[-1]"
        />

        {/* Status badge */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium backdrop-blur-sm ${
              detectionState === "found"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : detectionState === "multiple"
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : "bg-white/10 text-gray-300 border border-white/10"
            }`}
          >
            {detectionState === "found" ? (
              <>
                {isLivenessVerified ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Eye className="w-3 h-3 animate-pulse text-amber-400" />
                )}
                {isLivenessVerified ? "Liveness Verified" : "Verifying Liveness..."}
              </>
            ) : detectionState === "multiple" ? (
              <>
                <Users className="w-3 h-3" /> Multiple Faces
              </>
            ) : (
              <>
                <Scan className="w-3 h-3 animate-pulse" /> Scanning...
              </>
            )}
          </div>

          {/* Liveness progress bar */}
          {detectionState === "found" && !isLivenessVerified && (
            <div className="absolute bottom-3 left-3 right-3 h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-200" 
                style={{ width: `${livenessProgress}%` }}
              />
            </div>
          )}

          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-sm text-white font-medium">Matching face...</p>
          </div>
        )}
      </div>

      {/* Error warning */}
      {lastResult?.error && detectionState === "multiple" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 max-w-[320px]">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400">{lastResult.error}</span>
        </div>
      )}

      {/* Action buttons (registration mode only) */}
      {mode === "register" && (
        <div className="flex gap-3 w-full max-w-[320px]">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 hover:bg-white/10 transition-all text-sm font-medium active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleCapture}
            disabled={detectionState !== "found" || !lastResult?.embedding || !isLivenessVerified}
            className={`flex-1 py-2.5 rounded-xl bg-gradient-to-r ${accentGradient} text-white font-medium text-sm shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 hover:shadow-xl flex items-center justify-center gap-2`}
          >
            <Camera className="w-4 h-4" />
            Capture Face
          </button>
        </div>
      )}

      {/* Login mode helper text */}
      {mode === "login" && !isProcessing && (
        <p className="text-xs text-gray-500 text-center max-w-[320px]">
          {detectionState === "found"
            ? "Face detected! Attempting login..."
            : "Position your face in the camera frame"}
        </p>
      )}
    </div>
  )
}
