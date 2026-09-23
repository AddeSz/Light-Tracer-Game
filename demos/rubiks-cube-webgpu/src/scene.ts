import { Square } from "./model/square";

export class Scene {
  squares: Square[];
  private objectData: Float32Array;

  constructor() {
    this.squares = [];
    this.squares.push(new Square([0.5, 0, 0], 0));
    this.squares.push(new Square([-0.5, 0, 0], 0));
    this.squares.push(new Square([0, 0.5, 0], 90));
    this.squares.push(new Square([0, -0.5, 0], -90));

    this.objectData = new Float32Array(this.squares.length * 16);
  }

  update(deltaTime: number) {
    this.squares.forEach((object) => object.update(deltaTime));
  }

  getObjects(): Square[] {
    return this.squares;
  }

  getObjectData(): Float32Array {
    this.squares.forEach((object, i) => {
      this.objectData.set(object.getModel() as Float32Array, i * 16);
    });
    return this.objectData;
  }
}
