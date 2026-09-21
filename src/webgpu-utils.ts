export async function requestDevice() {
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported on this browser.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No appropriate GPUAdapter found.");
  }

  return adapter.requestDevice();
}

export function configureContext(canvas: HTMLCanvasElement, device: GPUDevice) {
  const ctx = canvas.getContext("webgpu");
  if (!ctx) throw new Error("WebGPU context not found");

  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format: canvasFormat });

  return { ctx, canvasFormat };
}

export function createBuffer(
  device: GPUDevice,
  label: string,
  data: Float32Array | Uint32Array,
  usage: GPUBufferUsageFlags
) {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}
