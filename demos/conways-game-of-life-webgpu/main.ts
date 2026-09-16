import "@/style.css";
import shaderCode from "./shaders/cell.wgsl?raw";

const GRID_SIZE = 32;
const WORKGROUP_SIZE = 8;

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!canvas) throw new Error("Canvas not found");

if (!navigator.gpu) {
  throw new Error("WebGPU not supported on this browser.");
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
  throw new Error("No appropriate GPUAdapter found.");
}
const device = await adapter.requestDevice();

const ctx = canvas.getContext("webgpu");
if (!ctx) throw new Error("WebGPU context not found");

const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
ctx.configure({
  device: device,
  format: canvasFormat,
});

const vertices = new Float32Array([
  -0.8, -0.8, 0.8, -0.8, 0.8, 0.8,

  -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
]);

const vertexBuffer = device.createBuffer({
  label: "Cell vertices",
  size: vertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, vertices);

const vertexBufferLayout: GPUVertexBufferLayout = {
  arrayStride: 8,
  attributes: [
    {
      format: "float32x2",
      offset: 0,
      shaderLocation: 0,
    },
  ],
};

const shaderModule = device.createShaderModule({
  label: "Shader module",
  code: shaderCode,
});

const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
const uniformBuffer = device.createBuffer({
  label: "Grid Uniforms",
  size: uniformArray.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
const cellStateStorage = [
  device.createBuffer({
    label: "Cell State A",
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }),
  device.createBuffer({
    label: "Cell State B",
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }),
];

for (let i = 0; i < cellStateArray.length; ++i) {
  cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
}
device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

// for (let i = 0; i < cellStateArray.length; i++) {
//   cellStateArray[i] = i % 2;
// }
// device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);

const bindGroupLayout = device.createBindGroupLayout({
  label: "Cell Bind Group Layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
      buffer: {},
    },
    {
      binding: 1,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" },
    },
    {
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" },
    },
  ],
});

const bindGroups = [
  device.createBindGroup({
    label: "Cell renderer bind group A",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
      {
        binding: 1,
        resource: { buffer: cellStateStorage[0] },
      },
      { binding: 2, resource: { buffer: cellStateStorage[1] } },
    ],
  }),
  device.createBindGroup({
    label: "Cell renderer bind group B",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
      {
        binding: 1,
        resource: { buffer: cellStateStorage[1] },
      },
      { binding: 2, resource: { buffer: cellStateStorage[0] } },
    ],
  }),
];

const pipelineLayout = device.createPipelineLayout({
  label: "Cell Pipeline Layout",
  bindGroupLayouts: [bindGroupLayout],
});

const cellPipeline = device.createRenderPipeline({
  label: "Cell pipeline",
  layout: pipelineLayout,
  vertex: {
    module: shaderModule,
    entryPoint: "vertexMain",
    buffers: [vertexBufferLayout],
  },
  fragment: {
    module: shaderModule,
    entryPoint: "fragmentMain",
    targets: [{ format: canvasFormat }],
  },
});

const simulationPipeline = device.createComputePipeline({
  label: "Simulation pipeline",
  layout: pipelineLayout,
  compute: {
    module: shaderModule,
    entryPoint: "computeMain",
  },
});

const UPDATE_INTERVAL = 300;
let step = 0;
let lastUpdateTime = 0;

function simulate() {
  const encoder = device.createCommandEncoder();

  const computePass = encoder.beginComputePass();
  computePass.setPipeline(simulationPipeline);
  computePass.setBindGroup(0, bindGroups[step % 2]);
  const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
  computePass.dispatchWorkgroups(workgroupCount, workgroupCount);
  computePass.end();

  device.queue.submit([encoder.finish()]);

  step++;
}

function draw() {
  const encoder = device.createCommandEncoder();

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: ctx!.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0.4, a: 1.0 },
        storeOp: "store",
      },
    ],
  });

  pass.setPipeline(cellPipeline);
  pass.setBindGroup(0, bindGroups[step % 2]);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE);

  pass.end();
  device.queue.submit([encoder.finish()]);
}

function frame(timestamp: DOMHighResTimeStamp) {
  if (timestamp - lastUpdateTime >= UPDATE_INTERVAL) {
    simulate();
    lastUpdateTime = timestamp;
  }

  draw();

  requestAnimationFrame(frame);
}

function resizeCanvas() {
  const maxDim = device.limits.maxTextureDimension2D;
  const size = Math.max(1, Math.min(window.innerWidth, window.innerHeight, maxDim));

  if (canvas!.width === size && canvas!.height === size) return;

  canvas!.style.width = `${size}px`;
  canvas!.style.height = `${size}px`;
  canvas!.width = size;
  canvas!.height = size;
  draw();
}

const resizeObserver = new ResizeObserver(() => resizeCanvas());
resizeObserver.observe(document.documentElement);

resizeCanvas();

requestAnimationFrame(frame);
