import { resizeCanvas } from "@/webgpu-utils";
import { Camera } from "./camera";
import { setupInput } from "./input";
import { setupHandCamera } from "./input/handtracking";
import { Renderer } from "./renderer/renderer";
import { Scene } from "./scene";

const speeds = [
  { label: "Slow", value: Math.PI }, // 0.5s
  { label: "Medium", value: Math.PI * 2 }, // 0.25s
  { label: "Fast", value: Math.PI * 4 }, // 0.125s
  { label: "Instant", value: 1000 }, // finishes in one frame
];

function setupUI(scene: Scene) {
  const speedSlider = document.querySelector<HTMLInputElement>("#speed-slider")!;
  const speedValue = document.querySelector("#speed-value")!;

  function applySpeed(index: number) {
    const speed = speeds[index];
    scene.setTurnSpeed(speed.value);
    speedValue.textContent = speed.label;
  }

  document.querySelector("#scramble-btn")?.addEventListener("click", () => {
    scene.scramble();
  });

  document.querySelector("#reset-btn")?.addEventListener("click", () => {
    scene.reset();
  });

  speedSlider.addEventListener("input", () => applySpeed(Number(speedSlider.value)));
  applySpeed(Number(speedSlider.value));
}

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found!");

  const renderer = await Renderer.build(canvas);
  const scene = new Scene();
  const camera = new Camera();

  setupInput({ canvas, scene, camera });
  setupUI(scene);

  const handFeed = document.querySelector<HTMLVideoElement>("#hand-feed");
  if (handFeed) setupHandCamera(handFeed).catch((err) => console.error("Camera failed:", err));

  let lastTime = 0;
  function frame(time: number) {
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    resizeCanvas(canvas!, renderer.device);
    renderer.render(scene, camera, deltaTime);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.body.classList.remove("loading");
}

main();
