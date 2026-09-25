import { resizeCanvas } from "@/webgpu-utils";
import { Camera } from "./camera";
import { Renderer } from "./renderer/renderer";
import { Scene } from "./scene";

const turns: Record<string, { axis: number; layer: number; direction: number }> = {
  KeyR: { axis: 0, layer: 1, direction: -1 },
  KeyL: { axis: 0, layer: -1, direction: 1 },
  KeyB: { axis: 1, layer: 1, direction: -1 },
  KeyF: { axis: 1, layer: -1, direction: 1 },
  KeyU: { axis: 2, layer: 1, direction: -1 },
  KeyD: { axis: 2, layer: -1, direction: 1 },
  KeyM: { axis: 0, layer: 0, direction: 1 },
  KeyE: { axis: 2, layer: 0, direction: 1 },
  KeyS: { axis: 1, layer: 0, direction: 1 },
};

const speeds = [
  { label: "Slow", value: Math.PI }, // 0.5s
  { label: "Medium", value: Math.PI * 2 }, // 0.25s
  { label: "Fast", value: Math.PI * 4 }, // 0.125s
  { label: "Instant", value: 1000 }, // finishes in one frame
];

function setupUI(scene: Scene) {
  window.addEventListener("keydown", (e) => {
    const turn = turns[e.code];
    if (!turn) return;

    const direction = e.shiftKey ? -turn.direction : turn.direction;
    scene.queueMove(turn.axis, turn.layer, direction);
  });

  const menuToggle = document.querySelector("#menu-toggle");
  const menuClose = document.querySelector("#menu-close");
  const menu = document.querySelector<HTMLElement>("#menu")!;
  const speedSlider = document.querySelector<HTMLInputElement>("#speed-slider")!;
  const speedValue = document.querySelector("#speed-value")!;

  function applySpeed(index: number) {
    const speed = speeds[index];
    scene.setTurnSpeed(speed.value);
    speedValue.textContent = speed.label;
  }

  function updateMenuOffset() {
    const offset = menu.classList.contains("open") ? menu.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty("--menu-offset", `${offset}px`);
  }

  new ResizeObserver(updateMenuOffset).observe(menu);

  menuToggle?.addEventListener("click", () => {
    menu.classList.add("open");
    menuToggle.classList.add("hidden");
    updateMenuOffset();
  });

  menuClose?.addEventListener("click", () => {
    menu.classList.remove("open");
    menuToggle?.classList.remove("hidden");
    updateMenuOffset();
  });

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
  const camera = new Camera(canvas);

  setupUI(scene);

  let lastTime = 0;
  function frame(time: number) {
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    resizeCanvas(canvas!, renderer.device);
    renderer.render(scene, camera, deltaTime);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.querySelector<HTMLElement>(".container")?.classList.remove("loading");
}

main();
