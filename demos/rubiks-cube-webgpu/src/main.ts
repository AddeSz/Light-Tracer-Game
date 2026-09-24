import { resizeCanvas } from "@/webgpu-utils";
import { Camera } from "./camera";
import { Renderer } from "./renderer/renderer";
import { Scene } from "./scene";

export const deg2rad = (degrees: number) => degrees * (Math.PI / 180);

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
async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found!");

  const renderer = await Renderer.build(canvas);
  const scene = new Scene();
  const camera = new Camera(canvas);

  window.addEventListener("keydown", (e) => {
    const turn = turns[e.code];
    if (!turn) return;

    const direction = e.shiftKey ? -turn.direction : turn.direction;
    scene.startTurn(turn.axis, turn.layer, direction);
  });

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
