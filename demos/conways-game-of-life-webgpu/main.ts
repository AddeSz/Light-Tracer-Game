import cellShaderCode from "./shaders/cell.wgsl?raw";
import countShaderCode from "./shaders/count.wgsl?raw";
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

function getButton(id: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(id);
  if (!button) throw new Error(`Button with id: ${id} not found!`);
  return button;
}

function getParagraph(id: string): HTMLParagraphElement {
  const paragraph = document.querySelector<HTMLParagraphElement>(id);
  if (!paragraph) throw new Error(`Paragraph with id: ${id} not found!`);
  return paragraph;
}

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) throw new Error("Canvas not found");
  const device = await requestDevice();
  const { ctx, canvasFormat } = configureContext(canvas, device);

  let step = 0;
  let lastUpdateTime = 0;
  let initialState = new Uint32Array(GRID_SIZE * GRID_SIZE);

  let aliveCount = 0;
  let running = false;
  let checking = false;
  let recheck = false;

  const startStopButton = getButton("#start-stop-button");
  const resetClearButton = getButton("#reset-clear-button");
  const nextButton = getButton("#next-button");
  const aliveCountLabel = getParagraph("#count-label");
  const stepCountLabel = getParagraph("#step-label");

  function updateResetClearButton() {
    if (step > 0) {
      resetClearButton.textContent = "Reset";
      resetClearButton.disabled = false;
    } else {
      resetClearButton.textContent = "Clear";
      resetClearButton.disabled = aliveCount === 0;
    }
  }

  function updateStepCountLabel() {
    stepCountLabel.textContent = `Step Count: ${step}`;
  }

  startStopButton.addEventListener("click", () => {
    running = !running;
    resetClearButton.disabled = false;
    if (running) {
      startStopButton.textContent = "Stop";
      nextButton.disabled = true;
    } else {
      startStopButton.textContent = "Start";
      nextButton.disabled = false;
    }
  });

  resetClearButton.addEventListener("click", () => {
    if (step === 0) {
      initialState.fill(0);
    }

    device.queue.writeBuffer(cellStateStorage[0], 0, initialState);
    device.queue.writeBuffer(cellStateStorage[1], 0, new Uint32Array(GRID_SIZE * GRID_SIZE));

    step = 0;
    lastUpdateTime = 0;
    running = false;
    aliveCount = initialState.reduce((a, b) => a + b, 0);
    startStopButton.textContent = "Start";
    startStopButton.disabled = false;
    nextButton.disabled = false;

    updateStepCountLabel();
    updateResetClearButton();
    draw();
    void updateAliveCount();
  });

  nextButton.addEventListener("click", () => {
    if (!running) {
      simulate();
      resetClearButton.disabled = false;
    }
  });

  canvas.addEventListener("click", (e) => {
    if (running || step !== 0) return;
    const rect = canvas.getBoundingClientRect();

    const col = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_SIZE);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_SIZE);
    let index = row * GRID_SIZE + col;
    initialState[index] = initialState[index] ? 0 : 1;
    device.queue.writeBuffer(cellStateStorage[0], index * 4, initialState, index, 1);

    startStopButton.disabled = false;
    nextButton.disabled = false;
    void updateAliveCount();
  });

  const cellStateStorage = [
    createBuffer(device, "Cell State A", initialState, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST),
    createBuffer(
      device,
      "Cell State B",
      new Uint32Array(GRID_SIZE * GRID_SIZE),
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    ),
  ];

  const vertexBuffer = createBuffer(device, "Cell vertices", vertices, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
  const uniformBuffer = createBuffer(
    device,
    "Grid Uniforms",
    new Float32Array([GRID_SIZE, GRID_SIZE]),
    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  );
  const counterBuffer = device.createBuffer({
    label: "Alive cell counter",
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });

  const counterReadback = device.createBuffer({
    label: "Alive cell counter readback",
    size: 4,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

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

  const countBindGroupLayout = device.createBindGroupLayout({
    label: "Count Bind Group Layout",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
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

  const countBindGroups = cellStateStorage.map((stateBuffer, i) =>
    device.createBindGroup({
      label: `Count bind group ${i}`,
      layout: countBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: stateBuffer } },
        { binding: 1, resource: { buffer: counterBuffer } },
      ],
    })
  );

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

  const simulationPipeline = device.createComputePipeline({
    label: "Simulation pipeline",
    layout: pipelineLayout,
    compute: {
      module: device.createShaderModule({
        label: "Shader module",
        code: simulationShaderCode,
      }),
      entryPoint: "computeMain",
    },
  });

  const countPipeline = device.createComputePipeline({
    label: "Count pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [countBindGroupLayout] }),
    compute: {
      module: device.createShaderModule({ label: "Count shader module", code: countShaderCode }),
      entryPoint: "countMain",
    },
  });

  async function countAliveCells(): Promise<number> {
    const encoder = device.createCommandEncoder();
    encoder.clearBuffer(counterBuffer); // zero buffer before every count
    const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);

    const pass = encoder.beginComputePass();
    pass.setPipeline(countPipeline);
    pass.setBindGroup(0, countBindGroups[step % 2]);
    pass.dispatchWorkgroups(workgroupCount, workgroupCount);
    pass.end();

    encoder.copyBufferToBuffer(counterBuffer, 0, counterReadback, 0, 4);
    device.queue.submit([encoder.finish()]);

    await counterReadback.mapAsync(GPUMapMode.READ);
    const count = new Uint32Array(counterReadback.getMappedRange())[0];
    counterReadback.unmap();
    return count;
  }

  async function updateAliveCount() {
    if (checking) {
      recheck = true;
      return;
    }
    checking = true;
    try {
      do {
        recheck = false;
        const stepAtCheck = step;
        const alive = await countAliveCells();

        if (step !== stepAtCheck) {
          recheck = true;
          continue;
        }

        aliveCount = alive;
        updateResetClearButton();
        if (aliveCountLabel) aliveCountLabel.textContent = "Alive count: " + String(aliveCount);
        if (alive === 0) {
          running = false;
          startStopButton.textContent = "Start";
          startStopButton.disabled = true;
          nextButton.disabled = true;
        }
      } while (recheck);
    } finally {
      checking = false;
    }
  }

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
    updateStepCountLabel();
    updateResetClearButton();
    void updateAliveCount();
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
    if (running && timestamp - lastUpdateTime >= UPDATE_INTERVAL) {
      simulate();
      lastUpdateTime = timestamp;
    }

    draw();

    requestAnimationFrame(render);
  }

  const { resizeCanvas } = createResizeHandler(canvas, device, GRID_SIZE, draw);
  resizeCanvas();

  updateStepCountLabel();
  updateResetClearButton();
  await updateAliveCount();

  document.querySelector(".layout")?.classList.remove("loading");
  requestAnimationFrame(render);
}

main().catch((err) => {
  console.error(err);
  document.querySelector(".layout")?.classList.remove("loading");
  document.body.textContent = "WebGPU is not available in this browser.";
});
