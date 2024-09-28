import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Timer } from "three/addons/misc/Timer.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import GUI from "lil-gui";
import "./style.css";

const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const parameters = {
  clearColor: 0x000000,
};

const gui = new GUI({ width: 340 });
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("./draco/");
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
const textureLoader = new THREE.TextureLoader();
const rgbeLoader = new RGBELoader();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  30,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(1, 2, 7);
scene.add(camera);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setClearColor(parameters.clearColor);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

gui.addColor(parameters, "clearColor").onChange(() => {
  renderer.setClearColor(parameters.clearColor);
});

const resizeSubscribers: Array<(s: typeof sizes) => void> = [];

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  resizeSubscribers.forEach((subscriber) => {
    subscriber(sizes);
  });
});

const tickSubscribers: Array<(elapsedTime: number, deltaTime: number) => void> =
  [];

const timer = new Timer();
const tick = () => {
  timer.update();
  const elapsedTime = timer.getElapsed();
  const deltaTime = timer.getDelta();

  tickSubscribers.forEach((subscriber) => {
    subscriber(elapsedTime, deltaTime);
  });

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};

tick();

export {
  canvas,
  sizes,
  gui,
  gltfLoader,
  rgbeLoader,
  textureLoader,
  scene,
  camera,
  controls,
  renderer,
  resizeSubscribers,
  tickSubscribers,
};
