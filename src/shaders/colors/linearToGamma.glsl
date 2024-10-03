vec3 linearToGamma(vec3 value) {
    return pow(value, vec3(1.0 / 2.2));
}