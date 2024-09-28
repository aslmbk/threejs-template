vec3 pointLight(
    vec3 lightColor,
    float lightIntensity,
    vec3 normal,
    vec3 lightPosition,
    vec3 modelPosition,
    vec3 viewDirection,
    float specularIntensity,
    float specularPower,
    float lightDecay
) {
    vec3 lightDelta = lightPosition - modelPosition;
    float lightDistance = length(lightDelta);
    vec3 lightDirection = normalize(lightDelta);
    vec3 lightReflection = reflect(-lightDirection, normal);

    float shading = dot(normal, lightDirection);
    shading = max(shading, 0.0);

    float specular = -dot(lightReflection, viewDirection);
    specular = max(specular, 0.0);
    specular = pow(specular, max(specularPower, 1.0));
    specular *= specularIntensity * lightIntensity;

    float decay = 1.0 - lightDistance * lightDecay;
    decay = max(decay, 0.0);

    return lightColor * lightIntensity * shading * decay + lightColor * specular;
}