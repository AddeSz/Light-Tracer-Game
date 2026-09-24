import { mat4, vec3 } from "gl-matrix";

const FACES: vec3[] = [
  [1, 0, 0], // +X
  [-1, 0, 0], // -X
  [0, 1, 0], // +Y
  [0, -1, 0], // -Y
  [0, 0, 1], // +Z
  [0, 0, -1], // -Z
];

export class Cube {
  //GPU data: mat4 (16 floats) + 6 face color indices + 2 padding = 24 floats (96 bytes).
  static readonly FLOATS = 24;

  position: vec3;
  model: mat4;
  faceColors: number[];

  constructor(position: vec3) {
    this.position = position;
    this.model = mat4.create();
    mat4.translate(this.model, this.model, this.position);

    this.faceColors = FACES.map((normal, i) => (vec3.dot(position, normal) === 1 ? i : 6));
  }

  rotateAround(axis: vec3, angle: number) {
    const rot = mat4.fromRotation(mat4.create(), angle, axis);
    mat4.multiply(this.model, rot, this.model);
  }

  snap() {
    for (let i = 0; i < 3; i++) {
      const rounded = Math.round(this.model[12 + i]);
      this.model[12 + i] = rounded;
      this.position[i] = rounded;
    }
  }

  getModel(): mat4 {
    return this.model;
  }

  writeTo(floats: Float32Array, index: number) {
    const base = index * Cube.FLOATS;
    floats.set(this.model as Float32Array, base);
    floats.set(this.faceColors, base + 16);
  }
}

export class CubeMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;
  vertexCount: number;

  constructor(device: GPUDevice) {
    const faces = FACES.map((normal) => this.makeFace(normal));

    const vertices = new Float32Array(faces.flat());
    this.vertexCount = vertices.length / 5;

    this.buffer = device.createBuffer({
      label: "Cube Vertex Buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Float32Array(this.buffer.getMappedRange()).set(vertices);
    this.buffer.unmap();

    this.bufferLayout = {
      arrayStride: 20,
      attributes: [
        { shaderLocation: 0, format: "float32x3", offset: 0 },
        { shaderLocation: 1, format: "float32x2", offset: 12 },
      ],
    };
  }

  private makeFace(face: vec3): Array<number> {
    const res: number[] = [];

    const addVertex = (x: number, y: number, z: number) => {
      let u: number, v: number;
      if (face[2] !== 0) [u, v] = [x + 0.5, y + 0.5];
      else if (face[1] !== 0) [u, v] = [x + 0.5, z + 0.5];
      else [u, v] = [y + 0.5, z + 0.5];

      res.push(x, y, z, u, v);
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
