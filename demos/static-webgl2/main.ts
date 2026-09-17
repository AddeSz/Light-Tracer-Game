import fragmentShaderSource from "./shaders/static.frag?raw";
import vertexShaderSource from "./shaders/static.vert?raw";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!canvas) {
  throw new Error("Canvas not found");
}

const gl = canvas.getContext("webgl2");

if (!gl) {
  throw new Error("WebGL2 is not supported");
}

function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;

    gl.viewport(0, 0, width, height);
  }
}

function initTriangle(gl: WebGL2RenderingContext) {
  const triangleVertices = [0.0, 0.5, -0.5, -0.5, 0.5, -0.5];
  const triangleVerticesCpuBuffer = new Float32Array(triangleVertices);

  const triangleGeoBuffer = gl.createBuffer();
  if (!triangleGeoBuffer) {
    throw new Error("Could not create buffer");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, triangleGeoBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVerticesCpuBuffer, gl.STATIC_DRAW);

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

  const vertexPosAttributeLocation = gl.getAttribLocation(triangleShaderProgram, "vertexPosition");
  if (vertexPosAttributeLocation < 0) {
    throw new Error("Failed to get attribute location for vertexPosition");
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleGeoBuffer);
  gl.enableVertexAttribArray(vertexPosAttributeLocation);
  gl.vertexAttribPointer(vertexPosAttributeLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  return { program: triangleShaderProgram, vao };
}

function drawTriangle(gl: WebGL2RenderingContext, triangle: { program: WebGLProgram; vao: WebGLVertexArrayObject }) {
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(triangle.program);
  gl.bindVertexArray(triangle.vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

const triangle = initTriangle(gl);

function render(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  resizeCanvas(canvas, gl);
  drawTriangle(gl, triangle);
}

window.addEventListener("resize", () => render(canvas, gl));
render(canvas, gl);
