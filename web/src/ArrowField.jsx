import React, { useEffect, useRef } from 'react';

/** A lightweight, cursor-reactive field of arrows, shared across the whole identity. */
export default function ArrowField({ className = '', variant = 'hero', persona = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const parent = canvas.parentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, frame = 0, active = false;
    let pointer = { x: -1000, y: -1000 };
    let smoothed = { ...pointer };
    const portrait = variant === 'portrait';
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const spacing = portrait ? Math.max(9, width / 29) : width < 600 ? 18 : 17;
      smoothed.x += (pointer.x - smoothed.x) * 0.16;
      smoothed.y += (pointer.y - smoothed.y) * 0.16;
      for (let y = 9; y < height; y += spacing) {
        for (let x = 9; x < width; x += spacing) {
          const nx = x / width, ny = y / height;
          const dist = Math.hypot(x - smoothed.x, y - smoothed.y);
          const influence = reduced.matches ? 0 : Math.max(0, 1 - dist / (portrait ? 110 : 180));
          let alpha, color, size = spacing * 0.62;
          if (portrait) {
            const p = Number(persona) || 0;
            const center = 0.5 + (p % 2 ? 0.035 : -0.035);
            const head = ((nx - center) / (0.13 + p * .004)) ** 2 + ((ny - .32) / .17) ** 2 < 1;
            const neck = Math.abs(nx - center) < .057 && ny > .43 && ny < .66;
            const torso = ny > .65 && ((nx - center) / (.22 + (ny - .65) * .7)) ** 2 + ((ny - 1.03) / .39) ** 2 < 1;
            const silhouette = head || neck || torso;
            alpha = silhouette ? .72 + .18 * Math.sin(nx * 7) : .17;
            color = silhouette && influence > .28 ? `rgba(231,249,29,${.7 + influence * .3})` : `rgba(213,227,255,${alpha})`;
            size *= silhouette ? 1.14 : .75;
          } else {
            const fade = variant === 'hero' ? ny < .58 ? .22 + ny * .48 : Math.max(.025, (1 - ny) * .95) : .23;
            const light = ny < .57 || variant === 'panel';
            alpha = fade;
            color = light ? `rgba(214,230,255,${alpha + influence * .45})` : `rgba(57,107,230,${alpha + influence * .5})`;
            // Preserve the quiet patch behind the main title, like the reference.
            if (variant === 'hero' && nx > .26 && nx < .74 && ny > .33 && ny < .68) {
              const soften = Math.max(0, 1 - Math.hypot((nx - .5) * 3, (ny - .5) * 4));
              color = `rgba(192,218,255,${Math.max(.05, alpha * (1 - soften * .83)) + influence * .45})`;
            }
          }
          const rotation = -Math.PI / 4 + influence * (Math.atan2(y - smoothed.y, x - smoothed.x) + Math.PI / 4);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation);
          ctx.strokeStyle = color;
          ctx.lineWidth = portrait ? 1.35 : 1.2;
          ctx.lineCap = 'square';
          const length = size * (1 + influence * .3);
          ctx.beginPath();
          ctx.moveTo(-length / 2, 0);
          ctx.lineTo(length / 2, 0);
          ctx.moveTo(0, -length / 2);
          ctx.lineTo(length / 2, 0);
          ctx.lineTo(0, length / 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      // Render only while the pointer settles, never an idle 60fps loop.
      if (active && !reduced.matches && Math.hypot(pointer.x - smoothed.x, pointer.y - smoothed.y) > .4) frame = requestAnimationFrame(draw);
      else frame = 0;
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (!active || reduced.matches) draw();
    };
    const move = e => {
      if (reduced.matches) return;
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (!active) { active = true; smoothed = { ...pointer }; }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const leave = () => {
      active = false;
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = smoothed = { x: -1000, y: -1000 };
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    parent.addEventListener('pointermove', move, { passive: true });
    parent.addEventListener('pointerleave', leave);
    resize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      parent.removeEventListener('pointermove', move);
      parent.removeEventListener('pointerleave', leave);
    };
  }, [variant, persona]);
  return <canvas ref={ref} className={`arrow-field ${className}`} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}/>;
}
