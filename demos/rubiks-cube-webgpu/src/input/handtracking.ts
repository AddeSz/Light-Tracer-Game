import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

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

export function startDetectionLoop(video: HTMLVideoElement, landmarker: HandLandmarker) {
  let lastVideoTime = -1;

  function loop() {
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const result = landmarker.detectForVideo(video, performance.now());
      console.log(`hands: ${result.landmarks.length}`, result.landmarks);
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
