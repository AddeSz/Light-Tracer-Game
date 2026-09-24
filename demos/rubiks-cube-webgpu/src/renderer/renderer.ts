import type { Camera } from "../camera";
import type { Scene } from "../scene";
import { createResources, SAMPLE_COUNT, setupDevice, type RendererResources } from "./renderer-resources";

export class Renderer {
  public device: GPUDevice;

  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext;
  private resources: RendererResources;

  private depthTexture?: GPUTexture;
  private depthAttachment?: GPURenderPassDepthStencilAttachment;
  private depthSize = { width: 0, height: 0 };
  private msaaTexture?: GPUTexture;

  private constructor(
    canvas: HTMLCanvasElement,
    device: GPUDevice,
    context: GPUCanvasContext,
    resources: RendererResources
  ) {
    this.canvas = canvas;
    this.device = device;
    this.context = context;
    this.resources = resources;
  }

  static async build(canvas: HTMLCanvasElement) {
    const { device, context, format } = await setupDevice(canvas);
    const resources = createResources(device, format);
    return new Renderer(canvas, device, context, resources);
  }

  async render(scene: Scene, camera: Camera, deltaTime: number) {
    scene.update(deltaTime);
    this.updateDepthBuffer();

    camera.aspect = this.canvas.width / this.canvas.height;
    const view = camera.getViewMatrix();
    const projection = camera.getProjectionMatrix();

    const cubes = scene.getCubes();

    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, view as Float32Array);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 64, projection as Float32Array);
    this.device.queue.writeBuffer(this.resources.objectBuffer, 0, scene.getCubeData());

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.msaaTexture!.createView(),
          resolveTarget: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "discard",
        },
      ],
      depthStencilAttachment: this.depthAttachment,
    });

    pass.setPipeline(this.resources.pipeline);
    pass.setBindGroup(0, this.resources.bindGroup);
    pass.setVertexBuffer(0, this.resources.cubeMesh.buffer);
    pass.draw(this.resources.cubeMesh.vertexCount, cubes.length, 0);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  private updateDepthBuffer() {
    const { width, height } = this.canvas;

    if (width === this.depthSize.width && height === this.depthSize.height) return;

    this.depthSize = { width, height };
    this.depthTexture?.destroy();
    this.msaaTexture?.destroy();

    this.depthTexture = this.device.createTexture({
      size: [width, height],
      format: this.resources.depthStencilState.format,
      sampleCount: SAMPLE_COUNT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.msaaTexture = this.device.createTexture({
      size: [width, height],
      format: this.resources.format,
      sampleCount: SAMPLE_COUNT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.depthAttachment = {
      view: this.depthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    };
  }
}
