import { mat4, vec3 } from "gl-matrix";

const deg2rad = (degrees: number) => degrees * (Math.PI / 180);

export class Square {
  position: vec3;
  eulers: vec3;
  model: mat4;

  constructor(position: vec3, theta: number) {
    this.position = position;
    this.eulers = vec3.create();
    this.eulers[2] = theta;
    this.model = mat4.create();
  }

  update(deltaTime: number) {
    this.eulers[2] += 60 * deltaTime;
    this.eulers[2] %= 360;

    mat4.identity(this.model);
    mat4.translate(this.model, this.model, this.position);
    mat4.rotateZ(this.model, this.model, deg2rad(this.eulers[2]));
  }

  getModel(): mat4 {
    return this.model;
  }
}

export class SquareMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  constructor(device: GPUDevice) {
    // x y z r g b
    const vertices = new Float32Array([
      0.0, -0.5, -0.5, 1.0, 0.0, 0.0,

      0.0, 0.5, -0.5, 0.0, 1.0, 0.0,

      0.0, 0.5, 0.5, 0.0, 0.0, 1.0,

      0.0, -0.5, -0.5, 1.0, 0.0, 0.0,

      0.0, 0.5, 0.5, 0.0, 0.0, 1.0,

      0.0, -0.5, 0.5, 1.0, 1.0, 0.0,
    ]);

    this.buffer = device.createBuffer({
      label: "Square Vertex buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Float32Array(this.buffer.getMappedRange()).set(vertices);
    this.buffer.unmap();

    this.bufferLayout = {
      arrayStride: 24,
      attributes: [
        { shaderLocation: 0, format: "float32x3", offset: 0 },
        { shaderLocation: 1, format: "float32x3", offset: 12 },
      ],
    };
  }
}
