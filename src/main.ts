import * as THREE from "three";
import { scene, tickSubscribers } from "./setup";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
scene.add(cube);

const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2, 64, 64),
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: new THREE.Uniform(0),
      uColor: new THREE.Uniform(new THREE.Color(0xffffff)),
    },
  })
);
plane.rotation.x = Math.PI * -0.5;
plane.position.y = -1;
scene.add(plane);

tickSubscribers.push((elapsedTime) => {
  plane.material.uniforms.uTime.value = elapsedTime;
});
