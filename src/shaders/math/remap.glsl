float remap(float value, float originMin, float originMax, float destinationMin, float destinationMax) {
    return destinationMin + (value - originMin) * (destinationMax - destinationMin) / (originMax - originMin);
}

// float remap2(float value, float originMin, float originMax, float destinationMin, float destinationMax) {
//     float t = inverseLerp(value, originMin, originMax);
//     return mix(destinationMin, destinationMax, t);
// }