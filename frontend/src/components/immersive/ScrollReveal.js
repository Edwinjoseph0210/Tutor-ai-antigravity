/**
 * ScrollReveal — Reveals children with animation when they enter the viewport.
 * Uses Framer Motion's useInView for intersection-based trigger.
 */
import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const presets = {
  'fade-up': { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } },
  'fade-down': { hidden: { opacity: 0, y: -40 }, visible: { opacity: 1, y: 0 } },
  'fade-left': { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0 } },
  'fade-right': { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } },
  'scale-up': { hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1 } },
  'zoom': { hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1 } },
  'flip': { hidden: { opacity: 0, rotateX: 90 }, visible: { opacity: 1, rotateX: 0 } },
};

const ScrollReveal = ({
  children,
  type = 'fade-up',
  delay = 0,
  duration = 0.6,
  threshold = 0.15,
  once = true,
  className = '',
  style = {},
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once, amount: threshold });
  const preset = presets[type] || presets['fade-up'];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden: preset.hidden,
        visible: {
          ...preset.visible,
          transition: {
            duration,
            delay,
            ease: [0.23, 1, 0.32, 1],
          },
        },
      }}
      style={{ ...style, willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
};

/**
 * ScrollRevealGroup — Staggers multiple children as they scroll into view.
 */
export const ScrollRevealGroup = ({
  children,
  type = 'fade-up',
  stagger = 0.1,
  threshold = 0.1,
  once = true,
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once, amount: threshold });
  const preset = presets[type] || presets['fade-up'];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger },
        },
      }}
    >
      {React.Children.map(children, (child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: preset.hidden,
            visible: {
              ...preset.visible,
              transition: {
                duration: 0.55,
                ease: [0.23, 1, 0.32, 1],
              },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ScrollReveal;
