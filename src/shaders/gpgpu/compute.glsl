void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 point = texture(uPositionsTexture, uv);
    point.y += 0.01;
    gl_FragColor = point;
}
