import cellShaderCode from "./shaders/cell.wgsl?raw";
import simulationShaderCode from "./shaders/simulation.wgsl?raw";
import { configureContext, createResizeHandler, requestDevice } from "./utils";

const GRID_SIZE = 32;
const WORKGROUP_SIZE = 8;
const UPDATE_INTERVAL = 300;

// Square
const vertices = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);

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

function createRandomCellState(): Uint32Array<ArrayBuffer> {
  const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
  for (let i = 0; i < cellStateArray.length; ++i) {
    cellStateArray[i] = Math.random() > 0.75 ? 1 : 0;
  }
  return cellStateArray;
}

function createBuffer(device: GPUDevice, label: string, data: Float32Array | Uint32Array, usage: GPUBufferUsageFlags) {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function createCellBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  label: string,
  uniformBuffer: GPUBuffer,
  stateIn: GPUBuffer,
  stateOut: GPUBuffer
) {
  return device.createBindGroup({
    label,
    layout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: stateIn } },
      { binding: 2, resource: { buffer: stateOut } },
    ],
  });
}

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found");

  const device = await requestDevice();
  const { ctx, canvasFormat } = configureContext(canvas, device);

  const vertexBuffer = createBuffer(device, "Cell vertices", vertices, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
  const uniformBuffer = createBuffer(
    device,
    "Grid Uniforms",
    new Float32Array([GRID_SIZE, GRID_SIZE]),
    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  );

  const cellStateStorage = [
    createBuffer(device, "Cell State A", createRandomCellState(), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST),
    createBuffer(
      device,
      "Cell State B",
      new Uint32Array(GRID_SIZE * GRID_SIZE),
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    ),
  ];

  const bindGroupLayout = device.createBindGroupLayout({
    label: "Cell Bind Group Layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
        buffer: {}, //empty means uniform
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
    createCellBindGroup(
      device,
      bindGroupLayout,
      "Cell renderer bind group A",
      uniformBuffer,
      cellStateStorage[0],
      cellStateStorage[1]
    ),
    createCellBindGroup(
      device,
      bindGroupLayout,
      "Cell renderer bind group B",
      uniformBuffer,
      cellStateStorage[1],
      cellStateStorage[0]
    ),
  ];

  const cellShaderModule = device.createShaderModule({
    label: "Shader module",
    code: cellShaderCode,
  });

  const pipelineLayout = device.createPipelineLayout({
    label: "Cell Pipeline Layout",
    bindGroupLayouts: [bindGroupLayout],
  });
  const cellPipeline = device.createRenderPipeline({
    label: "Cell pipeline",
    layout: pipelineLayout,
    vertex: {
      module: cellShaderModule,
      entryPoint: "vertexMain",
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: "fragmentMain",
      targets: [{ format: canvasFormat }],
    },
  });

  const simulationShaderModule = device.createShaderModule({
    label: "Shader module",
    code: simulationShaderCode,
  });

  const simulationPipeline = device.createComputePipeline({
    label: "Simulation pipeline",
    layout: pipelineLayout,
    compute: {
      module: simulationShaderModule,
      entryPoint: "computeMain",
    },
  });

  let step = 0;
  let lastUpdateTime = 0;

  function simulate() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);

    pass.setPipeline(simulationPipeline);
    pass.setBindGroup(0, bindGroups[step % 2]);
    pass.dispatchWorkgroups(workgroupCount, workgroupCount);
    pass.end();

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
          clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
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

  function render(timestamp: DOMHighResTimeStamp) {
    if (timestamp - lastUpdateTime >= UPDATE_INTERVAL) {
      simulate();
      lastUpdateTime = timestamp;
    }

    draw();

    requestAnimationFrame(render);
  }

  const { resizeCanvas } = createResizeHandler(canvas!, device, GRID_SIZE, draw);
  resizeCanvas();

  requestAnimationFrame(render);
}

main();
