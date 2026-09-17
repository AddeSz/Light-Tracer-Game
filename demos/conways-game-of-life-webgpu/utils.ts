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

export function createResizeHandler(
  canvas: HTMLCanvasElement,
  device: GPUDevice,
  gridSize: number,
  onResize: () => void
) {
  function resizeCanvas() {
    const maxDim = device.limits.maxTextureDimension2D;
    const dpr = window.devicePixelRatio;
    const cssSize = Math.min(window.innerWidth, window.innerHeight);

    const rawBufferSize = Math.round(cssSize * dpr);
    const cellPixels = Math.max(1, Math.round(rawBufferSize / gridSize));
    const bufferSize = Math.min(cellPixels * gridSize, maxDim);

    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;

    if (canvas.width === bufferSize && canvas.height === bufferSize) return;

    canvas.width = bufferSize;
    canvas.height = bufferSize;
    onResize();
  }

  const resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(document.documentElement);

  let dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  function onDprChange() {
    resizeCanvas();
    dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener("change", onDprChange, { once: true });
  }
  dprQuery.addEventListener("change", onDprChange, { once: true });

  return { resizeCanvas, resizeObserver };
}
