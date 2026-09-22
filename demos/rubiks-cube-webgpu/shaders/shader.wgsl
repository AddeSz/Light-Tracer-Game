struct VertexInput {
  @location(0) position: vec3f,
  @location(1) color: vec3f,
}
struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) color: vec4f
}

struct Uniforms {
  time: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {

  let angle = uniforms.time;
  let c = cos(angle);
  let s = sin(angle);
  let pos = input.position;
  let rotated = vec3f(
    pos.x * c - pos.y * s,
    pos.x * s + pos.y * c,
    0.0
  );

  var output: VertexOutput;
  output.position = vec4f(rotated, 1.0);
  output.color = vec4f(input.color, 1.0);
  return output;
}

@fragment
fn fragmentMain(@location(0) color: vec4f) -> @location(0) vec4f {
  return color;
}