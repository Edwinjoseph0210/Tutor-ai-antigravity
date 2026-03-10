/**
 * AnimatedBackground — Canvas-based neural network + particle system.
 * Creates a living, breathing background with connected nodes,
 * floating particles, and slow gradient waves.
 * Inspired by lazyinterface.com motion philosophy.
 */
import React, { useRef, useEffect, useCallback } from 'react';

const AnimatedBackground = ({
  particleCount = 60,
  connectionDistance = 120,
  accentColor = '#a78bfa',
  secondaryColor = '#60a5fa',
  speed = 0.3,
  showConnections = true,
  showGradientWaves = true,
}) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const timeRef = useRef(0);

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const initParticles = useCallback((w, h) => {
    const ps = [];
    for (let i = 0; i < particleCount; i++) {
      ps.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: 1 + Math.random() * 2.5,
        opacity: 0.15 + Math.random() * 0.35,
        color: Math.random() > 0.5 ? accentColor : secondaryColor,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      });
    }
    particlesRef.current = ps;
  }, [particleCount, speed, accentColor, secondaryColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      if (particlesRef.current.length === 0) initParticles(w, h);
    };

    const onMouse = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);

    const draw = () => {
      timeRef.current += 0.005;
      ctx.clearRect(0, 0, w, h);

      // Gradient waves
      if (showGradientWaves) {
        const accent = hexToRgb(accentColor);
        const secondary = hexToRgb(secondaryColor);
        for (let i = 0; i < 3; i++) {
          const t = timeRef.current + i * 2;
          const cx = w * 0.5 + Math.sin(t * 0.3) * w * 0.3;
          const cy = h * 0.5 + Math.cos(t * 0.2) * h * 0.3;
          const r = 200 + Math.sin(t * 0.5) * 100;
          const c = i % 2 === 0 ? accent : secondary;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0.04)`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }
      }

      const ps = particlesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Update & draw particles
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];

        // Mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const md = Math.sqrt(dx * dx + dy * dy);
        if (md < 150) {
          const force = (150 - md) / 150 * 0.5;
          p.vx += (dx / md) * force;
          p.vy += (dy / md) * force;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const pulseOp = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));
        const rgb = hexToRgb(p.color);

        // Glow
        if (p.size > 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${pulseOp * 0.08})`;
          ctx.fill();
        }

        // Particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${pulseOp})`;
        ctx.fill();
      }

      // Connections (neural net lines)
      if (showConnections) {
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const dx = ps[i].x - ps[j].x;
            const dy = ps[i].y - ps[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connectionDistance) {
              const op = (1 - dist / connectionDistance) * 0.12;
              const rgb = hexToRgb(accentColor);
              ctx.beginPath();
              ctx.moveTo(ps[i].x, ps[i].y);
              ctx.lineTo(ps[j].x, ps[j].y);
              ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${op})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      // Light beams (vertical)
      for (let i = 0; i < 3; i++) {
        const bx = w * (0.2 + i * 0.3) + Math.sin(timeRef.current + i) * 50;
        const bOp = 0.015 + Math.sin(timeRef.current * 0.5 + i) * 0.01;
        const grad = ctx.createLinearGradient(bx, 0, bx, h);
        const rgb = hexToRgb(accentColor);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},${bOp})`);
        grad.addColorStop(0.7, `rgba(${rgb.r},${rgb.g},${rgb.b},${bOp})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(bx - 30, 0, 60, h);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, [accentColor, secondaryColor, showConnections, showGradientWaves, initParticles, connectionDistance]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default AnimatedBackground;
