import { configureContext, createBuffer, requestDevice } from "@/webgpu-utils";
import shaderCode from "./shaders/brick.wgsl?raw";

const params = {
  brickWidth: 100,
  brickHeight: 50,
  mortar: 4,
  offsetX: 0,
  offsetY: 0,
  brickColor: "#b3331a",
  mortarColor: "#1a1a1a",
};

function hexToRgba(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255).concat(1);
}

function packParams(scale: number): Float32Array {
  const mortar = Math.min(params.mortar, Math.min(params.brickWidth, params.brickHeight) - 1);
  return new Float32Array([
    ...hexToRgba(params.brickColor),
    ...hexToRgba(params.mortarColor),
    params.brickWidth,
    params.brickHeight,
    mortar,
    scale,
    params.offsetX,
    params.offsetY,
    0,
    0,
  ]);
}
function bindControls() {
  document.querySelectorAll<HTMLInputElement>("input[data-param]").forEach((input) => {
    const key = input.dataset.param!;
    const values = params as Record<string, string | number>;
    const out = input.parentElement?.querySelector("output");

    const sync = () => {
      if (out) out.textContent = input.value;
    };

    input.value = String(values[key]);
    sync();

    input.addEventListener("input", () => {
      values[key] = input.type === "range" ? Number(input.value) : input.value;
      sync();
    });
  });
}

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found");
  bindControls();

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));

  const device = await requestDevice();
  const { ctx, canvasFormat } = configureContext(canvas, device);

  const vertices = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
  const vertexBuffer = createBuffer(device, "Vertex Buffer", vertices, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);

  const uniformBuffer = createBuffer(
    device,
    "Params Buffer",
    packParams(dpr),
    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  );

  const shaderModule = device.createShaderModule({ label: "Brick shader", code: shaderCode });

  const pipeline = device.createRenderPipeline({
    label: "Brick pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [{ arrayStride: 8, attributes: [{ format: "float32x2", offset: 0, shaderLocation: 0 }] }],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [{ format: canvasFormat }],
    },
  });

  const bindGroup = device.createBindGroup({
    label: "Brick bind group",
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  function render() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(vertices.length / 2);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  function frame(_time: number) {
    device.queue.writeBuffer(uniformBuffer, 0, packParams(dpr));
    render();
    requestAnimationFrame(frame);
  }

  document.querySelector(".layout")?.classList.remove("loading");
  requestAnimationFrame(frame);
}

main();
