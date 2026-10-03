import { mat4, vec3 } from "gl-matrix";

const FOV = Math.PI / 3;
const NEAR = 0.1;
const FAR = 100;
const PITCH_LIMIT = Math.PI / 2 - 0.01;

export class Camera {
  yaw = Math.atan2(-10, -5);
  pitch = Math.asin(5 / Math.hypot(5, 10, 5));
  distance = Math.hypot(5, 10, 5);
  aspect = 1;

  orbit(deltaYaw: number, deltaPitch: number) {
    this.yaw += deltaYaw;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch + deltaPitch));
  }

  zoom(delta: number) {
    this.distance = Math.max(4, Math.min(30, this.distance * Math.exp(delta)));
  }

  getEye(): vec3 {
    const c = Math.cos(this.pitch);
    return vec3.fromValues(
      this.distance * c * Math.cos(this.yaw),
      this.distance * c * Math.sin(this.yaw),
      this.distance * Math.sin(this.pitch)
    );
  }

  getViewMatrix(): mat4 {
    return mat4.lookAt(mat4.create(), this.getEye(), [0, 0, 0], [0, 0, 1]);
  }

  getProjectionMatrix(aspect = this.aspect): mat4 {
    return mat4.perspective(mat4.create(), FOV, aspect, NEAR, FAR);
  }

  screenRay(x: number, y: number, width: number, height: number) {
    const viewProj = mat4.multiply(mat4.create(), this.getProjectionMatrix(width / height), this.getViewMatrix());
    const inverse = mat4.invert(mat4.create(), viewProj)!;
    const far = vec3.transformMat4(vec3.create(), [(x / width) * 2 - 1, 1 - (y / height) * 2, 1], inverse);

    const origin = this.getEye();
    const direction = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), far, origin));
    return { origin, direction };
  }

  worldToScreen(point: vec3, width: number, height: number): [number, number] {
    const viewProj = mat4.multiply(mat4.create(), this.getProjectionMatrix(width / height), this.getViewMatrix());
    const ndc = vec3.transformMat4(vec3.create(), point, viewProj);
    return [(ndc[0] * 0.5 + 0.5) * width, (0.5 - ndc[1] * 0.5) * height];
  }
}
