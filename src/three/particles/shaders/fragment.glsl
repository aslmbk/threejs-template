uniform sampler2D uMap;
uniform float uLightFactor;
uniform float uLightIntensity;

// Fake point light the particles are shaded against. Position is world space;
// uLightFalloff is (near, far) distances over which the light fades out to
// uLightFarColor.
uniform vec3 uLightPosition;
uniform vec3 uLightNearColor;
uniform vec3 uLightFarColor;
uniform vec2 uLightFalloff;

varying vec4 vColor;
varying float vSpinSpeed;
varying vec3 vWorldPosition;

void main() {
  vec2 uv = gl_PointCoord;

  float c = cos(vSpinSpeed);
  float s = sin( vSpinSpeed);
  mat2 r = mat2(c, s, -s, c);

  uv = (uv - 0.5) * r + 0.5;

  float x = gl_PointCoord.x - 0.5;
  float y = gl_PointCoord.y - 0.5;
  float z = sqrt(1.0 - x * x - y * y);
  vec3 normal = vec3(x, y, z * 0.5);
  normal = normalize(normal);

  vec3 lightPosition = (viewMatrix * vec4(uLightPosition, 1.0)).xyz;
  vec3 viewPosition = (viewMatrix * vec4(vWorldPosition, 1.0)).xyz;
  vec3 lightDirection = normalize(lightPosition - viewPosition);
  lightDirection.y = -lightDirection.y;
  float lightDP = dot(normal, lightDirection);
  lightDP = max(lightDP, 0.0);

  float falloff = smoothstep(uLightFalloff.x, uLightFalloff.y, length(lightPosition - viewPosition));
  vec3 fakeColor = mix(uLightNearColor, uLightFarColor, falloff);

  vec4 color = texture2D(uMap, uv);
  color *= vColor;
  color.rgb *= mix(vec3(1.0), fakeColor * lightDP * uLightIntensity, uLightFactor);

  // Premultiplied output: pair with THREE.CustomBlending / AdditiveBlending.
  color.rgb *= color.a;
  color.a *= mix(0.0, falloff, uLightFactor);

  gl_FragColor = color;
}
