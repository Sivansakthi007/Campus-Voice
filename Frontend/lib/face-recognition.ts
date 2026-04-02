/**
 * Face Recognition Service
 * Wraps @vladmandic/face-api for face detection and embedding extraction.
 * All processing runs client-side in the browser.
 */

import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';

let modelsLoaded = false;
let modelsLoading = false;
let modelLoadPromise: Promise<void> | null = null;

/**
 * Load face-api.js models. Safe to call multiple times — will only load once.
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelsLoading && modelLoadPromise) return modelLoadPromise;

  modelsLoading = true;
  modelLoadPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
      console.log('[FaceRecognition] Models loaded successfully');
    } catch (error) {
      console.error('[FaceRecognition] Failed to load models:', error);
      modelsLoading = false;
      modelLoadPromise = null;
      throw error;
    }
  })();

  return modelLoadPromise;
}

/**
 * Check if models are loaded.
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Detection options for TinyFaceDetector.
 */
const DETECTION_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.5,
});

export interface FaceDetectionResult {
  /** Number of faces detected */
  faceCount: number;
  /** 128-dimensional face descriptor (embedding) if exactly 1 face detected */
  embedding: number[] | null;
  /** Detection confidence score */
  confidence: number;
  /** Bounding box of the detected face */
  box: { x: number; y: number; width: number; height: number } | null;
  /** Error message if any */
  error: string | null;
}

/**
 * Detect faces from a video element and extract embedding for a single face.
 */
export async function detectFace(
  video: HTMLVideoElement
): Promise<FaceDetectionResult> {
  if (!modelsLoaded) {
    return {
      faceCount: 0,
      embedding: null,
      confidence: 0,
      box: null,
      error: 'Models not loaded',
    };
  }

  try {
    const detections = await faceapi
      .detectAllFaces(video, DETECTION_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      return {
        faceCount: 0,
        embedding: null,
        confidence: 0,
        box: null,
        error: null,
      };
    }

    if (detections.length > 1) {
      return {
        faceCount: detections.length,
        embedding: null,
        confidence: 0,
        box: null,
        error: 'Multiple faces detected. Please ensure only one face is visible.',
      };
    }

    const detection = detections[0];
    const embedding = Array.from(detection.descriptor);
    const box = detection.detection.box;

    return {
      faceCount: 1,
      embedding,
      confidence: detection.detection.score,
      box: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      },
      error: null,
    };
  } catch (error) {
    console.error('[FaceRecognition] Detection error:', error);
    return {
      faceCount: 0,
      embedding: null,
      confidence: 0,
      box: null,
      error: 'Face detection failed. Please try again.',
    };
  }
}

/**
 * Basic liveness detection — checks if the face position has changed
 * between two detection results (head movement).
 */
export function checkLiveness(
  prev: FaceDetectionResult,
  current: FaceDetectionResult,
  movementThreshold: number = 15
): boolean {
  if (!prev.box || !current.box) return false;

  const dx = Math.abs(prev.box.x - current.box.x);
  const dy = Math.abs(prev.box.y - current.box.y);

  return dx > movementThreshold || dy > movementThreshold;
}

/**
 * Start the camera and return the video stream.
 */
export async function startCamera(
  videoElement: HTMLVideoElement,
  facingMode: 'user' | 'environment' = 'user'
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode,
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  });

  videoElement.srcObject = stream;
  await videoElement.play();
  return stream;
}

/**
 * Stop camera stream and clean up.
 */
export function stopCamera(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Draw face detection box on a canvas overlay.
 */
export function drawFaceBox(
  canvas: HTMLCanvasElement | null,
  video: HTMLVideoElement | null,
  box: { x: number; y: number; width: number; height: number } | null,
  status: 'detecting' | 'found' | 'multiple' | 'none' = 'none'
): void {
  if (!canvas || !video) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Match canvas size to video display size
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!box) return;

  const colors = {
    detecting: '#f59e0b',
    found: '#10b981',
    multiple: '#ef4444',
    none: '#6b7280',
  };

  ctx.strokeStyle = colors[status] || colors.none;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  // Draw rounded rectangle
  const radius = 10;
  const { x, y, width, height } = box;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.stroke();

  // Draw corner accents
  const cornerLen = 20;
  ctx.lineWidth = 4;
  ctx.setLineDash([]);

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLen, y);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + width - cornerLen, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + cornerLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + height - cornerLen);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + cornerLen, y + height);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + width - cornerLen, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y + height - cornerLen);
  ctx.stroke();
}
