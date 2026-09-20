@group(0) @binding(0) var<storage, read> cellState: array<u32>;
@group(0) @binding(1) var<storage, read_write> aliveCount: atomic<u32>;

@compute
@workgroup_size(8, 8)
fn countMain(
  @builtin(global_invocation_id) id: vec3u,
  @builtin(num_workgroups) groups: vec3u,
) {
  let width = groups.x * 8u;
  let i = id.y * width + id.x;
  if (i >= arrayLength(&cellState)) {
    return;
  }
  if (cellState[i] != 0u) {
    atomicAdd(&aliveCount, 1u);
  }
}