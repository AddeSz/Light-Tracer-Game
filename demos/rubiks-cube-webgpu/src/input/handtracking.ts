export async function setupHandCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, frameRate: 30 },
  });

  video.srcObject = stream;
  await video.play();
}
