import { mat4, vec3 } from "gl-matrix";
import { deg2rad } from "../main";

export class Cube {
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

export class CubeMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;
  vertexCount: number;

  constructor(device: GPUDevice) {
    const faces = [
      this.makeFace([0, 0, 1], [1, 0, 0]),
      this.makeFace([0, 0, -1], [0, 1, 0]),
      this.makeFace([0, 1, 0], [0, 0, 1]),
      this.makeFace([0, -1, 0], [1, 1, 0]),
      this.makeFace([1, 0, 0], [0, 1, 1]),
      this.makeFace([-1, 0, 0], [1, 0, 1]),
    ];

    const vertices = new Float32Array(faces.flat());
    this.vertexCount = vertices.length / 6;

    this.buffer = device.createBuffer({
      label: "Cube Vertex Buffer",
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

  private makeFace(face: vec3, color: vec3): Array<number> {
    const res: number[] = [];

    const addVertex = (x: number, y: number, z: number) => {
      res.push(x, y, z, color[0], color[1], color[2]);
    };

    if (face[2] === 1) {
      // Front (+Z)
      addVertex(-0.5, -0.5, 0.5);
      addVertex(0.5, -0.5, 0.5);
      addVertex(0.5, 0.5, 0.5);
      addVertex(-0.5, -0.5, 0.5);
      addVertex(0.5, 0.5, 0.5);
      addVertex(-0.5, 0.5, 0.5);
    } else if (face[2] === -1) {
      // Back (-Z)
      addVertex(0.5, -0.5, -0.5);
      addVertex(-0.5, -0.5, -0.5);
      addVertex(-0.5, 0.5, -0.5);
      addVertex(0.5, -0.5, -0.5);
      addVertex(-0.5, 0.5, -0.5);
      addVertex(0.5, 0.5, -0.5);
    } else if (face[1] === 1) {
      // Top (+Y)
      addVertex(-0.5, 0.5, 0.5);
      addVertex(0.5, 0.5, 0.5);
      addVertex(0.5, 0.5, -0.5);
      addVertex(-0.5, 0.5, 0.5);
      addVertex(0.5, 0.5, -0.5);
      addVertex(-0.5, 0.5, -0.5);
    } else if (face[1] === -1) {
      // Bottom (-Y)
      addVertex(-0.5, -0.5, -0.5);
      addVertex(0.5, -0.5, -0.5);
      addVertex(0.5, -0.5, 0.5);
      addVertex(-0.5, -0.5, -0.5);
      addVertex(0.5, -0.5, 0.5);
      addVertex(-0.5, -0.5, 0.5);
    } else if (face[0] === 1) {
      // Right (+X)
      addVertex(0.5, -0.5, 0.5);
      addVertex(0.5, -0.5, -0.5);
      addVertex(0.5, 0.5, -0.5);
      addVertex(0.5, -0.5, 0.5);
      addVertex(0.5, 0.5, -0.5);
      addVertex(0.5, 0.5, 0.5);
    } else {
      // Left (-X)
      addVertex(-0.5, -0.5, -0.5);
      addVertex(-0.5, -0.5, 0.5);
      addVertex(-0.5, 0.5, 0.5);
      addVertex(-0.5, -0.5, -0.5);
      addVertex(-0.5, 0.5, 0.5);
      addVertex(-0.5, 0.5, -0.5);
    }
    return res;
  }
}
