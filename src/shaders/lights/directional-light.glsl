vec3 directionalLight(
    vec3 lightColor,
    float lightIntensity,
    vec3 normal,
    vec3 lightPosition,
    vec3 viewDirection,
    float specularIntensity,
    float specularPower
) {
    vec3 lightDirection = normalize(lightPosition);
    vec3 lightReflection = reflect(-lightDirection, normal);

    float shading = dot(normal, lightDirection);
    shading = max(shading, 0.0);

    float specular = -dot(lightReflection, viewDirection);
    specular = max(specular, 0.0);
    specular = pow(specular, max(specularPower, 1.0));
    specular *= specularIntensity * lightIntensity;

    return lightColor * lightIntensity * shading + lightColor * specular;
}