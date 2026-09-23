import { Cube } from "./model/cube";
import { Square } from "./model/square";

export class Scene {
  squares: Square[];
  cubes: Cube[];
  private squareData: Float32Array;
  private cubeData: Float32Array;

  constructor() {
    this.squares = [];
    this.squares.push(new Square([0, 0, 2], 0));
    this.squares.push(new Square([0, 0, -2], 0));
    this.squares.push(new Square([0, 2, 0], 0));
    this.squares.push(new Square([0, -2, 0], 0));
    this.squareData = new Float32Array(this.squares.length * 16);

    this.cubes = [];
    this.cubes.push(new Cube([0, 0, 0], 0));
    this.cubeData = new Float32Array(this.cubes.length * 16);
  }

  update(deltaTime: number) {
    this.squares.forEach((object) => object.update(deltaTime));
    this.cubes.forEach((object) => object.update(deltaTime));
  }

  getSquares(): Square[] {
    return this.squares;
  }
  getCubes(): Cube[] {
    return this.cubes;
  }

  getSquareData(): Float32Array {
    this.squares.forEach((square, i) => {
      this.squareData.set(square.getModel() as Float32Array, i * 16);
    });
    return this.squareData;
  }

  getCubeData(): Float32Array {
    this.cubes.forEach((object, i) => {
      this.cubeData.set(object.getModel() as Float32Array, i * 16);
    });
    return this.cubeData;
  }
}
