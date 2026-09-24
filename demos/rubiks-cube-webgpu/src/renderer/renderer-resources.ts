import { CubeMesh } from "../model/cube";
import shaderCode from "../shaders/shader.wgsl?raw";

export const SAMPLE_COUNT = 4;

export type RendererResources = {
  cubeMesh: CubeMesh;
  objectBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  pipeline: GPURenderPipeline;
  depthStencilState: GPUDepthStencilState;
  format: GPUTextureFormat;
};

export async function setupDevice(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) throw new Error("WebGPU not supported on this browser.");

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("No appropriate GPUAdapter found.");

  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("WebGPU context not found");

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  return { adapter, device, context, format };
}

export function createResources(device: GPUDevice, format: GPUTextureFormat): RendererResources {
  const cubeMesh = new CubeMesh(device);

  const objectBuffer = device.createBuffer({
    label: "Object buffer",
    size: 64 * 1024,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const depthStencilState: GPUDepthStencilState = {
    format: "depth24plus",
    depthWriteEnabled: true,
    depthCompare: "less-equal",
  };

  const uniformBuffer = device.createBuffer({
    label: "Uniform buffer",
    size: 64 * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage", hasDynamicOffset: false } },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: objectBuffer } },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
  const shaderModule = device.createShaderModule({ label: "Shader code module", code: shaderCode });

  const pipeline = device.createRenderPipeline({
    label: "Render pipeline",
    layout: pipelineLayout,
    vertex: { module: shaderModule, entryPoint: "vertexMain", buffers: [cubeMesh.bufferLayout] },
    fragment: { module: shaderModule, entryPoint: "fragmentMain", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
    depthStencil: depthStencilState,
    multisample: { count: SAMPLE_COUNT },
  });

  return { cubeMesh, objectBuffer, uniformBuffer, bindGroup, pipeline, depthStencilState, format };
}
