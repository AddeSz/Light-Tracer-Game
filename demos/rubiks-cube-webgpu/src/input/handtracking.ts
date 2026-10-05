import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";

export async function setupHandCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, frameRate: 30 },
  });

  video.srcObject = stream;
  await video.play();
}

export async function createHandLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

export function drawLandmarks(ctx: CanvasRenderingContext2D, hands: Array<Array<{ x: number; y: number }>>) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#4ad66d";
  for (const landmarks of hands) {
    for (const point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function startDetectionLoop(
  video: HTMLVideoElement,
  landmarker: HandLandmarker,
  canvas: HTMLCanvasElement,
  onResult?: (result: HandLandmarkerResult) => void
) {
  const ctx = canvas.getContext("2d")!;
  let lastVideoTime = -1;

  function loop() {
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const result = landmarker.detectForVideo(video, performance.now());
      drawLandmarks(ctx, result.landmarks);
      onResult?.(result);
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
