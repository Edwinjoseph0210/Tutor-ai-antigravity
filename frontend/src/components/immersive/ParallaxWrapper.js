/**
 * ParallaxWrapper — Mouse-based parallax motion layer.
 * Child elements shift subtly as the cursor moves, creating depth.
 * Configurable intensity and axis constraints.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';

const ParallaxWrapper = ({
  children,
  intensity = 0.02,
  rotateIntensity = 0.01,
  scale = false,
  scaleRange = [1, 1.02],
  className = '',
  style = {},
}) => {
  const ref = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, rotX: 0, rotY: 0, scale: 1 });

  const handleMouse = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    
    setTransform({
      x: dx * intensity * 40,
      y: dy * intensity * 40,
      rotX: -dy * rotateIntensity * 15,
      rotY: dx * rotateIntensity * 15,
      scale: scale ? scaleRange[0] + (1 - Math.abs(dx) * 0.5) * (scaleRange[1] - scaleRange[0]) : 1,
    });
  }, [intensity, rotateIntensity, scale, scaleRange]);

  const handleLeave = useCallback(() => {
    setTransform({ x: 0, y: 0, rotX: 0, rotY: 0, scale: 1 });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('mouseleave', handleLeave);
    };
  }, [handleMouse, handleLeave]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: `translate(${transform.x}px, ${transform.y}px) perspective(1000px) rotateX(${transform.rotX}deg) rotateY(${transform.rotY}deg) scale(${transform.scale})`,
        transition: 'transform 0.15s ease-out',
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * ParallaxLayer — Individual depth layer for multi-speed parallax.
 */
export const ParallaxLayer = ({
  children,
  depth = 1,       // 0 = no movement, 1 = normal, 2 = fast
  style = {},
}) => (
  <ParallaxWrapper intensity={0.015 * depth} rotateIntensity={0} style={style}>
    {children}
  </ParallaxWrapper>
);

export default ParallaxWrapper;
