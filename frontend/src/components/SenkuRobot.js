/**
 * SenkuRobot — Futuristic AI teacher humanoid bust (head + upper torso).
 * Close-up portrait SVG inspired by cinematic mech designs.
 * Detailed mechanical head with visor, antenna arrays, circuit patterns.
 * Teal/cyan accent color scheme. Breathing + glow animations.
 */
import React from 'react';
import { motion } from 'framer-motion';

const SenkuRobot = ({ size = 600, className = '', style: outerStyle = {} }) => {
  const w = size;
  const h = size * 1.15;

  return (
    <div className={className} style={{ position: 'relative', width: w, height: h, ...outerStyle }}>
      {/* ── Ambient glow layers ── */}
      <motion.div
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.06, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: w * 0.8, height: w * 0.8, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.2) 0%, rgba(20,184,166,0.04) 50%, transparent 70%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        style={{
          position: 'absolute', top: '25%', left: '45%', transform: 'translateX(-50%)',
          width: w * 0.6, height: w * 1, borderRadius: '40%',
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }}
      />

      {/* ── Main SVG with floating animation ── */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', zIndex: 2 }}
      >
        <svg viewBox="0 0 500 580" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Dark metallic body */}
            <linearGradient id="sk-body" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#1a2e35"/>
              <stop offset="50%" stopColor="#0f1f26"/>
              <stop offset="100%" stopColor="#0a1419"/>
            </linearGradient>
            {/* Lighter metal panel */}
            <linearGradient id="sk-panel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#243b44"/>
              <stop offset="100%" stopColor="#152830"/>
            </linearGradient>
            {/* Chrome highlight */}
            <linearGradient id="sk-chrome" x1="0.3" y1="0" x2="0.7" y2="1">
              <stop offset="0%" stopColor="#4a7a82" stopOpacity="0.5"/>
              <stop offset="50%" stopColor="#2a5a64" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#1a3a42" stopOpacity="0.1"/>
            </linearGradient>
            {/* Teal accent glow gradient */}
            <linearGradient id="sk-teal" x1="0" y1="0" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#0d9488"/>
              <stop offset="50%" stopColor="#14b8a6"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
            {/* Eye glow */}
            <radialGradient id="sk-eyeGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9"/>
              <stop offset="40%" stopColor="#d97706" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#92400e" stopOpacity="0"/>
            </radialGradient>
            {/* Core reactor glow */}
            <radialGradient id="sk-coreGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0"/>
            </radialGradient>
            <filter id="sk-glow">
              <feGaussianBlur stdDeviation="3" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="sk-glow2">
              <feGaussianBlur stdDeviation="6" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="sk-glow3">
              <feGaussianBlur stdDeviation="10" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ═══════ TORSO / SHOULDERS ═══════ */}
          {/* Main chest plate */}
          <path d="M140,580 L140,380 Q140,340 180,320 L200,310 Q250,290 300,310 L320,320 Q360,340 360,380 L360,580 Z" fill="url(#sk-body)" stroke="rgba(20,184,166,0.1)" strokeWidth="1"/>
          <path d="M140,580 L140,380 Q140,340 180,320 L200,310 Q250,290 300,310 L320,320 Q360,340 360,380 L360,580 Z" fill="url(#sk-chrome)"/>

          {/* Left shoulder armor */}
          <path d="M140,380 Q100,360 80,390 L60,440 Q55,460 70,470 L140,450 Z" fill="url(#sk-body)" stroke="rgba(20,184,166,0.12)" strokeWidth="1"/>
          <path d="M70,410 L130,395" stroke="#14b8a6" strokeWidth="0.8" opacity="0.3"/>
          <path d="M75,425 L125,412" stroke="#14b8a6" strokeWidth="0.5" opacity="0.2"/>
          {/* Left shoulder accent line */}
          <rect x="90" y="400" width="40" height="2" rx="1" fill="#14b8a6" opacity="0.25">
            <animate attributeName="opacity" values="0.15;0.35;0.15" dur="3s" repeatCount="indefinite"/>
          </rect>

          {/* Right shoulder armor */}
          <path d="M360,380 Q400,360 420,390 L440,440 Q445,460 430,470 L360,450 Z" fill="url(#sk-body)" stroke="rgba(20,184,166,0.12)" strokeWidth="1"/>
          <path d="M370,395 L430,410" stroke="#14b8a6" strokeWidth="0.8" opacity="0.3"/>
          <path d="M375,412 L425,425" stroke="#14b8a6" strokeWidth="0.5" opacity="0.2"/>
          {/* Right shoulder accent */}
          <rect x="370" y="400" width="40" height="2" rx="1" fill="#14b8a6" opacity="0.25">
            <animate attributeName="opacity" values="0.15;0.35;0.15" dur="3s" repeatCount="indefinite" begin="0.5s"/>
          </rect>

          {/* Upper chest panel */}
          <rect x="190" y="340" width="120" height="60" rx="8" fill="url(#sk-panel)" stroke="rgba(20,184,166,0.12)" strokeWidth="1"/>
          {/* Chest circuit lines */}
          <rect x="200" y="355" width="80" height="1" rx="0.5" fill="#14b8a6" opacity="0.15"/>
          <rect x="200" y="365" width="60" height="1" rx="0.5" fill="#14b8a6" opacity="0.1"/>
          <rect x="200" y="375" width="70" height="1" rx="0.5" fill="#06b6d4" opacity="0.08"/>

          {/* Chest core reactor */}
          <circle cx="250" cy="430" r="22" fill="url(#sk-body)" stroke="url(#sk-teal)" strokeWidth="2.5" filter="url(#sk-glow)">
            <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="250" cy="430" r="14" fill="url(#sk-coreGlow)">
            <animate attributeName="r" values="14;17;14" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="250" cy="430" r="5" fill="#14b8a6" opacity="0.85">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
          {/* Core ring */}
          <circle cx="250" cy="430" r="28" fill="none" stroke="#14b8a6" strokeWidth="0.5" opacity="0.2" strokeDasharray="3 5">
            <animateTransform attributeName="transform" type="rotate" from="0 250 430" to="360 250 430" dur="20s" repeatCount="indefinite"/>
          </circle>

          {/* ═══════ NECK ═══════ */}
          <rect x="220" y="260" width="60" height="55" rx="10" fill="url(#sk-body)" stroke="rgba(20,184,166,0.08)" strokeWidth="1"/>
          {/* Neck segments */}
          <rect x="228" y="275" width="44" height="2" rx="1" fill="#0d9488" opacity="0.15"/>
          <rect x="228" y="285" width="44" height="2" rx="1" fill="#0d9488" opacity="0.1"/>
          <rect x="228" y="295" width="44" height="1.5" rx="1" fill="#0d9488" opacity="0.08"/>
          {/* Neck pistons */}
          <rect x="215" y="270" width="6" height="40" rx="3" fill="url(#sk-panel)" stroke="rgba(20,184,166,0.1)" strokeWidth="0.5"/>
          <rect x="279" y="270" width="6" height="40" rx="3" fill="url(#sk-panel)" stroke="rgba(20,184,166,0.1)" strokeWidth="0.5"/>

          {/* ═══════ HEAD ═══════ */}
          {/* Main cranium */}
          <path d="M170,260 Q170,130 250,100 Q330,130 330,260 Q330,280 310,290 L190,290 Q170,280 170,260 Z" fill="url(#sk-body)" stroke="rgba(20,184,166,0.15)" strokeWidth="1.5"/>
          <path d="M170,260 Q170,130 250,100 Q330,130 330,260 Q330,280 310,290 L190,290 Q170,280 170,260 Z" fill="url(#sk-chrome)" opacity="0.4"/>

          {/* Head top ridge */}
          <path d="M210,120 Q250,95 290,120" fill="none" stroke="rgba(20,184,166,0.2)" strokeWidth="1.5"/>
          <path d="M220,130 Q250,110 280,130" fill="none" stroke="rgba(20,184,166,0.12)" strokeWidth="1"/>

          {/* Cranium panel lines */}
          <line x1="250" y1="110" x2="250" y2="160" stroke="rgba(20,184,166,0.1)" strokeWidth="0.8"/>
          <line x1="210" y1="145" x2="290" y2="145" stroke="rgba(20,184,166,0.06)" strokeWidth="0.5"/>

          {/* ── ANTENNA (right side) ── */}
          <line x1="310" y1="170" x2="350" y2="120" stroke="url(#sk-panel)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="350" y1="120" x2="365" y2="95" stroke="url(#sk-panel)" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="365" cy="92" r="4" fill="url(#sk-body)" stroke="#14b8a6" strokeWidth="1.5" filter="url(#sk-glow)">
            <animate attributeName="fill" values="#0a1419;#14b8a6;#0a1419" dur="3s" repeatCount="indefinite"/>
          </circle>
          {/* Antenna crossbar */}
          <line x1="340" y1="130" x2="358" y2="118" stroke="#0d9488" strokeWidth="1" opacity="0.3"/>

          {/* ── ANTENNA (left side - smaller) ── */}
          <line x1="190" y1="170" x2="165" y2="135" stroke="url(#sk-panel)" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="162" cy="132" r="3" fill="url(#sk-body)" stroke="#06b6d4" strokeWidth="1" filter="url(#sk-glow)">
            <animate attributeName="fill" values="#0a1419;#06b6d4;#0a1419" dur="4s" repeatCount="indefinite"/>
          </circle>

          {/* ── EAR PANELS ── */}
          {/* Left ear */}
          <rect x="158" y="190" width="18" height="55" rx="6" fill="url(#sk-panel)" stroke="rgba(20,184,166,0.15)" strokeWidth="1"/>
          <rect x="162" y="200" width="10" height="8" rx="2" fill="#0d9488" opacity="0.2"/>
          <rect x="162" y="215" width="10" height="12" rx="2" fill="#14b8a6" opacity="0.15">
            <animate attributeName="opacity" values="0.1;0.25;0.1" dur="4s" repeatCount="indefinite"/>
          </rect>
          <rect x="162" y="232" width="10" height="4" rx="1" fill="#06b6d4" opacity="0.15"/>

          {/* Right ear */}
          <rect x="324" y="190" width="18" height="55" rx="6" fill="url(#sk-panel)" stroke="rgba(20,184,166,0.15)" strokeWidth="1"/>
          <rect x="328" y="200" width="10" height="8" rx="2" fill="#0d9488" opacity="0.2"/>
          <rect x="328" y="215" width="10" height="12" rx="2" fill="#14b8a6" opacity="0.15">
            <animate attributeName="opacity" values="0.1;0.25;0.1" dur="4s" repeatCount="indefinite" begin="1s"/>
          </rect>
          <rect x="328" y="232" width="10" height="4" rx="1" fill="#06b6d4" opacity="0.15"/>

          {/* ═══════ VISOR / EYE AREA ═══════ */}
          {/* Visor housing */}
          <path d="M185,185 Q185,170 200,165 L300,165 Q315,170 315,185 L315,220 Q315,235 300,240 L200,240 Q185,235 185,220 Z" fill="rgba(5,10,14,0.9)" stroke="url(#sk-teal)" strokeWidth="2" filter="url(#sk-glow)">
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="4s" repeatCount="indefinite"/>
          </path>
          {/* Visor interior dark */}
          <path d="M192,190 Q192,178 205,174 L295,174 Q308,178 308,190 L308,215 Q308,227 295,231 L205,231 Q192,227 192,215 Z" fill="rgba(2,6,10,0.95)"/>

          {/* ── MAIN EYE (large central eye like reference) ── */}
          {/* Outer ring */}
          <circle cx="250" cy="203" r="30" fill="none" stroke="#1a3a42" strokeWidth="3"/>
          <circle cx="250" cy="203" r="30" fill="none" stroke="url(#sk-teal)" strokeWidth="1" opacity="0.4">
            <animate attributeName="stroke-opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite"/>
          </circle>
          {/* Mid ring */}
          <circle cx="250" cy="203" r="22" fill="rgba(15,31,38,0.9)" stroke="#0d9488" strokeWidth="1.5" opacity="0.5"/>
          {/* Inner ring with segments */}
          <circle cx="250" cy="203" r="16" fill="none" stroke="#14b8a6" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.4">
            <animateTransform attributeName="transform" type="rotate" from="0 250 203" to="-360 250 203" dur="12s" repeatCount="indefinite"/>
          </circle>
          {/* Iris */}
          <circle cx="250" cy="203" r="14" fill="url(#sk-eyeGlow)" filter="url(#sk-glow2)">
            <animate attributeName="r" values="14;15;14" dur="4s" repeatCount="indefinite"/>
          </circle>
          {/* Pupil */}
          <circle cx="250" cy="203" r="6" fill="#92400e" stroke="#d97706" strokeWidth="1"/>
          <circle cx="250" cy="203" r="3" fill="#1a0500"/>
          {/* Eye reflection */}
          <circle cx="244" cy="197" r="3" fill="white" opacity="0.5"/>
          <circle cx="256" cy="195" r="1.5" fill="white" opacity="0.3"/>

          {/* ── Secondary eyes (smaller, flanking) ── */}
          {/* Left small eye */}
          <circle cx="210" cy="203" r="6" fill="rgba(5,10,14,0.9)" stroke="#0d9488" strokeWidth="1" opacity="0.7"/>
          <circle cx="210" cy="203" r="3" fill="#14b8a6" opacity="0.5" filter="url(#sk-glow)">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite"/>
          </circle>
          {/* Right small eye */}
          <circle cx="290" cy="203" r="6" fill="rgba(5,10,14,0.9)" stroke="#0d9488" strokeWidth="1" opacity="0.7"/>
          <circle cx="290" cy="203" r="3" fill="#14b8a6" opacity="0.5" filter="url(#sk-glow)">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" begin="0.5s"/>
          </circle>

          {/* Visor HUD lines */}
          <line x1="198" y1="180" x2="230" y2="180" stroke="#14b8a6" strokeWidth="0.5" opacity="0.2"/>
          <line x1="270" y1="180" x2="302" y2="180" stroke="#14b8a6" strokeWidth="0.5" opacity="0.2"/>
          <line x1="198" y1="226" x2="220" y2="226" stroke="#06b6d4" strokeWidth="0.5" opacity="0.15"/>
          <line x1="280" y1="226" x2="302" y2="226" stroke="#06b6d4" strokeWidth="0.5" opacity="0.15"/>

          {/* ═══════ FACE PLATE (below visor) ═══════ */}
          <path d="M195,240 L305,240 L295,275 Q250,290 205,275 Z" fill="url(#sk-panel)" stroke="rgba(20,184,166,0.1)" strokeWidth="1"/>
          {/* Mouth / speaker grille */}
          <rect x="230" y="255" width="40" height="3" rx="1.5" fill="#14b8a6" opacity="0.2">
            <animate attributeName="opacity" values="0.15;0.3;0.15" dur="5s" repeatCount="indefinite"/>
          </rect>
          <rect x="235" y="262" width="30" height="2" rx="1" fill="#14b8a6" opacity="0.12"/>
          <rect x="238" y="268" width="24" height="1.5" rx="1" fill="#06b6d4" opacity="0.08"/>

          {/* ═══════ MECHANICAL DETAILS ═══════ */}
          {/* Cheek vents - left */}
          <rect x="180" y="245" width="12" height="3" rx="1" fill="#0d9488" opacity="0.15"/>
          <rect x="180" y="252" width="12" height="3" rx="1" fill="#0d9488" opacity="0.1"/>
          <rect x="180" y="259" width="12" height="3" rx="1" fill="#0d9488" opacity="0.08"/>
          {/* Cheek vents - right */}
          <rect x="308" y="245" width="12" height="3" rx="1" fill="#0d9488" opacity="0.15"/>
          <rect x="308" y="252" width="12" height="3" rx="1" fill="#0d9488" opacity="0.1"/>
          <rect x="308" y="259" width="12" height="3" rx="1" fill="#0d9488" opacity="0.08"/>

          {/* Forehead sensor */}
          <circle cx="250" cy="156" r="5" fill="url(#sk-body)" stroke="#14b8a6" strokeWidth="1" filter="url(#sk-glow)">
            <animate attributeName="stroke-opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="250" cy="156" r="2" fill="#14b8a6" opacity="0.6"/>

          {/* Side hull details */}
          <line x1="175" y1="160" x2="175" y2="250" stroke="rgba(20,184,166,0.06)" strokeWidth="0.5"/>
          <line x1="325" y1="160" x2="325" y2="250" stroke="rgba(20,184,166,0.06)" strokeWidth="0.5"/>

          {/* Shoulder joint circles */}
          <circle cx="145" cy="340" r="12" fill="url(#sk-panel)" stroke="rgba(20,184,166,0.15)" strokeWidth="1"/>
          <circle cx="145" cy="340" r="5" fill="#0d9488" opacity="0.2"/>
          <circle cx="355" cy="340" r="12" fill="url(#sk-panel)" stroke="rgba(20,184,166,0.15)" strokeWidth="1"/>
          <circle cx="355" cy="340" r="5" fill="#0d9488" opacity="0.2"/>

          {/* Chest side lighting strips */}
          <rect x="155" y="370" width="3" height="50" rx="1.5" fill="#14b8a6" opacity="0.15">
            <animate attributeName="opacity" values="0.1;0.25;0.1" dur="4s" repeatCount="indefinite"/>
          </rect>
          <rect x="342" y="370" width="3" height="50" rx="1.5" fill="#14b8a6" opacity="0.15">
            <animate attributeName="opacity" values="0.1;0.25;0.1" dur="4s" repeatCount="indefinite" begin="2s"/>
          </rect>

          {/* Tech label text (decorative) */}
          <text x="200" y="500" fill="#14b8a6" opacity="0.08" fontSize="8" fontFamily="monospace" letterSpacing="2">SENKU-AI v3.2</text>
          <text x="200" y="512" fill="#06b6d4" opacity="0.05" fontSize="6" fontFamily="monospace" letterSpacing="1.5">AUTONOMOUS TEACHER UNIT</text>
        </svg>
      </motion.div>

      {/* ── Ground / base glow ── */}
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2], scaleX: [0.85, 1, 0.85] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', bottom: '-2%', left: '50%', transform: 'translateX(-50%)',
          width: w * 0.5, height: 30,
          background: 'radial-gradient(ellipse, rgba(20,184,166,0.2) 0%, transparent 70%)',
          filter: 'blur(15px)', pointerEvents: 'none',
        }}
      />

      {/* ── Floating energy particles ── */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -(15 + Math.random() * 35), 0],
            x: [0, (Math.random() - 0.5) * 25, 0],
            opacity: [0, 0.5 + Math.random() * 0.3, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${15 + Math.random() * 70}%`,
            top: `${20 + Math.random() * 50}%`,
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            borderRadius: '50%',
            background: i % 3 === 0 ? '#14b8a6' : i % 3 === 1 ? '#06b6d4' : '#0d9488',
            boxShadow: `0 0 6px ${i % 3 === 0 ? '#14b8a6' : '#06b6d4'}40`,
            pointerEvents: 'none', zIndex: 3,
          }}
        />
      ))}
    </div>
  );
};

export default SenkuRobot;
