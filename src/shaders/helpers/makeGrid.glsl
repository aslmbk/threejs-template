vec3 makeGrid(in vec2 uv, in vec2 resolution, in float thickness, in float divisions, out float cellLine, inout vec3 color, in bool centered) {
    vec2 center = mix(uv, uv - 0.5, float(centered));
    vec2 cell = fract(center * resolution / divisions);
    cell = abs(cell - 0.5);
    float distToCell = 1.0 - 2.0 * max(cell.x, cell.y);
    cellLine = smoothstep(0.0, thickness, distToCell);
    color = mix(vec3(0.0), color, cellLine);
    return color;
}