import { mat4, vec3 } from "gl-matrix";

export class Camera {
  yaw = Math.atan2(-10, -5);
  pitch = Math.asin(5 / Math.hypot(5, 10, 5));
  distance = Math.hypot(5, 10, 5);
  aspect = 1;

  constructor(canvas: HTMLCanvasElement) {
    const limit = Math.PI / 2 - 0.01;

    canvas.addEventListener("pointermove", (e) => {
      if (!canvas.hasPointerCapture(e.pointerId)) return;
      this.yaw -= e.movementX * 0.005;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch + e.movementY * 0.005));
    });
    canvas.addEventListener("pointerdown", (e) => canvas.setPointerCapture(e.pointerId));
    canvas.addEventListener("pointerup", (e) => canvas.releasePointerCapture(e.pointerId));
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.distance = Math.max(4, Math.min(30, this.distance * Math.exp(e.deltaY * 0.001)));
      },
      { passive: false }
    );
  }

  getViewMatrix(): mat4 {
    const c = Math.cos(this.pitch);
    const eye = vec3.fromValues(
      this.distance * c * Math.cos(this.yaw),
      this.distance * c * Math.sin(this.yaw),
      this.distance * Math.sin(this.pitch)
    );
    return mat4.lookAt(mat4.create(), eye, [0, 0, 0], [0, 0, 1]);
  }

  getProjectionMatrix(): mat4 {
    return mat4.perspective(mat4.create(), Math.PI / 3, this.aspect, 0.1, 100);
  }
}
