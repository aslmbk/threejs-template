import * as THREE from "three";
import { MATH } from "../lib";

export class Particle {
  public id = MATH.random();
  public life = 0;
  public maxLife = 0;
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
}
