import type { Camera } from "../camera";
import type { Scene } from "../scene";
import { setupPointer } from "./pointer";

export type InputContext = { canvas: HTMLCanvasElement; scene: Scene; camera: Camera };

export type InputSource = (ctx: InputContext) => () => void;

const turns: Record<string, { axis: number; layer: number; direction: number }> = {
  KeyR: { axis: 0, layer: 1, direction: -1 },
  KeyL: { axis: 0, layer: -1, direction: 1 },
  KeyB: { axis: 1, layer: 1, direction: -1 },
  KeyF: { axis: 1, layer: -1, direction: 1 },
  KeyU: { axis: 2, layer: 1, direction: -1 },
  KeyD: { axis: 2, layer: -1, direction: 1 },
  KeyM: { axis: 0, layer: 0, direction: 1 },
  KeyE: { axis: 2, layer: 0, direction: 1 },
  KeyS: { axis: 1, layer: 0, direction: 1 },
};

const setupKeyboard: InputSource = ({ scene }) => {
  const onKeyDown = (e: KeyboardEvent) => {
    const turn = turns[e.code];
    if (!turn) return;

    const direction = e.shiftKey ? -turn.direction : turn.direction;
    scene.queueMove(turn.axis, turn.layer, direction);
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
};

const sources: InputSource[] = [setupKeyboard, setupPointer];

export function setupInput(ctx: InputContext): () => void {
  const cleanups = sources.map((source) => source(ctx));
  return () => cleanups.forEach((cleanup) => cleanup());
}
