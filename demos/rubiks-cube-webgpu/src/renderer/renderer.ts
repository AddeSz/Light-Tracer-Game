import { mat4 } from "gl-matrix";
import type { Scene } from "../scene";
import { createResources, setupDevice, type RendererResources } from "./renderer-resources";

export class Renderer {
  public device: GPUDevice;

  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext;
  private resources: RendererResources;

  private depthTexture?: GPUTexture;
  private depthAttachment?: GPURenderPassDepthStencilAttachment;
  private depthSize = { width: 0, height: 0 };

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

  async render(scene: Scene, deltaTime: number) {
    scene.update(deltaTime);
    this.updateDepthBuffer();

    const view = mat4.lookAt(mat4.create(), [-6, 0, 0], [0, 0, 0], [0, 0, 1]);
    const projection = mat4.perspective(mat4.create(), Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 10);

    this.device.queue.writeBuffer(this.resources.uniformBuffer, 0, view as Float32Array);
    this.device.queue.writeBuffer(this.resources.uniformBuffer, 64, projection as Float32Array);
    this.device.queue.writeBuffer(this.resources.objectBuffer, 0, scene.getObjectData());

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
      depthStencilAttachment: this.depthAttachment,
    });

    pass.setPipeline(this.resources.pipeline);
    pass.setBindGroup(0, this.resources.bindGroup);
    pass.setVertexBuffer(0, this.resources.mesh.buffer);
    pass.draw(6, scene.getObjects().length, 0, 0);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  private updateDepthBuffer() {
    const { width, height } = this.canvas;

    if (width === this.depthSize.width && height === this.depthSize.height) return;

    this.depthSize = { width, height };
    this.depthTexture?.destroy();

    this.depthTexture = this.device.createTexture({
      size: [width, height],
      format: this.resources.depthStencilState.format,
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
