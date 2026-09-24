struct VertexInput {
  @builtin(instance_index) instance: u32,
  @builtin(vertex_index) vertex: u32,
  @location(0) position: vec3f,
  @location(1) uv: vec2f,
}
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) color: vec3f,
  @location(1) uv: vec2f,
}

struct Uniforms {
  view: mat4x4f,
  projection: mat4x4f,
}

struct Object {
  model: mat4x4f,
  faces: array<vec4f, 2>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> objects: array<Object>;

// +X, -X, +Y, -Y, +Z, -Z, plastic
var<private> palette = array<vec3f, 7>(
  vec3f(0.0, 0.0, 1.0), // +X blue
  vec3f(0.0, 1.0, 0.0), // -X green
  vec3f(1.0, 0.5, 0.0), // +Y orange
  vec3f(1.0, 0.0, 0.0), // -Y red
  vec3f(1.0, 1.0, 1.0), // +Z white
  vec3f(1.0, 1.0, 0.0), // -Z yellow
  vec3f(0.05),          // black plastic
);

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  let obj = objects[input.instance];
  let face = input.vertex / 6u;
  let colorIndex = u32(obj.faces[face / 4u][face % 4u]);

  var output: VertexOutput;
  output.position = uniforms.projection * uniforms.view * obj.model * vec4f(input.position, 1.0);
  output.color = palette[colorIndex];
  output.uv = input.uv;
  return output;
}

fn roundedBox(p: vec2f, halfSize: vec2f, radius: f32) -> f32 {
  let q = abs(p) - halfSize + radius;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - radius;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
  let d = roundedBox(in.uv - 0.5, vec2f(0.44), 0.12);
  let edge = fwidth(d);
  let mask = 1.0 - smoothstep(-edge, edge, d);

  let shade = 1.05 - 0.2 * (in.uv.x + in.uv.y) * 0.5;
  let sticker = in.color * shade;
  let plastic = vec3f(0.05);

  return vec4f(mix(plastic, sticker, mask), 1.0);
}