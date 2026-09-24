import { type vec3 } from "gl-matrix";
import { Cube } from "./model/cube";

export class Scene {
  cubes: Cube[];
  private cubeData: Float32Array;

  private turnActive = false;
  private turnProgress = 0;
  private readonly turnTarget = Math.PI / 2;
  private readonly turnSpeed = Math.PI;

  private turnAxis: vec3 = [0, 1, 0];
  private turnDirection = 1;
  private turnCubes: Cube[] = [];

  constructor() {
    this.cubes = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;

          this.cubes.push(new Cube([x, y, z]));
        }

    this.cubeData = new Float32Array(this.cubes.length * Cube.FLOATS);
  }

  startTurn(axisIndex: number, layer: number, direction: number) {
    if (this.turnActive) return;
    const axis: vec3 = [0, 0, 0];
    axis[axisIndex] = 1;
    this.turnAxis = axis;
    this.turnCubes = this.cubes.filter((cube) => cube.position[axisIndex] === layer);
    this.turnDirection = direction;

    this.turnProgress = 0;
    this.turnActive = true;
  }

  update(deltaTime: number) {
    if (!this.turnActive) return;

    const step = Math.min(this.turnSpeed * deltaTime, this.turnTarget - this.turnProgress);

    this.turnCubes.forEach((cube) => cube.rotateAround(this.turnAxis, step * this.turnDirection));

    this.turnProgress += step;

    if (this.turnTarget - this.turnProgress < 1e-6) {
      this.turnCubes.forEach((cube) => cube.snap());
      this.turnActive = false;
    }
  }

  getCubes(): Cube[] {
    return this.cubes;
  }

  getCubeData(): Float32Array {
    this.cubes.forEach((cube, i) => cube.writeTo(this.cubeData, i));
    return this.cubeData;
  }
}
