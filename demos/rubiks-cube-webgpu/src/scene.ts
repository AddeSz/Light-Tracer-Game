import { type vec3 } from "gl-matrix";
import { Cube } from "./model/cube";

type QueuedTurn = { axis: number; layer: number; direction: number };

export class Scene {
  cubes: Cube[];
  private cubeData: Float32Array;

  private turnActive = false;
  private turnProgress = 0;
  private readonly turnTarget = Math.PI / 2;
  private turnSpeed = Math.PI / 2;

  private turnAxis: vec3 = [0, 1, 0];
  private turnDirection = 1;
  private turnCubes: Cube[] = [];
  private moveQueue: QueuedTurn[] = [];

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

  private beginTurn(axisIndex: number, layer: number, direction: number) {
    const axis: vec3 = [0, 0, 0];
    axis[axisIndex] = 1;
    this.turnAxis = axis;
    this.turnCubes = this.cubes.filter((cube) => cube.position[axisIndex] === layer);
    this.turnDirection = direction;

    this.turnProgress = 0;
    this.turnActive = true;
  }

  queueMove(axisIndex: number, layer: number, direction: number) {
    this.moveQueue.push({ axis: axisIndex, layer, direction });
  }

  setTurnSpeed(radiansPerSecond: number) {
    this.turnSpeed = radiansPerSecond;
  }

  scramble(count = 20) {
    for (let i = 0; i < count; i++) {
      const axis = Math.floor(Math.random() * 3);
      const layer = Math.random() < 0.5 ? -1 : 1;
      const direction = Math.random() < 0.5 ? 1 : -1;
      this.queueMove(axis, layer, direction);
    }
  }

  reset() {
    this.moveQueue = [];
    this.turnActive = false;
    this.turnProgress = 0;

    this.cubes = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          this.cubes.push(new Cube([x, y, z]));
        }
  }

  update(deltaTime: number) {
    if (!this.turnActive) {
      const next = this.moveQueue.shift();
      if (!next) return;
      this.beginTurn(next.axis, next.layer, next.direction);
    }

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
