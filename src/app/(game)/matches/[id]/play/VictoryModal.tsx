"use client";

import { useEffect, useState, useRef } from "react";

type Props = {
  winner: string;
  condition: string;
  onComplete: () => void;
};

// ─── Confetti Particle ───────────────────────────────────────────────────────

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
};

const CONFETTI_COLORS = [
  "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#82E0AA", "#F8C471", "#F1948A",
];

function createParticle(canvasWidth: number): Particle {
  return {
    x: Math.random() * canvasWidth,
    y: -10 - Math.random() * 40,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    opacity: 1,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VictoryModal({ winner, condition, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"entrance" | "display" | "exit">("entrance");
  const [textVisible, setTextVisible] = useState(false);
  const [subtextVisible, setSubtextVisible] = useState(false);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  // Confetti animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn initial burst
    for (let i = 0; i < 80; i++) {
      particlesRef.current.push(createParticle(canvas.width));
    }

    let spawnTimer = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn more particles over time
      spawnTimer++;
      if (spawnTimer % 3 === 0 && particlesRef.current.length < 200) {
        particlesRef.current.push(createParticle(canvas.width));
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.rotation += p.rotationSpeed;
        p.vx *= 0.99; // air resistance

        // Fade out near bottom
        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.02;
        }

        if (p.opacity <= 0 || p.y > canvas.height + 20) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Sequenced reveal
  useEffect(() => {
    const t1 = setTimeout(() => { setPhase("display"); setTextVisible(true); }, 300);
    const t2 = setTimeout(() => setSubtextVisible(true), 900);
    const t3 = setTimeout(() => setPhase("exit"), 4000);
    const t4 = setTimeout(() => onComplete(), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  const conditionLabel =
    condition === "concession" ? "Opponent Conceded"
    : condition === "elimination" ? "Elimination"
    : condition === "occupation" ? "Occupation"
    : condition === "accumulation" ? "Accumulation"
    : condition;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ${
        phase === "entrance" ? "opacity-0" : phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Victory text */}
      <div className="relative z-10 text-center px-6">
        {/* Trophy */}
        <div
          className={`text-7xl mb-6 transition-all duration-700 ${
            textVisible ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          🏆
        </div>

        {/* Winner name */}
        <h1
          className={`text-3xl font-bold text-white mb-2 transition-all duration-500 ${
            textVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <span className="text-yellow-400">{winner}</span>
        </h1>

        <p
          className={`text-xl text-white/90 mb-4 transition-all duration-500 delay-200 ${
            textVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          Victory!
        </p>

        {/* Condition */}
        <p
          className={`text-sm text-gray-400 uppercase tracking-wider transition-all duration-500 ${
            subtextVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {conditionLabel}
        </p>
      </div>
    </div>
  );
}
