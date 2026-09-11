import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (!canvas) {
  throw new Error("Canvas not found");
}

console.log("Light tracer starting...");
