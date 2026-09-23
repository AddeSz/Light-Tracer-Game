import { resizeCanvas } from "@/webgpu-utils";
import { Renderer } from "./renderer";

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found!");

  const renderer = new Renderer(canvas);
  await renderer.initialize();

  function frame(time: number) {
    resizeCanvas(canvas!, renderer.device);
    renderer.render(time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.querySelector<HTMLElement>(".container")?.classList.remove("loading");
}

main();
