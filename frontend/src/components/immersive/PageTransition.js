/**
 * PageTransition — Wrapper that animates page entrance on mount using Framer Motion.
 * Provides smooth enter/exit transitions with spring physics.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const variants = {
  'fade-up': {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  },
  'slide-left': {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  },
  'scale': {
    initial: { opacity: 0, scale: 0.93 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
  },
  'fade': {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
  },
};

const PageTransition = ({
  children,
  type = 'fade-up',
  duration = 0.5,
  delay = 0,
}) => {
  const v = variants[type] || variants['fade-up'];

  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={{
        duration,
        delay,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * StaggerChildren — Staggers child elements' entrance with Framer Motion.
 */
export const StaggerChildren = ({ children, stagger = 0.08, type = 'fade-up' }) => {
  const v = variants[type] || variants['fade-up'];

  const containerVariants = {
    animate: {
      transition: { staggerChildren: stagger },
    },
  };

  const childVariants = {
    initial: v.initial,
    animate: {
      ...v.animate,
      transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {React.Children.map(children, (child, i) => (
        <motion.div key={i} variants={childVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

/**
 * AnimatedPage — Full page-level transition wrapper for use with React Router.
 * Wrap <Routes> with <AnimatePresence> and each page with <AnimatedPage>.
 */
export const AnimatedPage = ({ children, className = '' }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
  >
    {children}
  </motion.div>
);

export { AnimatePresence };

export default PageTransition;
