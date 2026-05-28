import React, { useEffect, useRef } from 'react';

export function SplashCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    // Physics nodes for the spring thread trail
    const nodeCount = 38;
    const trail: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let i = 0; i < nodeCount; i++) {
      trail.push({ x: w / 2, y: h / 2, vx: 0, vy: 0 });
    }

    const mouse = { x: w / 2, y: h / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      w = (canvas.width = window.innerWidth);
      h = (canvas.height = window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let animId = 0;
    const render = () => {
      // Direct, solid black backdrop fill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
      ctx.fillRect(0, 0, w, h);

      // Node 0 tracks the mouse coordinates with organic ease
      trail[0].x += (mouse.x - trail[0].x) * 0.28;
      trail[0].y += (mouse.y - trail[0].y) * 0.28;

      // Rest of the nodes follow in a physics spring chain
      for (let i = 1; i < nodeCount; i++) {
        const prev = trail[i - 1];
        const curr = trail[i];

        curr.vx += (prev.x - curr.x) * 0.12;
        curr.vy += (prev.y - curr.y) * 0.12;
        curr.vx *= 0.68; // friction/viscosity
        curr.vy *= 0.68;

        curr.x += curr.vx;
        curr.y += curr.vy;
      }

      // 1. Draw glowing pink outer blur thread
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < nodeCount - 1; i++) {
        const xc = (trail[i].x + trail[i + 1].x) / 2;
        const yc = (trail[i].y + trail[i + 1].y) / 2;
        ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
      }
      ctx.quadraticCurveTo(
        trail[nodeCount - 1].x,
        trail[nodeCount - 1].y,
        trail[nodeCount - 1].x,
        trail[nodeCount - 1].y
      );

      ctx.strokeStyle = 'rgba(236, 72, 153, 0.72)'; // Hot Pink core
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#db2777'; // Deeper pink glow
      ctx.stroke();

      // 2. Draw white/violet bright inner core thread
      ctx.shadowBlur = 0; // reset shadow for performance
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < nodeCount - 1; i++) {
        const xc = (trail[i].x + trail[i + 1].x) / 2;
        const yc = (trail[i].y + trail[i + 1].y) / 2;
        ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)'; // Solid white bright core
      ctx.lineWidth = 1.8;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
