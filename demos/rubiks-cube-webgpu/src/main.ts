import { resizeCanvas } from "@/webgpu-utils";
import { Renderer } from "./renderer/renderer";
import { Scene } from "./scene";

export const deg2rad = (degrees: number) => degrees * (Math.PI / 180);

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found!");

  const renderer = await Renderer.build(canvas);
  const scene = new Scene();

  let lastTime = 0;
  function frame(time: number) {
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    resizeCanvas(canvas!, renderer.device);
    renderer.render(scene, deltaTime);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.querySelector<HTMLElement>(".container")?.classList.remove("loading");
}

main();
