import { useEffect, useRef } from 'react';

export default function GridBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function draw() {
      time += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gridSize = 50;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const perspective = 800;
      const tilt = 0.6;
      const yOffset = Math.sin(time * 0.5) * 30;

      // Draw horizontal lines
      for (let i = -20; i <= 20; i++) {
        const z1 = -20 * gridSize;
        const z2 = 20 * gridSize;
        const x = i * gridSize;

        drawLine3D(ctx, x, 0, z1, x, 0, z2, centerX, centerY, perspective, tilt, yOffset, time);
      }

      // Draw vertical (depth) lines
      for (let i = -20; i <= 20; i++) {
        const z = i * gridSize;
        const x1 = -20 * gridSize;
        const x2 = 20 * gridSize;

        drawLine3D(ctx, x1, 0, z, x2, 0, z, centerX, centerY, perspective, tilt, yOffset, time);
      }

      animationId = requestAnimationFrame(draw);
    }

    function drawLine3D(ctx, x1, y1, z1, x2, y2, z2, cx, cy, persp, tilt, yOff, t) {
      const offsetZ = (t * 100) % 50;

      z1 += offsetZ;
      z2 += offsetZ;

      const p1 = project(x1, y1, z1, cx, cy, persp, tilt, yOff);
      const p2 = project(x2, y2, z2, cx, cy, persp, tilt, yOff);

      if (!p1 || !p2) return;

      const avgZ = (z1 + z2) / 2;
      const maxDist = 1200;
      const dist = Math.abs(avgZ);
      const alpha = Math.max(0, 0.08 * (1 - dist / maxDist));

      if (alpha <= 0) return;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(88, 166, 255, ${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    function project(x, y, z, cx, cy, persp, tilt, yOff) {
      const rotY = y * Math.cos(tilt) - z * Math.sin(tilt);
      const rotZ = y * Math.sin(tilt) + z * Math.cos(tilt);

      const finalZ = rotZ + persp;
      if (finalZ <= 0) return null;

      const scale = persp / finalZ;

      return {
        x: cx + x * scale,
        y: cy + (rotY + yOff) * scale,
      };
    }

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
}
