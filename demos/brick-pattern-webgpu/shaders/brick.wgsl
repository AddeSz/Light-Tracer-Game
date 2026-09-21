struct Params {
    brickColor: vec4f,   // offset 0
    mortarColor: vec4f,  // offset 16
    brickSize: vec2f,    // offset 32, CSS pixels
    mortar: f32,         // offset 40, CSS pixels
    scale: f32,          // offset 44, devicePixelRatio
    offset: vec2f,       // offset 48, CSS pixels
    _pad: vec2f,         // offset 56, pads the struct to 64 bytes
}

@group(0) @binding(0) var<uniform> params: Params;

@vertex
fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
    return vec4f(pos, 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {
    let size = params.brickSize * params.scale;
    let halfMortar = params.mortar * params.scale * 0.5;

    var p = (fragPos.xy - params.offset * params.scale) / size;
    p.x += (abs(floor(p.y)) % 2.0) * 0.5;

    let local = fract(p) * size;
    let d = min(local, size - local);
    let edge = min(d.x, d.y);

    let brick = smoothstep(halfMortar - 0.5, halfMortar + 0.5, edge);
    return mix(params.mortarColor, params.brickColor, brick);
}