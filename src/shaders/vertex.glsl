uniform float uTime;

void main() {
    vec3 pos = position;
    pos.z += sin(pos.x * 10.0 + uTime) * 0.1;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}