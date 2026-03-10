import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// Robot removed — placeholder spot for future content
import { Brain } from 'lucide-react';

const TEAL = '#14b8a6';
const TEAL_DIM = '#0d9488';
const CYAN = '#06b6d4';

/* ── Floating Particles (subtle) ── */
const FloatingParticles = ({ count = 18 }) => {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.2 + Math.random() * 2.5,
      duration: 10 + Math.random() * 18,
      delay: Math.random() * 10,
      color: [TEAL, CYAN, TEAL_DIM, '#34d399'][i % 4],
      opacity: 0.1 + Math.random() * 0.22,
    })), [count]
  );

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{ y: [0, -(25 + Math.random() * 50), 0], x: [0, (Math.random() - 0.5) * 30, 0], opacity: [0, p.opacity, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: p.color, boxShadow: `0 0 ${p.size * 3}px ${p.color}60`,
          }}
        />
      ))}
    </div>
  );
};

const Landing = () => {
  const [btnHover, setBtnHover] = useState(false);

  return (
    <div style={{
      minHeight: '100vh', overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(135deg, #020810 0%, #041220 30%, #061a2e 60%, #030d18 100%)',
      fontFamily: "'Sora', 'Inter', system-ui, sans-serif", color: '#fff',
    }}>
      {/* Background effects */}
      <FloatingParticles count={18} />

      {/* Gradient waves */}
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-3%', '3%', '-3%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '5%', right: '-15%',
          width: '60vw', height: '60vw', borderRadius: '45%',
          background: `radial-gradient(ellipse, ${TEAL}08 0%, transparent 50%)`,
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ x: ['3%', '-5%', '3%'], y: ['2%', '-4%', '2%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        style={{
          position: 'absolute', bottom: '10%', left: '10%',
          width: '40vw', height: '40vw', borderRadius: '50%',
          background: `radial-gradient(circle, ${CYAN}06 0%, transparent 50%)`,
          filter: 'blur(70px)', pointerEvents: 'none',
        }}
      />

      {/* Top nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 3.5rem',
          position: 'relative', zIndex: 50,
          background: 'linear-gradient(135deg, rgba(6,20,36,0.88) 0%, rgba(10,30,50,0.85) 40%, rgba(8,38,48,0.82) 100%)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(20,184,166,0.12)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.35), 0 1px 0 rgba(20,184,166,0.08) inset',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `linear-gradient(135deg, ${TEAL_DIM}, ${TEAL})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 24px ${TEAL}50`,
          }}>
            <Brain size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{
            fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.3px',
            fontFamily: "'Sora', 'Inter', system-ui, sans-serif",
            background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.7))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Senku AI</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" style={{
            background: 'transparent', border: `1px solid ${TEAL}35`,
            borderRadius: 10, padding: '9px 24px', color: TEAL,
            fontSize: '0.95rem', fontWeight: 600, textDecoration: 'none',
            transition: 'all 0.3s',
          }}>Sign In</Link>
          <Link to="/register" style={{
            background: `linear-gradient(135deg, ${TEAL_DIM}, ${TEAL})`,
            border: 'none', borderRadius: 10, padding: '9px 24px',
            color: '#fff', fontSize: '0.95rem', fontWeight: 700,
            textDecoration: 'none', boxShadow: `0 4px 20px ${TEAL}40`,
          }}>Get Started</Link>
        </div>
      </motion.nav>

      {/* Hero section */}
      <div style={{
        minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center',
        padding: '0 4rem', maxWidth: 1440, margin: '0 auto',
        position: 'relative', zIndex: 10,
      }}>
        {/* Left — Text */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          style={{ flex: '0 0 50%', maxWidth: '50%', paddingRight: '2rem' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `${TEAL}12`, border: `1px solid ${TEAL}25`,
              borderRadius: 100, padding: '6px 16px 6px 10px', marginBottom: 28,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#34d399',
              boxShadow: '0 0 8px #34d39960',
              animation: 'landing-pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '0.88rem', color: TEAL, fontWeight: 600 }}>
              AI Teaching Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{
              fontSize: 'clamp(3rem, 5vw, 4rem)',
              fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2.5px',
              margin: '0 0 8px',
              fontFamily: "'Sora', 'Inter', system-ui, sans-serif",
            }}
          >
            Meet{' '}
            <span style={{
              background: `linear-gradient(135deg, ${TEAL}, ${CYAN}, #34d399)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: `drop-shadow(0 0 30px ${TEAL}40)`,
            }}>Senku</span>
            {' '}&mdash;
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{
              fontSize: 'clamp(2.6rem, 4.2vw, 3.5rem)',
              fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2px',
              margin: '0 0 32px', color: 'rgba(255,255,255,0.85)',
              fontFamily: "'Sora', 'Inter', system-ui, sans-serif",
            }}
          >
            Your AI Teacher
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            style={{
              fontSize: 'clamp(1.1rem, 1.3vw, 1.25rem)',
              color: 'rgba(255,255,255,0.5)', lineHeight: 1.8,
              margin: '0 0 44px', maxWidth: 530,
            }}
          >
            An intelligent AI instructor designed to teach, guide, and inspire
            the next generation of learners. Powered by voice, vision, and
            autonomous curriculum delivery.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.85 }}
            style={{ display: 'flex', gap: 16, alignItems: 'center' }}
          >
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <motion.div
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                animate={{
                  boxShadow: btnHover
                    ? `0 0 40px ${TEAL}50, 0 8px 32px ${TEAL}30, 0 0 80px ${TEAL}15`
                    : `0 4px 24px ${TEAL}30, 0 0 60px ${TEAL}10`,
                }}
                style={{
                  background: `linear-gradient(135deg, ${TEAL_DIM}, ${TEAL}, ${CYAN})`,
                  borderRadius: 16, padding: '16px 42px',
                  color: '#fff', fontSize: '1.1rem', fontWeight: 800,
                  cursor: 'pointer', letterSpacing: '-0.3px',
                  position: 'relative', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    pointerEvents: 'none',
                  }}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>Start Learning</span>
                <svg style={{ position: 'relative', zIndex: 1 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </motion.div>
            </Link>
            <Link to="/register" style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${TEAL}30`, borderRadius: 16,
              padding: '15px 34px', color: 'rgba(255,255,255,0.7)',
              fontSize: '1.05rem', fontWeight: 600, textDecoration: 'none',
              backdropFilter: 'blur(8px)', transition: 'all 0.3s',
            }}>Create Account</Link>
          </motion.div>
        </motion.div>

        {/* Right — Robot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, x: 40 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 1.3, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
          style={{
            flex: '0 0 48%', maxWidth: '48%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Glow behind robot */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '110%', height: '110%', borderRadius: '50%',
              background: `radial-gradient(circle, ${TEAL}18 0%, ${TEAL}08 35%, transparent 65%)`,
              filter: 'blur(30px)', pointerEvents: 'none',
            }}
          />
          {/* Rotating ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', width: '120%', height: '120%', borderRadius: '50%',
              border: `1px solid ${TEAL}15`,
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />

          {/* Robot image — transparent background */}
          <img
            src="/images/hero-robot.png"
            alt="AI Teacher Robot"
            style={{
              width: '180%',
              maxWidth: 'none',
              height: 'auto',
              objectFit: 'contain',
              marginRight: '10rem',
              filter: 'drop-shadow(0 8px 32px rgba(52, 211, 153, 0.18))',
              pointerEvents: 'none',
              userSelect: 'none',
              position: 'relative',
              zIndex: 5,
            }}
          />
        </motion.div>
      </div>

      <style>{`
        @keyframes landing-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #34d39960; }
          50% { opacity: 0.4; box-shadow: 0 0 4px #34d39930; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
