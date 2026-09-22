export class SquareMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  constructor(device: GPUDevice) {
    // x y z r g b
    const vertices = new Float32Array([
      -0.5, -0.5, 0.0, 1.0, 0.0, 0.0,

      0.5, -0.5, 0.0, 0.0, 1.0, 0.0,

      0.5, 0.5, 0.0, 0.0, 0.0, 1.0,

      -0.5, -0.5, 0.0, 1.0, 0.0, 0.0,

      0.5, 0.5, 0.0, 0.0, 0.0, 1.0,

      -0.5, 0.5, 0.0, 1.0, 1.0, 0.0,
    ]);

    this.buffer = device.createBuffer({
      label: "Vertex buffer",
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
