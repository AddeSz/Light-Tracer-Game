import { mat4 } from "gl-matrix";
import shaderCode from "./shaders/shader.wgsl?raw";
import { SquareMesh } from "./square-mesh";

export class Renderer {
  canvas: HTMLCanvasElement;
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  uniformBuffer!: GPUBuffer;
  bindGroup!: GPUBindGroup;
  pipeline!: GPURenderPipeline;

  squareMesh!: SquareMesh;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize() {
    await this.setupDevice();
    this.createAssets();
    await this.makePipeline();
  }

  async setupDevice() {
    if (!navigator.gpu) throw new Error("WebGPU not supported on this browser.");

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No appropriate GPUAdapter found.");

    this.adapter = adapter;
    this.device = await adapter.requestDevice();

    const ctx = this.canvas.getContext("webgpu");
    if (!ctx) throw new Error("WebGPU context not found");
    this.context = ctx;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format });
  }

  createAssets() {
    this.squareMesh = new SquareMesh(this.device);
  }

  async makePipeline() {
    this.uniformBuffer = this.device.createBuffer({
      label: "Uniform buffer",
      size: 64 * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });
    const shaderModule = this.device.createShaderModule({
      label: "Shader code module",
      code: shaderCode,
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
        buffers: [this.squareMesh.bufferLayout],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: this.format }],
      },
      primitive: { topology: "triangle-list" },
    });
  }

  render(time: number) {
    const projection = mat4.perspective(mat4.create(), Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 10);
    const view = mat4.lookAt(mat4.create(), [-2, 0, 0], [0, 0, 0], [0, 0, 1]);
    const model = mat4.rotate(mat4.create(), mat4.create(), time / 1000, [0, 0, 1]);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, model as Float32Array);
    this.device.queue.writeBuffer(this.uniformBuffer, 64, view as Float32Array);
    this.device.queue.writeBuffer(this.uniformBuffer, 128, projection as Float32Array);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.squareMesh.buffer);
    pass.draw(6, 1, 0, 0);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}
