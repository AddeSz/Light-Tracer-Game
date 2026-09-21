import { configureContext, createBuffer, requestDevice } from "@/webgpu-utils";
import shaderCode from "./shaders/brick.wgsl?raw";

const params = {
  brickColor: [0.7, 0.2, 0.1, 1],
  mortarColor: [0.1, 0.1, 0.1, 1],
  brickSize: [100, 50],
  mortar: 4,
};

function packParams(scale: number): Float32Array {
  return new Float32Array([...params.brickColor, ...params.mortarColor, ...params.brickSize, params.mortar, scale]);
}

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found");

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

  render();
}

main();
