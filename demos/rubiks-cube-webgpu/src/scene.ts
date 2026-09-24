import { Cube } from "./model/cube";

export class Scene {
  cubes: Cube[];
  private cubeData: Float32Array;

  constructor() {
    this.cubes = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;

          this.cubes.push(new Cube([x, y, z]));
        }

    this.cubeData = new Float32Array(this.cubes.length * 16);
  }

  update(deltaTime: number) {
    this.cubes.forEach((object) => object.update());
  }

  getCubes(): Cube[] {
    return this.cubes;
  }

  getCubeData(): Float32Array {
    this.cubes.forEach((object, i) => {
      this.cubeData.set(object.getModel() as Float32Array, i * 16);
    });
    return this.cubeData;
  }
}
