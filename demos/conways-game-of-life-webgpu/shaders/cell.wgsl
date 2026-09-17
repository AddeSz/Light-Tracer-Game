struct VertexInput {
  @location(0) pos: vec2f,
  @builtin(instance_index) instance: u32,
};

struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) cell: vec2f,
  @location(1) state: f32,
  @location(2) localPos: vec2f,
};

@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellState: array<u32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput  {
  var output: VertexOutput;

  let i = f32(input.instance);
  let cell = vec2f(i % grid.x, floor(i / grid.x));
  let state = f32(cellState[input.instance]);

  let cellOffset = cell / grid * 2;
  let gridPos = (input.pos + 1) / grid - 1 + cellOffset;

  output.pos = vec4f(gridPos, 0, 1);
  output.cell = cell;
  output.state = state;
  output.localPos = input.pos;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let edgeDist = 1.0 - max(abs(input.localPos.x), abs(input.localPos.y));
  let px = max(
    fwidth(input.localPos.x),
    fwidth(input.localPos.y)
  );

  let lineWidthPx = 1.0;
  if (edgeDist < lineWidthPx * px) {
    return vec4f(0.1, 0.1, 0.1, 1);
  }
  if (input.state < 0.5) {
    discard;
  }
  return vec4f(1, 1, 1, 1);
}