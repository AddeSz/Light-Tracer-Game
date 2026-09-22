import { configureContext, requestDevice, resizeCanvas } from "@/webgpu-utils";
import shaderCode from "./shaders/shader.wgsl?raw";
import { SquareMesh } from "./square-mesh";

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found!");
  const device = await requestDevice();
  const { ctx, canvasFormat } = configureContext(canvas, device);

  const squareMesh = new SquareMesh(device);

  const shaderModule = device.createShaderModule({
    label: "Shader module",
    code: shaderCode,
  });

  const uniformBuffer = device.createBuffer({
    label: "Uniform buffer",
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const pipeline = device.createRenderPipeline({
    label: "Shader pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [squareMesh.bufferLayout],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [{ format: canvasFormat }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  function render(time: number) {
    resizeCanvas(canvas!, device);
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time / 1000]));

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
    pass.setVertexBuffer(0, squareMesh.buffer);
    pass.draw(6, 1, 0, 0);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  let rafId: number;
  function frame(time: number) {
    render(time);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  document.querySelector<HTMLElement>(".container")?.classList.remove("loading");
}

main();
