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

// Best version for precision. However, it clashes with rAF loops since it async
export function observeCanvasResize(
  canvas: HTMLCanvasElement,
  device: GPUDevice,
  onResize: () => void
): { disconnect: () => void } {
  const dpr = Math.min(window.devicePixelRatio, 2) || 1;

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.devicePixelContentBoxSize?.[0].inlineSize || entry.contentBoxSize[0].inlineSize * dpr;

      const height = entry.devicePixelContentBoxSize?.[0].blockSize || entry.contentBoxSize[0].blockSize * dpr;

      const target = entry.target as HTMLCanvasElement;
      target.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      target.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }

    onResize();
  });

  try {
    observer.observe(canvas, { box: "device-pixel-content-box" });
  } catch {
    observer.observe(canvas, { box: "content-box" });
  }

  return {
    disconnect: () => observer.disconnect(),
  };
}

export function resizeCanvas(canvas: HTMLCanvasElement, device: GPUDevice) {
  const dpr = Math.min(window.devicePixelRatio, 2) || 1;
  const width = Math.max(1, Math.min(canvas.clientWidth * dpr, device.limits.maxTextureDimension2D));
  const height = Math.max(1, Math.min(canvas.clientHeight * dpr, device.limits.maxTextureDimension2D));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}
