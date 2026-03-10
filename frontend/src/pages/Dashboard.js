import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  ImmersiveLayout, FloatingCard, GlowButton,
  PageTransition, StatusBadge, SectionHeader,
} from '../components/immersive';
// Robot removed — placeholder spot for future content
import {
  Brain, Eye, BarChart3, Target, BookOpen,
  GraduationCap, ClipboardList, CalendarDays,
  Settings2, ArrowRight, ChevronDown, Zap,
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '';

/* ── accent palette ─────────────────────────── */
const TEAL = '#14b8a6';
const TEAL_DIM = '#0d9488';
const CYAN = '#06b6d4';

/* ── Floating Particles Component (subtle) ── */
const FloatingParticles = ({ count = 22 }) => {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.2 + Math.random() * 2.5,
      duration: 10 + Math.random() * 18,
      delay: Math.random() * 10,
      color: [TEAL, CYAN, TEAL_DIM, '#34d399'][i % 4],
      opacity: 0.1 + Math.random() * 0.25,
    })), [count]
  );

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{
            y: [0, -(30 + Math.random() * 60), 0],
            x: [0, (Math.random() - 0.5) * 40, 0],
            opacity: [0, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}60`,
          }}
        />
      ))}
    </div>
  );
};

/* ── Gradient Wave Component (subtle) ── */
const GradientWaves = () => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
    {/* Wave 1 */}
    <motion.div
      animate={{ x: ['-10%', '10%', '-10%'], y: ['-5%', '5%', '-5%'] }}
      transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute', top: '10%', right: '-10%',
        width: '70vw', height: '70vw', borderRadius: '45%',
        background: `radial-gradient(ellipse, ${TEAL}08 0%, transparent 55%)`,
        filter: 'blur(60px)',
      }}
    />
    {/* Wave 2 */}
    <motion.div
      animate={{ x: ['5%', '-8%', '5%'], y: ['3%', '-6%', '3%'] }}
      transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      style={{
        position: 'absolute', bottom: '5%', left: '20%',
        width: '50vw', height: '50vw', borderRadius: '40%',
        background: `radial-gradient(ellipse, ${CYAN}06 0%, transparent 50%)`,
        filter: 'blur(70px)',
      }}
    />
    {/* Wave 3 */}
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.65, 0.4] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      style={{
        position: 'absolute', top: '40%', right: '15%',
        width: '35vw', height: '35vw', borderRadius: '50%',
        background: `radial-gradient(circle, rgba(6,95,70,0.06) 0%, transparent 55%)`,
        filter: 'blur(50px)',
      }}
    />
  </div>
);

/* ── Glow Ring behind Robot ── */
const RobotGlowEffects = () => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    {/* Large teal glow */}
    <motion.div
      animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '110%', height: '110%', borderRadius: '50%',
        background: `radial-gradient(circle, ${TEAL}18 0%, ${TEAL}08 35%, transparent 65%)`,
        filter: 'blur(40px)',
      }}
    />
    {/* Cyan accent glow */}
    <motion.div
      animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.4, 0.2] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      style={{
        position: 'absolute',
        top: '45%', left: '55%', transform: 'translate(-50%, -50%)',
        width: '80%', height: '80%', borderRadius: '50%',
        background: `radial-gradient(circle, ${CYAN}12 0%, transparent 60%)`,
        filter: 'blur(50px)',
      }}
    />
    {/* Rotating halo ring 1 */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      style={{
        position: 'absolute',
        width: '120%', height: '120%',
        borderRadius: '50%',
        border: `1px solid ${TEAL}15`,
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      }}
    />
    {/* Rotating halo ring 2 */}
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      style={{
        position: 'absolute',
        width: '105%', height: '105%',
        borderRadius: '50%',
        border: `1px dashed ${CYAN}10`,
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      }}
    />
    {/* Orbiting dots */}
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        animate={{ rotate: 360 }}
        transition={{ duration: 18 + i * 10, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: `${95 + i * 10}%`, height: `${95 + i * 10}%`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          width: 5 - i, height: 5 - i, borderRadius: '50%',
          background: i === 0 ? TEAL : i === 1 ? CYAN : '#34d399',
          boxShadow: `0 0 12px ${i === 0 ? TEAL : CYAN}60`,
        }} />
      </motion.div>
    ))}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ active: 0, total: 0, students: 0 });
  const [btnHover, setBtnHover] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const sessions = data.data || [];
        setStats({
          active: sessions.filter(s => s.status === 'active').length,
          total: sessions.length,
          students: sessions.reduce((acc, s) => acc + (s.student_count || 0), 0),
        });
      }
    } catch (e) {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); } catch (e) {}
  };

  const quickLinks = [
    { title: 'Session Library', desc: 'Create & manage teaching sessions', icon: <BookOpen size={26} />, accent: TEAL, path: '/session-library', badge: stats.active > 0 ? `${stats.active} live` : null },
    { title: 'Manage Students', desc: 'Register students with face data', icon: <GraduationCap size={26} />, accent: '#ec4899', path: '/add-students' },
    { title: 'Attendance', desc: 'Face-verified attendance logs', icon: <ClipboardList size={26} />, accent: CYAN, path: '/attendance-marking' },
    { title: 'Timetable', desc: 'Teaching schedule', icon: <CalendarDays size={26} />, accent: '#10b981', path: '/teacher-timetable' },
  ];

  const features = [
    { icon: <Brain size={30} />, title: 'AI-Powered Teaching', desc: 'Autonomous voice-based lectures powered by advanced AI' },
    { icon: <Eye size={30} />, title: 'Face Recognition', desc: 'Smart attendance with real-time face verification' },
    { icon: <BarChart3 size={30} />, title: 'Analytics Dashboard', desc: 'Track student engagement and learning progress' },
    { icon: <Target size={30} />, title: 'Adaptive Learning', desc: 'Personalized curriculum that adapts to each student' },
  ];

  return (
    <ImmersiveLayout showParticles showGrid showCanvas>

      {/* ═══════════ TOP NAVIGATION BAR ═══════════ */}
      <motion.nav
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.9rem 3.5rem',
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 100,
          background: 'linear-gradient(135deg, rgba(6,20,36,0.88) 0%, rgba(10,30,50,0.85) 40%, rgba(8,38,48,0.82) 100%)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(20,184,166,0.12)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.35), 0 1px 0 rgba(20,184,166,0.08) inset',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
             onClick={() => navigate('/dashboard')}>
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
          }}>
            Senku AI
          </span>
        </div>

        {/* Center links */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { label: 'Home', path: '/dashboard', active: true },
            { label: 'Sessions', path: '/session-library' },
            { label: 'Library', path: '/study-materials' },
            { label: 'Timetable', path: '/teacher-timetable' },
            { label: 'Lectures', path: '/live-lecture' },
          ].map(link => (
            <button
              key={link.label}
              onClick={() => navigate(link.path)}
              style={{
                background: link.active ? `${TEAL}15` : 'transparent',
                border: link.active ? `1px solid ${TEAL}30` : '1px solid transparent',
                borderRadius: 10, padding: '8px 20px',
                color: link.active ? TEAL : 'rgba(255,255,255,0.5)',
                fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.3s', fontFamily: "'Sora', 'Inter', inherit",
              }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/session-library')}
            style={{
              background: `linear-gradient(135deg, ${TEAL_DIM}, ${TEAL})`,
              border: 'none', borderRadius: 10, padding: '9px 24px',
              color: '#fff', fontSize: '0.92rem', fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Sora', 'Inter', inherit",
              boxShadow: `0 4px 20px ${TEAL}40`,
              transition: 'all 0.3s',
            }}
          >
            Get Started
          </button>
          {/* User avatar */}
          <div
            onClick={handleLogout}
            title="Logout"
            style={{
              width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
              background: `linear-gradient(135deg, ${TEAL_DIM}, ${CYAN})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 700, marginLeft: 4,
              border: '2px solid rgba(20,184,166,0.3)',
              transition: 'all 0.3s',
            }}
          >
            {(user?.username || 'T').charAt(0).toUpperCase()}
          </div>
        </div>
      </motion.nav>

      {/* ═══════════ HERO SECTION — split layout ═══════════ */}
      <div style={{
        minHeight: '100vh', width: '100%',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center',
        paddingTop: '70px',
      }}>

        {/* Background layers */}
        <GradientWaves />
        <FloatingParticles count={20} />

        {/* Hex grid (right side only) */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%2314b8a6' stroke-width='0.3' opacity='0.07'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 52px',
          maskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 40%, transparent 65%)',
          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 40%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Hero content wrapper */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', maxWidth: 1440, margin: '0 auto',
          padding: '0 4rem',
          position: 'relative', zIndex: 10,
        }}>

          {/* ═══════ LEFT SIDE — Text Content ═══════ */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{
              flex: '0 0 50%', maxWidth: '50%',
              paddingRight: '2rem',
            }}
          >
            {/* Small badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: `${TEAL}12`, border: `1px solid ${TEAL}25`,
                borderRadius: 100, padding: '6px 16px 6px 10px',
                marginBottom: 28,
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#34d399',
                boxShadow: '0 0 8px #34d39960',
                animation: 'hero-pulse 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '0.88rem', color: TEAL, fontWeight: 600, letterSpacing: '0.3px' }}>
                {stats.active > 0 ? `${stats.active} Sessions Active` : 'AI Teaching System Online'}
              </span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontSize: 'clamp(3rem, 5vw, 4rem)',
                fontWeight: 900, lineHeight: 1.08,
                letterSpacing: '-2.5px', margin: '0 0 8px',
                color: '#fff',
                fontFamily: "'Sora', 'Inter', system-ui, sans-serif",
              }}
            >
              Meet{' '}
              <span style={{
                background: `linear-gradient(135deg, ${TEAL} 0%, ${CYAN} 50%, #34d399 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 0 30px ${TEAL}40)`,
              }}>
                Senku
              </span>
              {' '}&mdash;
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontSize: 'clamp(2.6rem, 4.2vw, 3.5rem)',
                fontWeight: 900, lineHeight: 1.08,
                letterSpacing: '-2px', margin: '0 0 32px',
                color: 'rgba(255,255,255,0.85)',
                fontFamily: "'Sora', 'Inter', system-ui, sans-serif",
              }}
            >
              Your AI Teacher
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontSize: 'clamp(1.1rem, 1.3vw, 1.25rem)',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.8, margin: '0 0 44px',
                maxWidth: 540,
              }}
            >
              An intelligent AI instructor designed to teach, guide, and inspire
              the next generation of learners. Powered by voice, vision, and
              autonomous curriculum delivery.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.85, ease: [0.23, 1, 0.32, 1] }}
              style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 48 }}
            >
              {/* Primary CTA — Start Learning */}
              <motion.button
                onClick={() => navigate('/session-library')}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                animate={{
                  boxShadow: btnHover
                    ? `0 0 40px ${TEAL}50, 0 8px 32px ${TEAL}30, 0 0 80px ${TEAL}15`
                    : `0 4px 24px ${TEAL}30, 0 0 60px ${TEAL}10`,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                style={{
                  background: `linear-gradient(135deg, ${TEAL_DIM}, ${TEAL}, ${CYAN})`,
                  backgroundSize: '200% 200%',
                  border: 'none', borderRadius: 16,
                  padding: '16px 42px',
                  color: '#fff', fontSize: '1.1rem', fontWeight: 800,
                  cursor: 'pointer', fontFamily: "'Sora', 'Inter', inherit",
                  letterSpacing: '-0.3px',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Shine sweep */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '50%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    pointerEvents: 'none',
                  }}
                />
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                  Start Learning
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </motion.button>

              {/* Secondary CTA */}
              <motion.button
                onClick={() => navigate('/live-lecture')}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${TEAL}30`,
                  borderRadius: 16, padding: '15px 34px',
                  color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Sora', 'Inter', inherit",
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  transition: 'all 0.3s',
                }}
              >
                Watch Demo
              </motion.button>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1, ease: [0.23, 1, 0.32, 1] }}
              style={{ display: 'flex', gap: 40 }}
            >
              {[
                { value: stats.total > 0 ? `${stats.total}+` : '50+', label: 'Sessions Created' },
                { value: stats.students > 0 ? `${stats.students}+` : '200+', label: 'Students Engaged' },
                { value: '95%', label: 'Accuracy Rate' },
              ].map((stat, i) => (
                <div key={i}>
                  <div style={{
                    fontSize: '1.8rem', fontWeight: 800, lineHeight: 1,
                    background: `linear-gradient(135deg, ${TEAL}, ${CYAN})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>{stat.value}</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 6 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ═══════ RIGHT SIDE — Hero Robot Image ═══════ */}
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
            <img
              src="/images/hero-robot.png"
              alt="AI Teacher Robot"
              style={{
                width: '180%',
                maxWidth: 'none',
                height: 'auto',
                objectFit: 'contain',
                marginRight: '10rem',
                filter: 'drop-shadow(0 8px 32px rgba(56, 189, 248, 0.22))',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          style={{
            position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
            zIndex: 20, textAlign: 'center',
          }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', fontWeight: 500, marginBottom: 6, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Scroll to explore
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </motion.div>
        </motion.div>
      </div>

      {/* ═══════════ SECTION DIVIDER ═══════════ */}
      <div style={{
        maxWidth: 1440, margin: '0 auto', padding: '0 3.5rem',
        position: 'relative', zIndex: 5,
      }}>
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${TEAL}18, transparent)`,
        }} />
      </div>

      {/* ═══════════ FEATURES SECTION ═══════════ */}
      <div style={{
        padding: '5rem 3.5rem 6rem',
        maxWidth: 1440, margin: '0 auto',
        position: 'relative', zIndex: 5,
      }}>
        <PageTransition type="fade-up" delay={0.1}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 2.8vw, 2.5rem)',
              fontWeight: 800, letterSpacing: '-1px',
              margin: '0 0 16px',
              fontFamily: "'Sora', 'Inter', system-ui, sans-serif",
            }}>
              Intelligent Features for{' '}
              <span style={{
                background: `linear-gradient(135deg, ${TEAL}, ${CYAN})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Modern Classrooms
              </span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Everything you need to transform education with artificially intelligent teaching tools.
            </p>
          </div>
        </PageTransition>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {features.map((f, i) => (
            <FloatingCard
              key={f.title}
              accent={TEAL}
              delay={0.2 + i * 0.1}
              style={{ textAlign: 'center', padding: '36px 24px' }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: `${TEAL}10`, border: `1px solid ${TEAL}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: TEAL,
                margin: '0 auto 20px',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.3rem', margin: '0 0 10px', fontFamily: "'Sora', 'Inter', sans-serif" }}>{f.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', margin: 0, lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </FloatingCard>
          ))}
        </div>
      </div>

      {/* ═══════════ SECTION DIVIDER ═══════════ */}
      <div style={{
        maxWidth: 1440, margin: '0 auto', padding: '0 3.5rem',
        position: 'relative', zIndex: 5,
      }}>
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${TEAL}18, transparent)`,
        }} />
      </div>

      {/* ═══════════ QUICK LINKS / COMMAND CENTER ═══════════ */}
      <div style={{
        padding: '4rem 3.5rem 6rem',
        maxWidth: 1440, margin: '0 auto',
        position: 'relative', zIndex: 5,
      }}>
        <PageTransition type="fade-up" delay={0.2}>
          <SectionHeader
            title="Command Center"
            subtitle="Quick access to your AI classroom tools"
            accent={TEAL}
            icon={<Settings2 size={24} />}
          />
        </PageTransition>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
          marginTop: 12,
        }}>
          {quickLinks.map((f, i) => (
            <FloatingCard
              key={f.title}
              accent={f.accent}
              onClick={() => navigate(f.path)}
              delay={0.3 + i * 0.08}
              style={{ textAlign: 'center', padding: '32px 22px' }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: `${f.accent}12`, border: `1px solid ${f.accent}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.accent,
                margin: '0 auto 16px',
              }}>
                {f.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.15rem', margin: 0, fontFamily: "'Sora', 'Inter', sans-serif" }}>{f.title}</h3>
                {f.badge && <StatusBadge label={f.badge} color="#34d399" pulse size="sm" />}
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem',
                margin: 0, lineHeight: 1.55,
              }}>{f.desc}</p>
            </FloatingCard>
          ))}
        </div>
      </div>

      {/* ═══════════ FOOTER ═══════════ */}
      <div style={{
        padding: '2rem 3.5rem',
        borderTop: '1px solid rgba(20,184,166,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'relative', zIndex: 5,
        maxWidth: 1440, margin: '0 auto',
      }}>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)' }}>
          Senku AI &copy; {new Date().getFullYear()} &mdash; Autonomous Teaching System
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#34d399',
            boxShadow: '0 0 6px #34d39960',
            animation: 'hero-pulse 2s ease-in-out infinite',
          }} />
          {stats.active > 0 ? `${stats.active} Live Sessions` : 'All Systems Operational'}
        </span>
      </div>

      <style>{`
        @keyframes hero-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #34d39960; }
          50% { opacity: 0.4; box-shadow: 0 0 4px #34d39930; }
        }
      `}</style>
    </ImmersiveLayout>
  );
};

export default Dashboard;
