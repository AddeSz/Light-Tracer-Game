import { vec3 } from "gl-matrix";
import type { InputSource } from ".";
import type { Camera } from "../camera";
import type { Cube } from "../model/cube";

const ORBIT_SPEED = 0.005;
const ZOOM_SPEED = 0.001;
const DRAG_THRESHOLD = 12;
const PRIMARY_BUTTON = 0;

const HALF_SIZE = 0.5;
const PARALLEL_EPSILON = 1e-8;
const TANGENT_PROBE_DISTANCE = 0.25;

export type Pick = {
  cube: Cube;
  normal: vec3;
  point: vec3;
};

type Hit = { t: number; axis: number; sign: number };

type Turn = { axis: number; layer: number; direction: number };

type Gesture = {
  pointerId: number;
  lastX: number;
  lastY: number;
  turn?: { pick: Pick; startX: number; startY: number; fired: boolean };
};

function intersectCube(origin: vec3, direction: vec3, cube: Cube): Hit | null {
  let tMin = -Infinity;
  let tMax = Infinity;
  let axis = -1;
  let sign = 0;

  for (let i = 0; i < 3; i++) {
    const lo = cube.position[i] - HALF_SIZE;
    const hi = cube.position[i] + HALF_SIZE;

    if (Math.abs(direction[i]) < PARALLEL_EPSILON) {
      if (origin[i] < lo || origin[i] > hi) return null;
      continue;
    }

    let t1 = (lo - origin[i]) / direction[i];
    let t2 = (hi - origin[i]) / direction[i];
    let faceSign = -1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      faceSign = 1;
    }

    if (t1 > tMin) {
      tMin = t1;
      axis = i;
      sign = faceSign;
    }
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  if (axis < 0 || tMin < 0) return null;
  return { t: tMin, axis, sign };
}

export function pickCube(origin: vec3, direction: vec3, cubes: Cube[]): Pick | null {
  let best: Pick | null = null;
  let bestT = Infinity;

  for (const cube of cubes) {
    const hit = intersectCube(origin, direction, cube);
    if (!hit || hit.t >= bestT) continue;

    bestT = hit.t;
    const normal: vec3 = [0, 0, 0];
    normal[hit.axis] = hit.sign;
    const point: vec3 = [
      origin[0] + direction[0] * hit.t,
      origin[1] + direction[1] * hit.t,
      origin[2] + direction[2] * hit.t,
    ];
    best = { cube, normal, point };
  }

  return best;
}

export function turnFromDrag(
  pick: Pick,
  dragX: number,
  dragY: number,
  camera: Camera,
  width: number,
  height: number
): Turn | null {
  const dragLength = Math.hypot(dragX, dragY);
  const start = camera.worldToScreen(pick.point, width, height);
  let best: { axis: number; score: number } | null = null;

  for (let axis = 0; axis < 3; axis++) {
    if (pick.normal[axis] !== 0) continue;

    const unit: vec3 = [0, 0, 0];
    unit[axis] = 1;
    const velocity = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), unit, pick.point));
    const moved = vec3.scaleAndAdd(vec3.create(), pick.point, velocity, TANGENT_PROBE_DISTANCE);

    const end = camera.worldToScreen(moved, width, height);
    const sx = end[0] - start[0];
    const sy = end[1] - start[1];
    const score = (sx * dragX + sy * dragY) / (Math.max(Math.hypot(sx, sy), 1e-9) * dragLength);

    if (!best || Math.abs(score) > Math.abs(best.score)) best = { axis, score };
  }

  if (!best) return null;
  return { axis: best.axis, layer: pick.cube.position[best.axis], direction: best.score >= 0 ? 1 : -1 };
}

export const setupPointer: InputSource = ({ canvas, scene, camera }) => {
  let gesture: Gesture | null = null;

  const toCanvas = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, width: rect.width, height: rect.height };
  };

  const onPointerDown = (e: PointerEvent) => {
    if (gesture) return;
    canvas.setPointerCapture(e.pointerId);

    const { x, y, width, height } = toCanvas(e);
    let turn: Gesture["turn"];

    if (e.button === PRIMARY_BUTTON && !scene.isBusy()) {
      const { origin, direction } = camera.screenRay(x, y, width, height);
      const pick = pickCube(origin, direction, scene.getCubes());
      if (pick) turn = { pick, startX: x, startY: y, fired: false };
    }

    gesture = { pointerId: e.pointerId, lastX: x, lastY: y, turn };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    const { x, y, width, height } = toCanvas(e);

    if (gesture.turn) {
      const t = gesture.turn;
      const dx = x - t.startX;
      const dy = y - t.startY;
      if (!t.fired && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        t.fired = true;
        const move = turnFromDrag(t.pick, dx, dy, camera, width, height);
        if (move) scene.queueMove(move.axis, move.layer, move.direction);
      }
    } else {
      camera.orbit(-(x - gesture.lastX) * ORBIT_SPEED, (y - gesture.lastY) * ORBIT_SPEED);
    }

    gesture.lastX = x;
    gesture.lastY = y;
  };

  const onPointerEnd = (e: PointerEvent) => {
    if (gesture && e.pointerId === gesture.pointerId) gesture = null;
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    camera.zoom(e.deltaY * ZOOM_SPEED);
  };

  const onContextMenu = (e: Event) => e.preventDefault();

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerEnd);
  canvas.addEventListener("pointercancel", onPointerEnd);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContextMenu);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerEnd);
    canvas.removeEventListener("pointercancel", onPointerEnd);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("contextmenu", onContextMenu);
  };
};
