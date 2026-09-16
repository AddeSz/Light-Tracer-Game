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

export function createResizeHandler(canvas: HTMLCanvasElement, device: GPUDevice, onResize: () => void) {
  function resizeCanvas() {
    const maxDim = device.limits.maxTextureDimension2D;
    const size = Math.max(1, Math.min(window.innerWidth, window.innerHeight, maxDim));

    if (canvas.width === size && canvas.height === size) return;

    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = size;
    canvas.height = size;
    onResize();
  }

  const resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(document.documentElement);

  return { resizeCanvas, resizeObserver };
}
