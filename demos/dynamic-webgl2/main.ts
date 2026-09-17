import fragmentShaderSource from "./shaders/dynamic.frag?raw";
import vertexShaderSource from "./shaders/dynamic.vert?raw";

const SPAWN_RATE = 0.08;
const MIN_SHAPE_TIME = 0.25;
const MAX_SHAPE_TIME = 6;
const MIN_SHAPE_SPEED = 125;
const MAX_SHAPE_SPEED = 350;
const MIN_SHAPE_SIZE = 2;
const MAX_SHAPE_SIZE = 50;
const MAX_SHAPE_COUNT = 250;

type Scene = {
  program: WebGLProgram;
  shapeLocationUniform: WebGLUniformLocation;
  shapeSizeUniform: WebGLUniformLocation;
  canvasSizeUniform: WebGLUniformLocation;
  vaos: {
    vao: WebGLVertexArrayObject;
    numVertices: number;
  }[];
  shapes: MovingShape[];
};

class MovingShape {
  position: [number, number];
  velocity: [number, number];
  size: number;
  timeRemaining: number;
  numVertices: number;
  vao: WebGLVertexArrayObject;

  constructor(
    position: [number, number],
    velocity: [number, number],
    size: number,
    vao: WebGLVertexArrayObject,
    timeRemaining: number,
    numVertices: number
  ) {
    this.position = position;
    this.velocity = velocity;
    this.size = size;
    this.vao = vao;
    this.timeRemaining = timeRemaining;
    this.numVertices = numVertices;
  }

  isAlive() {
    return this.timeRemaining > 0;
  }

  update(dt: number) {
    this.position[0] += this.velocity[0] * dt;
    this.position[1] += this.velocity[1] * dt;
    this.timeRemaining -= dt;
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!canvas) {
  throw new Error("Canvas not found");
}

const gl = canvas.getContext("webgl2");
if (!gl) {
  throw new Error("WebGL2 is not supported");
}

const trianglePositions = new Float32Array([0.0, 1.0, -1.0, -1.0, 1.0, -1.0]);
const squarePositions = new Float32Array([-1, 1, -1, -1, 1, -1, -1, 1, 1, -1, 1, 1]);
const rgbTriangleColors = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]);
const fireyTriangleColors = new Uint8Array([229, 47, 15, 246, 206, 29, 233, 154, 26]);
const indigoGradientSquareColors = new Uint8Array([
  167, 153, 255, 88, 62, 122, 88, 62, 122, 167, 153, 255, 88, 62, 122, 167, 153, 255,
]);
const graySquareColors = new Uint8Array([45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45]);

function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;

    gl.viewport(0, 0, width, height);
  }
}

function createStaticBuffer(gl: WebGL2RenderingContext, data: ArrayBufferView) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Failed to allocate buffer");

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return buffer;
}

function createShapeVao(
  gl: WebGL2RenderingContext,
  positionBuffer: WebGLBuffer,
  colorBuffer: WebGLBuffer,
  positionLoc: number,
  colorLoc: number
): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error("Could not create VAO");
  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.enableVertexAttribArray(colorLoc);
  gl.vertexAttribPointer(colorLoc, 3, gl.UNSIGNED_BYTE, true, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null);

  return vao;
}

