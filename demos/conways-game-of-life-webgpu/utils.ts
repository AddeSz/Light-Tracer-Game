export function createResizeHandler(
  canvas: HTMLCanvasElement,
  device: GPUDevice,
  gridSize: number,
  onResize: () => void
) {
  const cssSize = 800; // must match #canvas width/height in css...

  function resizeCanvas() {
    const maxDim = device.limits.maxTextureDimension2D;
    const dpr = window.devicePixelRatio;

    const rawBufferSize = Math.round(cssSize * dpr);
    const cellPixels = Math.max(1, Math.round(rawBufferSize / gridSize));
    const bufferSize = Math.min(cellPixels * gridSize, maxDim);

    if (canvas.width === bufferSize && canvas.height === bufferSize) return;

    canvas.width = bufferSize;
    canvas.height = bufferSize;
    onResize();
  }

  let dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  function onDprChange() {
    resizeCanvas();
    dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener("change", onDprChange, { once: true });
  }
  dprQuery.addEventListener("change", onDprChange, { once: true });

  return { resizeCanvas };
}
