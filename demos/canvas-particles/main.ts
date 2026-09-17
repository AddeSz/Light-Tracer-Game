const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!canvas) {
  throw new Error("Canvas not found");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Context not found");
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let particlesArray: Particle[] = [];
let hue = 0;

window.addEventListener("resize", function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const mouse: { x: number | undefined; y: number | undefined } = {
  x: undefined,
  y: undefined,
};

canvas.addEventListener("mousemove", function (event) {
  mouse.x = event.x;
  mouse.y = event.y;
  for (let i = 0; i < 2; i++) {
    particlesArray.push(new Particle(mouse.x, mouse.y));
  }
});

canvas.addEventListener("click", function (event) {
  mouse.x = event.x;
  mouse.y = event.y;
  for (let i = 0; i < 10; i++) {
    particlesArray.push(new Particle(mouse.x, mouse.y));
  }
});

class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 15 + 5;
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 3 - 1.5;
    this.color = "hsl(" + hue + ", 100%, 50%)";
  }

  get isDead() {
    return this.size <= 0;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.size = Math.max(0, this.size - 0.1);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function handleParticles(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < particlesArray.length; i++) {
    particlesArray[i].update();
    particlesArray[i].draw(ctx);

    for (let j = i + 1; j < particlesArray.length; j++) {
      const a = particlesArray[i];
      const b = particlesArray[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 100) {
        const sizeFactor = Math.min(a.size, b.size);
        const opacity = (1 - distance / 100) * Math.min(1, sizeFactor);

        ctx.beginPath();
        ctx.strokeStyle = a.color.replace("hsl(", "hsla(").replace(")", `, ${opacity})`);
        ctx.lineWidth = 1;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.closePath();
      }
    }
  }
  particlesArray = particlesArray.filter((p) => !p.isDead);
}

function animate(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  handleParticles(ctx);
  hue += 2;
  requestAnimationFrame(() => animate(canvas, ctx));
}

animate(canvas, ctx);