function init(gl: WebGL2RenderingContext): Scene {
  // Vertex shader
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  if (!vertexShader) throw new Error("Could not create vertex shader");
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error(`Failed to COMPILE vertex shader - ${gl.getShaderInfoLog(vertexShader)}`);
  }

  // Fragment shader
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fragmentShader) throw new Error("Could not create fragment shader");
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error(`Failed to COMPILE fragment shader - ${gl.getShaderInfoLog(fragmentShader)}`);
  }

  // Program shader (linked shaders)
  const triangleShaderProgram = gl.createProgram();
  if (!triangleShaderProgram) throw new Error("Could not create program");
  gl.attachShader(triangleShaderProgram, vertexShader);
  gl.attachShader(triangleShaderProgram, fragmentShader);
  gl.linkProgram(triangleShaderProgram);
  if (!gl.getProgramParameter(triangleShaderProgram, gl.LINK_STATUS)) {
    throw new Error(`Failed to LINK shaders - ${gl.getProgramInfoLog(triangleShaderProgram)}`);
  }
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  // Attribute locations
  const vertexPosAttributeLocation = gl.getAttribLocation(triangleShaderProgram, "vertexPosition");
  const vertexColorAttributeLocation = gl.getAttribLocation(triangleShaderProgram, "vertexColor");
  if (vertexPosAttributeLocation < 0 || vertexColorAttributeLocation < 0) {
    throw new Error(
      `Failed to get attribute location for vertexPosition (pos=${vertexPosAttributeLocation}` +
        `, color=${vertexColorAttributeLocation})`
    );
  }

  // Uniform locations
  const shapeLocationUniform = gl.getUniformLocation(triangleShaderProgram, "shapeLocation");
  const shapeSizeUniform = gl.getUniformLocation(triangleShaderProgram, "shapeSize");
  const canvasSizeUniform = gl.getUniformLocation(triangleShaderProgram, "canvasSize");
  if (shapeLocationUniform === null || shapeSizeUniform === null || canvasSizeUniform === null) {
    throw new Error(
      `Failed to get uniform locations (shapeLocation=${!!shapeLocationUniform}` +
        `, shapeSize=${!!shapeSizeUniform}` +
        `, canvasSize=${!!canvasSizeUniform})`
    );
  }

  const triangleGeoBuffer = createStaticBuffer(gl, trianglePositions);
  const rgbTriangleBuffer = createStaticBuffer(gl, rgbTriangleColors);
  const fireyTriangleBuffer = createStaticBuffer(gl, fireyTriangleColors);
  const squareGeoBuffer = createStaticBuffer(gl, squarePositions);
  const indigoSquareBuffer = createStaticBuffer(gl, indigoGradientSquareColors);
  const graySquareBuffer = createStaticBuffer(gl, graySquareColors);

  if (
    !triangleGeoBuffer ||
    !rgbTriangleBuffer ||
    !fireyTriangleBuffer ||
    !squareGeoBuffer ||
    !indigoSquareBuffer ||
    !graySquareBuffer
  ) {
    throw new Error(
      `Failed to create vertex buffers (` +
        `triangleGeoBuffer=${!!triangleGeoBuffer}` +
        `, rgbTriangleBuffer=${!!rgbTriangleBuffer}` +
        `, fireyTriangleBuffer=${!!fireyTriangleBuffer}` +
        `, squareGeoBuffer=${!!squareGeoBuffer}` +
        `, indigoSquareBuffer=${!!indigoSquareBuffer}` +
        `, graySquareBuffer=${!!graySquareBuffer})`
    );
  }

  const shapeDefs = [
    { geo: triangleGeoBuffer, color: rgbTriangleBuffer, numVertices: 3 },
    { geo: triangleGeoBuffer, color: fireyTriangleBuffer, numVertices: 3 },
    { geo: squareGeoBuffer, color: indigoSquareBuffer, numVertices: 6 },
    { geo: squareGeoBuffer, color: graySquareBuffer, numVertices: 6 },
  ];

  const vaos = shapeDefs.map(({ geo, color, numVertices }) => ({
    vao: createShapeVao(gl, geo, color, vertexPosAttributeLocation, vertexColorAttributeLocation),
    numVertices,
  }));

  return {
    program: triangleShaderProgram,
    shapeLocationUniform,
    shapeSizeUniform,
    canvasSizeUniform,
    vaos,
    shapes: [],
  };
}

function draw(gl: WebGL2RenderingContext, scene: Scene) {
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(scene.program);
  gl.uniform2f(scene.canvasSizeUniform, gl.canvas.width, gl.canvas.height);

  for (const shape of scene.shapes) {
    gl.bindVertexArray(shape.vao);
    gl.uniform2f(scene.shapeLocationUniform, shape.position[0], shape.position[1]);
    gl.uniform1f(scene.shapeSizeUniform, shape.size);
    gl.drawArrays(gl.TRIANGLES, 0, shape.numVertices);
  }
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function spawnShape(scene: Scene, canvasWidth: number, canvasHeight: number): MovingShape {
  const { vao, numVertices } = scene.vaos[Math.floor(Math.random() * scene.vaos.length)];
  const size = randomRange(MIN_SHAPE_SIZE, MAX_SHAPE_SIZE);
  const speed = randomRange(MIN_SHAPE_SPEED, MAX_SHAPE_SPEED);
  const angle = Math.random() * Math.PI * 2;
  const timeRemaining = randomRange(MIN_SHAPE_TIME, MAX_SHAPE_TIME);

  return new MovingShape(
    [randomRange(0, canvasWidth), randomRange(0, canvasHeight)],
    [Math.cos(angle) * speed, Math.sin(angle) * speed],
    size,
    vao,
    timeRemaining,
    numVertices
  );
}

const scene = init(gl);

let lastTime = performance.now();
let spawnTimer = 0;
function render(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, time: number) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  resizeCanvas(canvas, gl);

  scene.shapes = scene.shapes.filter((shape) => shape.isAlive());

  spawnTimer += dt;
  while (spawnTimer >= SPAWN_RATE && scene.shapes.length < MAX_SHAPE_COUNT) {
    spawnTimer -= SPAWN_RATE;
    scene.shapes.push(spawnShape(scene, canvas.width, canvas.height));
  }

  for (const shape of scene.shapes) {
    shape.update(dt);
  }

  draw(gl, scene);
  requestAnimationFrame((t) => render(canvas, gl, t));
}

requestAnimationFrame((t) => render(canvas, gl, t));
