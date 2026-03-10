/**
 * AITeacherRobot — True 3D revolving robot.
 *
 * Uses a CSS 3D rectangular prism with four SVG faces:
 *   FRONT  — fully detailed (animated arms + head)
 *   RIGHT  — side-profile view
 *   BACK   — rear view (spine cables, back panels)
 *   LEFT   — mirrored side-profile
 *
 * The prism slowly revolves on the Y-axis so you actually see
 * the side and back of the robot, not a squished flat card.
 */
import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, animate } from 'framer-motion';

/* ── colour tokens ── */
const CYAN  = '#38bdf8';
const CABLE = '#2563eb';

/* ── helpers ── */
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const AITeacherRobot = ({ size = 600, className = '', style: outerStyle = {} }) => {
  const w = size;
  const h = size * 1.15;
  const depth = w * 0.30;          // body depth for 3D prism
  const cancelRef = useRef(false);

  /* ── motion values ── */
  const rawX    = useMotionValue(0);
  const rawY    = useMotionValue(0);
  const posX    = useSpring(rawX, { stiffness: 60, damping: 26 });
  const posY    = useSpring(rawY, { stiffness: 60, damping: 26 });
  const rawRotY = useMotionValue(0);
  const revolve = useSpring(rawRotY, { stiffness: 30, damping: 20 });

  const rawLA = useMotionValue(0);
  const rawRA = useMotionValue(0);
  const rawHX = useMotionValue(0);
  const rawHY = useMotionValue(0);
  const leftArm    = useSpring(rawLA, { stiffness: 50, damping: 16 });
  const rightArm   = useSpring(rawRA, { stiffness: 50, damping: 16 });
  const headRotX   = useSpring(rawHX, { stiffness: 45, damping: 16 });
  const headShiftY = useSpring(rawHY, { stiffness: 45, damping: 16 });

  /* ── autonomous animation sequencer ── */
  useEffect(() => {
    cancelRef.current = false;
    let cumRotY = 0;

    const wander = () => {
      if (cancelRef.current) return;
      const dur = rand(4, 8);
      animate(rawX, (Math.random() - 0.5) * w * 0.06, { duration: dur, ease: 'easeInOut' });
      animate(rawY, (Math.random() - 0.5) * h * 0.03, { duration: dur, ease: 'easeInOut' });
      const ch = Math.random();
      if (ch < 0.30) cumRotY += pick([90, -90]);
      else if (ch < 0.50) cumRotY += pick([180, -180]);
      else if (ch < 0.65) cumRotY += pick([360, -360]);
      else cumRotY += rand(-15, 15);
      animate(rawRotY, cumRotY, { duration: dur * 1.2, ease: 'easeInOut' });
      setTimeout(wander, dur * 1000 + rand(1000, 3000));
    };

    const gestureArm = () => {
      if (cancelRef.current) return;
      const g = pick(['wave', 'shrug', 'idle', 'idle']);
      switch (g) {
        case 'wave': {
          const seq = async () => {
            for (let i = 0; i < 2 && !cancelRef.current; i++) {
              await animate(rawRA, -18, { duration: 0.4, ease: 'easeInOut' }).then?.(() => {});
              await animate(rawRA, -8,  { duration: 0.35, ease: 'easeInOut' }).then?.(() => {});
            }
            animate(rawRA, 0, { duration: 0.6, ease: 'easeOut' });
          };
          seq();
          break;
        }
        case 'shrug':
          animate(rawLA, 10, { duration: 0.6, ease: 'easeInOut' });
          animate(rawRA, -10, { duration: 0.6, ease: 'easeInOut' });
          setTimeout(() => {
            animate(rawLA, 0, { duration: 0.5, ease: 'easeOut' });
            animate(rawRA, 0, { duration: 0.5, ease: 'easeOut' });
          }, 900);
          break;
        default: break;
      }
      setTimeout(gestureArm, rand(4000, 8000));
    };

    const moveHead = () => {
      if (cancelRef.current) return;
      const hg = pick(['nod', 'tilt', 'idle', 'idle']);
      const dur = rand(1, 2);
      switch (hg) {
        case 'nod': {
          const seq = async () => {
            for (let i = 0; i < 2 && !cancelRef.current; i++) {
              await animate(rawHY, 3, { duration: 0.3, ease: 'easeInOut' }).then?.(() => {});
              await animate(rawHY, 0, { duration: 0.3, ease: 'easeInOut' }).then?.(() => {});
            }
          };
          seq();
          break;
        }
        case 'tilt':
          animate(rawHX, pick([-6, 6]), { duration: dur, ease: 'easeInOut' });
          setTimeout(() => animate(rawHX, 0, { duration: dur, ease: 'easeInOut' }), dur * 1000 + 400);
          break;
        default: break;
      }
      setTimeout(moveHead, rand(3000, 6000));
    };

    const t1 = setTimeout(wander,     rand(800, 2000));
    const t2 = setTimeout(gestureArm, rand(2000, 4000));
    const t3 = setTimeout(moveHead,   rand(1500, 3500));
    return () => { cancelRef.current = true; clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [rawX, rawY, rawRotY, rawLA, rawRA, rawHX, rawHY, w, h]);

  /* ── face positioning helpers ── */
  const face = {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%',
    backfaceVisibility: 'hidden',
  };
  const sideFace = {
    position: 'absolute', top: 0,
    width: depth, height: '100%',
    left: (w - depth) / 2,
    backfaceVisibility: 'hidden',
  };

  return (
    <div
      className={className}
      style={{
        position: 'relative', width: w, height: h,
        pointerEvents: 'none', perspective: 1200,
        ...outerStyle,
      }}
    >
      {/* ambient glow */}
      <motion.div
        animate={{ opacity: [0.15, 0.32, 0.15], scale: [1, 1.06, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: w * 0.75, height: w * 0.75, borderRadius: '50%',
          background: `radial-gradient(circle, ${CYAN}18 0%, transparent 65%)`,
          filter: 'blur(45px)', pointerEvents: 'none',
        }}
      />

      {/* ╔══════════════════════════════════════════════╗
          ║   3D RECTANGULAR PRISM — 4 SVG faces        ║
          ╚══════════════════════════════════════════════╝ */}
      <motion.div
        style={{
          x: posX, y: posY,
          rotateY: revolve,
          transformStyle: 'preserve-3d',
          position: 'relative',
          width: w, height: h, zIndex: 2,
        }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      >

        {/* ═══════════════════════════════════════════════
                      FRONT FACE — full detail
           ═══════════════════════════════════════════════ */}
        <div style={{ ...face, transform: `translateZ(${depth / 2}px)` }}>
          <svg viewBox="0 0 500 620" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="rb-body" x1=".15" y1="0" x2=".85" y2="1">
                <stop offset="0%" stopColor="#eaeff3"/><stop offset="30%" stopColor="#d4dbe2"/>
                <stop offset="65%" stopColor="#bfc8d0"/><stop offset="100%" stopColor="#a4b0ba"/>
              </linearGradient>
              <linearGradient id="rb-hi" x1=".2" y1="0" x2=".5" y2="1">
                <stop offset="0%" stopColor="#f2f5f8"/><stop offset="100%" stopColor="#dfe5ea"/>
              </linearGradient>
              <linearGradient id="rb-sh" x1=".3" y1="0" x2=".7" y2="1">
                <stop offset="0%" stopColor="#98a8b4"/><stop offset="100%" stopColor="#7b8e9c"/>
              </linearGradient>
              <linearGradient id="rb-dk" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38444e"/><stop offset="100%" stopColor="#222d36"/>
              </linearGradient>
              <linearGradient id="rb-visor" x1=".2" y1="0" x2=".8" y2="1">
                <stop offset="0%" stopColor="#181f2c"/><stop offset="40%" stopColor="#0c1320"/>
                <stop offset="100%" stopColor="#05080e"/>
              </linearGradient>
              <linearGradient id="rb-vsh" x1="0" y1="0" x2=".55" y2=".75">
                <stop offset="0%" stopColor="#fff" stopOpacity=".14"/>
                <stop offset="55%" stopColor="#fff" stopOpacity=".04"/>
                <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="rb-spec" x1=".3" y1="0" x2=".7" y2="1">
                <stop offset="0%" stopColor="#fff" stopOpacity=".28"/>
                <stop offset="50%" stopColor="#fff" stopOpacity=".08"/>
                <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="rb-cable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CABLE} stopOpacity=".7"/>
                <stop offset="100%" stopColor={CABLE} stopOpacity=".35"/>
              </linearGradient>
              <filter id="g1"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="g2"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="ds"><feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity=".14"/></filter>
              <filter id="is"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity=".18"/></filter>
            </defs>

            {/* TORSO */}
            <path d="M155,590 L155,395 Q155,348 198,326 L218,316 Q250,302 282,316 L302,326 Q345,348 345,395 L345,590 Z"
              fill="url(#rb-body)" stroke="#b0bcc6" strokeWidth="1" filter="url(#ds)"/>
            <path d="M182,395 Q182,360 214,342 L244,332 Q250,330 256,332 L280,340 Q296,348 296,368 L296,415 Q250,404 206,415 Z"
              fill="url(#rb-spec)" opacity=".55"/>

            <rect x="212" y="365" width="76" height="52" rx="7" fill="url(#rb-hi)" stroke="#c5cdd4" strokeWidth="1"/>
            <rect x="220" y="375" width="60" height="32" rx="4" fill="url(#rb-body)" stroke="#b8c2cc" strokeWidth=".8"/>
            <line x1="228" y1="387" x2="272" y2="387" stroke="#a0adb8" strokeWidth=".6" opacity=".45"/>
            <line x1="228" y1="395" x2="260" y2="395" stroke="#a0adb8" strokeWidth=".5" opacity=".3"/>

            <circle cx="250" cy="432" r="4" fill={CYAN} opacity=".65" filter="url(#g1)">
              <animate attributeName="opacity" values=".35;.85;.35" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="250" cy="432" r="9" fill="none" stroke={CYAN} strokeWidth=".5" opacity=".2">
              <animate attributeName="r" values="9;12;9" dur="3s" repeatCount="indefinite"/>
            </circle>

            <path d="M155,395 L155,478 L168,478 L168,390 Z" fill="url(#rb-sh)" opacity=".45"/>
            <path d="M345,395 L345,478 L332,478 L332,390 Z" fill="url(#rb-sh)" opacity=".45"/>
            <path d="M196,330 Q250,310 304,330" fill="none" stroke="#cdd5dc" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="175" y1="456" x2="325" y2="456" stroke="#b8c2cc" strokeWidth=".7" opacity=".3"/>
            <line x1="180" y1="476" x2="320" y2="476" stroke="#b8c2cc" strokeWidth=".5" opacity=".2"/>
            <line x1="185" y1="496" x2="315" y2="496" stroke="#b8c2cc" strokeWidth=".5" opacity=".15"/>

            {[0,1,2,3].map(i=>(
              <g key={`lv${i}`}>
                <rect x="162" y={408+i*11} width="14" height="3" rx="1.5" fill="url(#rb-sh)" opacity=".25"/>
                <rect x="324" y={408+i*11} width="14" height="3" rx="1.5" fill="url(#rb-sh)" opacity=".25"/>
              </g>
            ))}
            <rect x="160" y="405" width="2.5" height="42" rx="1.25" fill={CYAN} opacity=".08">
              <animate attributeName="opacity" values=".04;.14;.04" dur="4s" repeatCount="indefinite"/>
            </rect>
            <rect x="338" y="405" width="2.5" height="42" rx="1.25" fill={CYAN} opacity=".08">
              <animate attributeName="opacity" values=".04;.14;.04" dur="4s" repeatCount="indefinite" begin="2s"/>
            </rect>

            {/* SHOULDERS */}
            <ellipse cx="115" cy="382" rx="52" ry="44" fill="url(#rb-body)" stroke="#b0bcc6" strokeWidth="1" filter="url(#ds)"/>
            <ellipse cx="110" cy="372" rx="33" ry="23" fill="url(#rb-spec)" opacity=".5"/>
            <ellipse cx="150" cy="382" rx="8" ry="19" fill="url(#rb-dk)" opacity=".55"/>
            <circle cx="100" cy="390" r="5" fill="#b0bcc6" stroke="#9aa8b4" strokeWidth=".8"/>
            <circle cx="100" cy="390" r="2" fill="#8896a2"/>
            <path d="M78,360 Q115,340 150,360" fill="none" stroke="#b8c2cc" strokeWidth=".8" opacity=".5"/>

            <ellipse cx="385" cy="382" rx="52" ry="44" fill="url(#rb-body)" stroke="#b0bcc6" strokeWidth="1" filter="url(#ds)"/>
            <ellipse cx="390" cy="372" rx="33" ry="23" fill="url(#rb-spec)" opacity=".5"/>
            <ellipse cx="350" cy="382" rx="8" ry="19" fill="url(#rb-dk)" opacity=".55"/>
            <circle cx="400" cy="390" r="5" fill="#b0bcc6" stroke="#9aa8b4" strokeWidth=".8"/>
            <circle cx="400" cy="390" r="2" fill="#8896a2"/>
            <path d="M350,360 Q385,340 422,360" fill="none" stroke="#b8c2cc" strokeWidth=".8" opacity=".5"/>

            {/* LEFT ARM */}
            <motion.g style={{ rotate: leftArm, originX: '115px', originY: '382px' }}>
              <path d="M88,418 Q78,440 80,472 Q83,494 96,506 L106,506 Q116,494 114,472 Q112,444 120,422 Z" fill="url(#rb-body)" stroke="#b0bcc6" strokeWidth=".8"/>
              <path d="M92,428 Q86,450 88,472" fill="none" stroke="url(#rb-spec)" strokeWidth="1.5" opacity=".35"/>
              <path d="M104,424 Q100,445 98,470 Q96,490 100,504" fill="none" stroke="url(#rb-cable)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M108,426 Q105,445 103,470 Q101,488 104,502" fill="none" stroke={CABLE} strokeWidth="1" opacity=".25"/>
              <ellipse cx="97" cy="506" rx="15" ry="11" fill="url(#rb-sh)" stroke="#a0adb8" strokeWidth=".8"/>
              <circle cx="97" cy="506" r="4" fill="url(#rb-dk)" stroke="#5a6872" strokeWidth=".5"/>
              <path d="M82,516 Q75,540 78,565 Q80,578 90,585 L100,585 Q108,578 110,565 Q112,540 106,516 Z" fill="url(#rb-body)" stroke="#b0bcc6" strokeWidth=".7"/>
              <path d="M87,525 Q80,545 82,565" fill="none" stroke="url(#rb-spec)" strokeWidth="1" opacity=".3"/>
              <path d="M100,518 Q96,540 95,562 Q94,575 97,584" fill="none" stroke="url(#rb-cable)" strokeWidth="2" strokeLinecap="round"/>
            </motion.g>

            {/* RIGHT ARM */}
            <motion.g style={{ rotate: rightArm, originX: '385px', originY: '382px' }}>
              <path d="M412,418 Q422,440 420,472 Q417,494 404,506 L394,506 Q384,494 386,472 Q388,444 380,422 Z" fill="url(#rb-body)" stroke="#b0bcc6" strokeWidth=".8"/>
              <path d="M408,428 Q414,450 412,472" fill="none" stroke="url(#rb-spec)" strokeWidth="1.5" opacity=".35"/>
              <path d="M396,424 Q400,445 402,470 Q404,490 400,504" fill="none" stroke="url(#rb-cable)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M392,426 Q395,445 397,470 Q399,488 396,502" fill="none" stroke={CABLE} strokeWidth="1" opacity=".25"/>
              <ellipse cx="403" cy="506" rx="15" ry="11" fill="url(#rb-sh)" stroke="#a0adb8" strokeWidth=".8"/>
              <circle cx="403" cy="506" r="4" fill="url(#rb-dk)" stroke="#5a6872" strokeWidth=".5"/>
              <path d="M418,516 Q425,540 422,565 Q420,578 410,585 L400,585 Q392,578 390,565 Q388,540 394,516 Z" fill="url(#rb-body)" stroke="#b0bcc6" strokeWidth=".7"/>
              <path d="M413,525 Q420,545 418,565" fill="none" stroke="url(#rb-spec)" strokeWidth="1" opacity=".3"/>
              <path d="M400,518 Q404,540 405,562 Q406,575 403,584" fill="none" stroke="url(#rb-cable)" strokeWidth="2" strokeLinecap="round"/>
            </motion.g>

            {/* NECK */}
            <rect x="222" y="264" width="56" height="48" rx="10" fill="url(#rb-dk)" stroke="#4a5560" strokeWidth=".8"/>
            <rect x="226" y="274" width="48" height="2.5" rx="1.25" fill="#4f5e6a" opacity=".45"/>
            <rect x="226" y="282" width="48" height="2" rx="1" fill="#4f5e6a" opacity=".3"/>
            <rect x="226" y="290" width="48" height="1.5" rx=".75" fill="#4f5e6a" opacity=".2"/>
            <rect x="230" y="298" width="40" height="1.5" rx=".75" fill={CYAN} opacity=".2">
              <animate attributeName="opacity" values=".1;.32;.1" dur="4s" repeatCount="indefinite"/>
            </rect>
            <rect x="216" y="271" width="8" height="34" rx="4" fill="#4a5560" stroke="#556570" strokeWidth=".5"/>
            <rect x="276" y="271" width="8" height="34" rx="4" fill="#4a5560" stroke="#556570" strokeWidth=".5"/>
            <path d="M238,268 Q236,282 238,302" fill="none" stroke={CABLE} strokeWidth="1.8" opacity=".3" strokeLinecap="round"/>
            <path d="M262,268 Q264,282 262,302" fill="none" stroke={CABLE} strokeWidth="1.8" opacity=".3" strokeLinecap="round"/>

            {/* HEAD */}
            <motion.g style={{ rotate: headRotX, y: headShiftY, originX: '250px', originY: '290px' }}>
              <path d="M172,268 Q172,138 250,100 Q328,138 328,268 Q328,287 310,296 L190,296 Q172,287 172,268 Z"
                fill="url(#rb-body)" stroke="#b0bcc6" strokeWidth="1.5" filter="url(#ds)"/>
              <path d="M198,150 Q250,112 302,150 Q307,172 302,190 Q250,162 198,190 Q193,172 198,150 Z"
                fill="url(#rb-spec)" opacity=".65"/>
              <line x1="250" y1="108" x2="250" y2="162" stroke="#c0cad2" strokeWidth="1.2" opacity=".35"/>
              <path d="M185,155 Q185,200 188,250" fill="none" stroke="#b8c2cc" strokeWidth=".7" opacity=".3"/>
              <path d="M315,155 Q315,200 312,250" fill="none" stroke="#b8c2cc" strokeWidth=".7" opacity=".3"/>
              <path d="M188,195 Q250,185 312,195" fill="none" stroke="#b8c2cc" strokeWidth=".6" opacity=".25"/>
              <rect x="310" y="192" width="13" height="22" rx="3" fill="url(#rb-hi)" stroke="#b8c2cc" strokeWidth=".8"/>
              <rect x="312" y="197" width="9" height="4" rx="1.5" fill="#9aa8b4" opacity=".45"/>
              <rect x="312" y="206" width="9" height="3" rx="1" fill="#9aa8b4" opacity=".3"/>
              <rect x="177" y="192" width="13" height="22" rx="3" fill="url(#rb-hi)" stroke="#b8c2cc" strokeWidth=".8"/>
              <rect x="179" y="197" width="9" height="4" rx="1.5" fill="#9aa8b4" opacity=".45"/>
              <rect x="179" y="206" width="9" height="3" rx="1" fill="#9aa8b4" opacity=".3"/>
              <circle cx="325" cy="230" r="8" fill="url(#rb-hi)" stroke="#b8c2cc" strokeWidth=".8"/>
              <circle cx="325" cy="230" r="4" fill="url(#rb-sh)" opacity=".4"/>
              <circle cx="175" cy="230" r="8" fill="url(#rb-hi)" stroke="#b8c2cc" strokeWidth=".8"/>
              <circle cx="175" cy="230" r="4" fill="url(#rb-sh)" opacity=".4"/>

              {/* VISOR */}
              <path d="M190,186 Q190,164 210,158 L290,158 Q310,164 310,186 L310,250 Q310,268 290,274 L210,274 Q190,268 190,250 Z"
                fill="url(#rb-visor)" stroke="#3a4858" strokeWidth="1.5" filter="url(#is)"/>
              <path d="M196,176 Q196,168 212,163 L282,163 Q294,168 294,176 L294,198 Q260,192 218,198 Z" fill="url(#rb-vsh)"/>
              <path d="M204,172 Q242,164 278,172" fill="none" stroke="#fff" strokeWidth=".7" opacity=".07"/>
              <path d="M210,268 Q250,276 290,268" fill="none" stroke={CYAN} strokeWidth="1" opacity=".18" filter="url(#g1)">
                <animate attributeName="opacity" values=".1;.28;.1" dur="4s" repeatCount="indefinite"/>
              </path>
              <path d="M194,188 Q194,168 212,162 L288,162 Q306,168 306,188" fill="none" stroke={CYAN} strokeWidth=".6" opacity=".12"/>
              <circle cx="226" cy="216" r="7" fill={CYAN} opacity=".05" filter="url(#g2)">
                <animate attributeName="opacity" values=".03;.1;.03" dur="5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="274" cy="216" r="7" fill={CYAN} opacity=".05" filter="url(#g2)">
                <animate attributeName="opacity" values=".03;.1;.03" dur="5s" repeatCount="indefinite" begin=".6s"/>
              </circle>
              <path d="M210,158 Q250,148 290,158" fill="none" stroke="#c8d0d8" strokeWidth="1.4"/>
              <path d="M200,274 Q250,285 300,274" fill="none" stroke="#b0bcc6" strokeWidth="1.1"/>
            </motion.g>

            <ellipse cx="250" cy="296" rx="40" ry="6" fill="url(#rb-dk)" stroke="#4a5560" strokeWidth=".5"/>
            <ellipse cx="250" cy="296" rx="32" ry="3" fill="none" stroke={CYAN} strokeWidth=".5" opacity=".18">
              <animate attributeName="opacity" values=".08;.28;.08" dur="3.5s" repeatCount="indefinite"/>
            </ellipse>
            <path d="M155,368 Q164,346 196,330" fill="none" stroke="#b8c2cc" strokeWidth="1" opacity=".55"/>
            <path d="M345,368 Q336,346 304,330" fill="none" stroke="#b8c2cc" strokeWidth="1" opacity=".55"/>
            <circle cx="152" cy="382" r="5" fill="url(#rb-dk)" stroke="#5a6872" strokeWidth=".8"/>
            <circle cx="348" cy="382" r="5" fill="url(#rb-dk)" stroke="#5a6872" strokeWidth=".8"/>
            <circle cx="138" cy="365" r="2" fill="#a0adb8" stroke="#8896a2" strokeWidth=".5"/>
            <circle cx="362" cy="365" r="2" fill="#a0adb8" stroke="#8896a2" strokeWidth=".5"/>
          </svg>
        </div>

        {/* ═══════════════════════════════════════════════
                   RIGHT SIDE FACE — profile view
           ═══════════════════════════════════════════════ */}
        <div style={{ ...sideFace, transform: `rotateY(90deg) translateZ(${w / 2}px)` }}>
          <svg viewBox="0 0 160 620" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Torso from side */}
            <path d="M25,590 L25,385 Q25,345 50,325 Q80,310 110,325 Q135,345 135,385 L135,590 Z"
              fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1"/>
            <path d="M35,385 Q45,355 70,340 L100,335 Q115,350 115,385 L115,410 Q80,400 45,410 Z"
              fill="#eaeff3" opacity=".35"/>
            {/* Side panel */}
            <rect x="85" y="380" width="35" height="60" rx="4" fill="#eaeff3" stroke="#c5cdd4" strokeWidth=".8"/>
            <line x1="92" y1="400" x2="115" y2="400" stroke="#b8c2cc" strokeWidth=".5"/>
            <line x1="92" y1="412" x2="110" y2="412" stroke="#b8c2cc" strokeWidth=".4"/>
            {/* Seams */}
            <line x1="32" y1="456" x2="128" y2="456" stroke="#b8c2cc" strokeWidth=".5" opacity=".3"/>
            <line x1="35" y1="476" x2="125" y2="476" stroke="#b8c2cc" strokeWidth=".4" opacity=".2"/>
            {/* Vents */}
            <rect x="30" y="408" width="10" height="2.5" rx="1.25" fill="#98a8b4" opacity=".3"/>
            <rect x="30" y="418" width="10" height="2.5" rx="1.25" fill="#98a8b4" opacity=".3"/>
            <rect x="30" y="428" width="10" height="2.5" rx="1.25" fill="#98a8b4" opacity=".3"/>
            {/* Chest indicator from side */}
            <circle cx="120" cy="432" r="3" fill={CYAN} opacity=".35">
              <animate attributeName="opacity" values=".2;.5;.2" dur="3s" repeatCount="indefinite"/>
            </circle>

            {/* Shoulder from side */}
            <ellipse cx="80" cy="382" rx="35" ry="42" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1"/>
            <ellipse cx="75" cy="372" rx="20" ry="22" fill="#eaeff3" opacity=".35"/>
            <circle cx="80" cy="395" r="4" fill="#b0bcc6" stroke="#9aa8b4" strokeWidth=".8"/>
            <circle cx="80" cy="395" r="1.5" fill="#8896a2"/>

            {/* Arm from side */}
            <path d="M68,418 Q60,445 63,478 Q65,495 75,505 L85,505 Q90,495 88,478 Q86,445 92,418 Z"
              fill="#d4dbe2" stroke="#b0bcc6" strokeWidth=".8"/>
            <path d="M78,422 Q76,445 77,478" fill="none" stroke={CABLE} strokeWidth="2" opacity=".35" strokeLinecap="round"/>
            {/* Elbow */}
            <ellipse cx="78" cy="505" rx="12" ry="10" fill="#98a8b4" stroke="#a0adb8" strokeWidth=".8"/>
            <circle cx="78" cy="505" r="3.5" fill="#38444e" stroke="#5a6872" strokeWidth=".5"/>
            {/* Forearm */}
            <path d="M65,515 Q58,540 62,567 Q64,580 73,586 L83,586 Q90,580 92,567 Q94,540 88,515 Z"
              fill="#d4dbe2" stroke="#b0bcc6" strokeWidth=".7"/>
            <path d="M78,518 Q76,540 77,565" fill="none" stroke={CABLE} strokeWidth="1.5" opacity=".3" strokeLinecap="round"/>

            {/* Neck from side */}
            <rect x="50" y="264" width="60" height="48" rx="8" fill="#38444e" stroke="#4a5560" strokeWidth=".8"/>
            <rect x="54" y="275" width="52" height="2" rx="1" fill="#4f5e6a" opacity=".4"/>
            <rect x="54" y="283" width="52" height="1.5" rx=".75" fill="#4f5e6a" opacity=".3"/>
            <rect x="44" y="271" width="8" height="34" rx="4" fill="#4a5560" stroke="#556570" strokeWidth=".5"/>
            <rect x="108" y="271" width="8" height="34" rx="4" fill="#4a5560" stroke="#556570" strokeWidth=".5"/>
            {/* Neck cable */}
            <path d="M72,268 Q70,282 72,302" fill="none" stroke={CABLE} strokeWidth="1.5" opacity=".25" strokeLinecap="round"/>
            <path d="M88,268 Q90,282 88,302" fill="none" stroke={CABLE} strokeWidth="1.5" opacity=".25" strokeLinecap="round"/>

            {/* Head from side — profile dome */}
            <path d="M38,290 Q18,270 18,210 Q18,150 48,120 Q78,100 108,118 Q132,140 132,178 L132,262 Q132,282 115,290 Z"
              fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1.2"/>
            {/* Dome highlight */}
            <path d="M50,130 Q78,108 102,125 Q120,142 120,168 Q80,150 48,168 Q45,150 50,130 Z"
              fill="#eaeff3" opacity=".45"/>
            {/* Centre ridge (profile) */}
            <path d="M75,108 L75,148" fill="none" stroke="#c0cad2" strokeWidth="1" opacity=".35"/>
            {/* Side seam */}
            <path d="M40,195 Q75,188 118,195" fill="none" stroke="#b8c2cc" strokeWidth=".5" opacity=".25"/>

            {/* Visor edge from side */}
            <path d="M120,164 Q138,175 138,198 L138,252 Q138,270 120,278 L114,278 Q128,268 128,252 L128,198 Q128,178 120,164 Z"
              fill="#0c1320" stroke="#3a4858" strokeWidth="1"/>
            <path d="M124,175 Q132,182 132,196 L132,202" fill="none" stroke="#fff" strokeWidth=".5" opacity=".06"/>
            {/* Cyan visor trim from side */}
            <path d="M120,270 Q128,268 128,252" fill="none" stroke={CYAN} strokeWidth=".6" opacity=".15"/>

            {/* Ear detail (circle on side of head) */}
            <circle cx="75" cy="225" r="10" fill="#eaeff3" stroke="#b8c2cc" strokeWidth=".8"/>
            <circle cx="75" cy="225" r="5" fill="#98a8b4" opacity=".4"/>
            <circle cx="75" cy="225" r="2" fill="#38444e" opacity=".5"/>
            {/* Side head panel */}
            <rect x="48" y="192" width="16" height="24" rx="3" fill="#eaeff3" stroke="#b8c2cc" strokeWidth=".8"/>
            <rect x="50" y="197" width="12" height="4" rx="1.5" fill="#9aa8b4" opacity=".4"/>
            <rect x="50" y="206" width="12" height="3" rx="1" fill="#9aa8b4" opacity=".3"/>

            {/* Chin from side */}
            <path d="M110,278 Q80,286 45,278" fill="none" stroke="#b0bcc6" strokeWidth="1"/>
            {/* Neck ring from side */}
            <ellipse cx="80" cy="296" rx="35" ry="5" fill="#38444e" stroke="#4a5560" strokeWidth=".5"/>
          </svg>
        </div>

        {/* ═══════════════════════════════════════════════
                      BACK FACE — rear view
           ═══════════════════════════════════════════════ */}
        <div style={{ ...face, transform: `rotateY(180deg) translateZ(${depth / 2}px)` }}>
          <svg viewBox="0 0 500 620" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Torso back (same silhouette) */}
            <path d="M155,590 L155,395 Q155,348 198,326 L218,316 Q250,302 282,316 L302,326 Q345,348 345,395 L345,590 Z"
              fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1"/>
            {/* Back panel */}
            <rect x="190" y="355" width="120" height="85" rx="8" fill="#eaeff3" stroke="#c5cdd4" strokeWidth="1"/>
            <rect x="200" y="365" width="100" height="65" rx="5" fill="#d4dbe2" stroke="#b8c2cc" strokeWidth=".8"/>
            <line x1="210" y1="385" x2="290" y2="385" stroke="#b8c2cc" strokeWidth=".5"/>
            <line x1="210" y1="405" x2="290" y2="405" stroke="#b8c2cc" strokeWidth=".4"/>
            {/* Spine cable channel */}
            <path d="M250,325 L250,585" fill="none" stroke={CABLE} strokeWidth="3.5" opacity=".35" strokeLinecap="round"/>
            <path d="M246,332 L246,580" fill="none" stroke={CABLE} strokeWidth="1" opacity=".15"/>
            <path d="M254,332 L254,580" fill="none" stroke={CABLE} strokeWidth="1" opacity=".15"/>
            {/* Side shadow strips */}
            <path d="M155,395 L155,478 L168,478 L168,390 Z" fill="#98a8b4" opacity=".35"/>
            <path d="M345,395 L345,478 L332,478 L332,390 Z" fill="#98a8b4" opacity=".35"/>
            {/* Seams */}
            <line x1="175" y1="456" x2="325" y2="456" stroke="#b8c2cc" strokeWidth=".7" opacity=".3"/>
            <line x1="180" y1="476" x2="320" y2="476" stroke="#b8c2cc" strokeWidth=".5" opacity=".2"/>
            <line x1="185" y1="496" x2="315" y2="496" stroke="#b8c2cc" strokeWidth=".5" opacity=".15"/>
            {/* Back vents */}
            <rect x="175" y="440" width="12" height="3" rx="1.5" fill="#98a8b4" opacity=".25"/>
            <rect x="175" y="450" width="12" height="3" rx="1.5" fill="#98a8b4" opacity=".25"/>
            <rect x="313" y="440" width="12" height="3" rx="1.5" fill="#98a8b4" opacity=".25"/>
            <rect x="313" y="450" width="12" height="3" rx="1.5" fill="#98a8b4" opacity=".25"/>
            {/* Collar ridge */}
            <path d="M196,330 Q250,310 304,330" fill="none" stroke="#cdd5dc" strokeWidth="2" strokeLinecap="round"/>

            {/* Shoulders (back) */}
            <ellipse cx="115" cy="382" rx="52" ry="44" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1"/>
            <ellipse cx="120" cy="372" rx="33" ry="23" fill="#eaeff3" opacity=".3"/>
            <ellipse cx="150" cy="382" rx="8" ry="19" fill="#38444e" opacity=".5"/>
            <circle cx="100" cy="390" r="5" fill="#b0bcc6" stroke="#9aa8b4" strokeWidth=".8"/>
            <path d="M78,360 Q115,340 150,360" fill="none" stroke="#b8c2cc" strokeWidth=".8" opacity=".4"/>

            <ellipse cx="385" cy="382" rx="52" ry="44" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1"/>
            <ellipse cx="380" cy="372" rx="33" ry="23" fill="#eaeff3" opacity=".3"/>
            <ellipse cx="350" cy="382" rx="8" ry="19" fill="#38444e" opacity=".5"/>
            <circle cx="400" cy="390" r="5" fill="#b0bcc6" stroke="#9aa8b4" strokeWidth=".8"/>
            <path d="M350,360 Q385,340 422,360" fill="none" stroke="#b8c2cc" strokeWidth=".8" opacity=".4"/>

            {/* Arms (back — same shape, simplified detail) */}
            <path d="M88,418 Q78,440 80,472 Q83,494 96,506 L106,506 Q116,494 114,472 Q112,444 120,422 Z" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth=".8"/>
            <path d="M100,424 Q96,450 97,480" fill="none" stroke={CABLE} strokeWidth="2" opacity=".3" strokeLinecap="round"/>
            <ellipse cx="97" cy="506" rx="15" ry="11" fill="#98a8b4" stroke="#a0adb8" strokeWidth=".8"/>
            <circle cx="97" cy="506" r="4" fill="#38444e" stroke="#5a6872" strokeWidth=".5"/>
            <path d="M82,516 Q75,540 78,565 Q80,578 90,585 L100,585 Q108,578 110,565 Q112,540 106,516 Z" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth=".7"/>

            <path d="M412,418 Q422,440 420,472 Q417,494 404,506 L394,506 Q384,494 386,472 Q388,444 380,422 Z" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth=".8"/>
            <path d="M400,424 Q404,450 403,480" fill="none" stroke={CABLE} strokeWidth="2" opacity=".3" strokeLinecap="round"/>
            <ellipse cx="403" cy="506" rx="15" ry="11" fill="#98a8b4" stroke="#a0adb8" strokeWidth=".8"/>
            <circle cx="403" cy="506" r="4" fill="#38444e" stroke="#5a6872" strokeWidth=".5"/>
            <path d="M418,516 Q425,540 422,565 Q420,578 410,585 L400,585 Q392,578 390,565 Q388,540 394,516 Z" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth=".7"/>

            {/* Neck (back) */}
            <rect x="222" y="264" width="56" height="48" rx="10" fill="#38444e" stroke="#4a5560" strokeWidth=".8"/>
            <rect x="226" y="274" width="48" height="2.5" rx="1.25" fill="#4f5e6a" opacity=".4"/>
            <rect x="226" y="282" width="48" height="2" rx="1" fill="#4f5e6a" opacity=".3"/>
            <rect x="216" y="271" width="8" height="34" rx="4" fill="#4a5560" stroke="#556570" strokeWidth=".5"/>
            <rect x="276" y="271" width="8" height="34" rx="4" fill="#4a5560" stroke="#556570" strokeWidth=".5"/>
            <path d="M238,268 Q236,282 238,302" fill="none" stroke={CABLE} strokeWidth="1.8" opacity=".25" strokeLinecap="round"/>
            <path d="M262,268 Q264,282 262,302" fill="none" stroke={CABLE} strokeWidth="1.8" opacity=".25" strokeLinecap="round"/>

            {/* Head from behind — smooth dome, no visor */}
            <path d="M172,268 Q172,138 250,100 Q328,138 328,268 Q328,287 310,296 L190,296 Q172,287 172,268 Z"
              fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1.2"/>
            <path d="M198,150 Q250,112 302,150 Q307,172 302,195 Q250,170 198,195 Q193,172 198,150 Z"
              fill="#eaeff3" opacity=".35"/>
            {/* Centre ridge continues full length on back */}
            <line x1="250" y1="108" x2="250" y2="290" stroke="#c0cad2" strokeWidth="1.5" opacity=".35"/>
            {/* Back head panel */}
            <rect x="210" y="175" width="80" height="55" rx="6" fill="#eaeff3" stroke="#c5cdd4" strokeWidth=".8"/>
            <rect x="220" y="185" width="60" height="35" rx="4" fill="#d4dbe2" stroke="#b8c2cc" strokeWidth=".8"/>
            <line x1="230" y1="198" x2="270" y2="198" stroke="#b8c2cc" strokeWidth=".5"/>
            <line x1="230" y1="208" x2="260" y2="208" stroke="#b8c2cc" strokeWidth=".4"/>
            {/* Side seams */}
            <path d="M185,155 Q185,200 188,250" fill="none" stroke="#b8c2cc" strokeWidth=".7" opacity=".3"/>
            <path d="M315,155 Q315,200 312,250" fill="none" stroke="#b8c2cc" strokeWidth=".7" opacity=".3"/>
            {/* Ear details (from back, partially visible) */}
            <circle cx="328" cy="230" r="8" fill="#eaeff3" stroke="#b8c2cc" strokeWidth=".8"/>
            <circle cx="328" cy="230" r="4" fill="#98a8b4" opacity=".4"/>
            <circle cx="172" cy="230" r="8" fill="#eaeff3" stroke="#b8c2cc" strokeWidth=".8"/>
            <circle cx="172" cy="230" r="4" fill="#98a8b4" opacity=".4"/>
            {/* Chin (back side) */}
            <path d="M200,274 Q250,285 300,274" fill="none" stroke="#b0bcc6" strokeWidth="1"/>
            {/* Neck ring */}
            <ellipse cx="250" cy="296" rx="40" ry="6" fill="#38444e" stroke="#4a5560" strokeWidth=".5"/>
            {/* Shoulder-to-chest seams */}
            <path d="M155,368 Q164,346 196,330" fill="none" stroke="#b8c2cc" strokeWidth="1" opacity=".4"/>
            <path d="M345,368 Q336,346 304,330" fill="none" stroke="#b8c2cc" strokeWidth="1" opacity=".4"/>
            {/* Joint rivets */}
            <circle cx="152" cy="382" r="5" fill="#38444e" stroke="#5a6872" strokeWidth=".8"/>
            <circle cx="348" cy="382" r="5" fill="#38444e" stroke="#5a6872" strokeWidth=".8"/>
          </svg>
        </div>

        {/* ═══════════════════════════════════════════════
                  LEFT SIDE FACE — mirrored profile
           ═══════════════════════════════════════════════ */}
        <div style={{ ...sideFace, transform: `rotateY(-90deg) translateZ(${w / 2}px)` }}>
          <svg viewBox="0 0 160 620" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ transform: 'scaleX(-1)' }}>
            {/* Same side profile, CSS-mirrored */}
            <path d="M25,590 L25,385 Q25,345 50,325 Q80,310 110,325 Q135,345 135,385 L135,590 Z" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1"/>
            <path d="M35,385 Q45,355 70,340 L100,335 Q115,350 115,385 L115,410 Q80,400 45,410 Z" fill="#eaeff3" opacity=".35"/>
            <rect x="85" y="380" width="35" height="60" rx="4" fill="#eaeff3" stroke="#c5cdd4" strokeWidth=".8"/>
            <line x1="92" y1="400" x2="115" y2="400" stroke="#b8c2cc" strokeWidth=".5"/>
            <line x1="92" y1="412" x2="110" y2="412" stroke="#b8c2cc" strokeWidth=".4"/>
            <line x1="32" y1="456" x2="128" y2="456" stroke="#b8c2cc" strokeWidth=".5" opacity=".3"/>
            <line x1="35" y1="476" x2="125" y2="476" stroke="#b8c2cc" strokeWidth=".4" opacity=".2"/>
            <rect x="30" y="408" width="10" height="2.5" rx="1.25" fill="#98a8b4" opacity=".3"/>
            <rect x="30" y="418" width="10" height="2.5" rx="1.25" fill="#98a8b4" opacity=".3"/>
            <rect x="30" y="428" width="10" height="2.5" rx="1.25" fill="#98a8b4" opacity=".3"/>
            <circle cx="120" cy="432" r="3" fill={CYAN} opacity=".35">
              <animate attributeName="opacity" values=".2;.5;.2" dur="3s" repeatCount="indefinite"/>
            </circle>
            <ellipse cx="80" cy="382" rx="35" ry="42" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1"/>
            <ellipse cx="75" cy="372" rx="20" ry="22" fill="#eaeff3" opacity=".35"/>
            <circle cx="80" cy="395" r="4" fill="#b0bcc6" stroke="#9aa8b4" strokeWidth=".8"/>
            <circle cx="80" cy="395" r="1.5" fill="#8896a2"/>
            <path d="M68,418 Q60,445 63,478 Q65,495 75,505 L85,505 Q90,495 88,478 Q86,445 92,418 Z" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth=".8"/>
            <path d="M78,422 Q76,445 77,478" fill="none" stroke={CABLE} strokeWidth="2" opacity=".35" strokeLinecap="round"/>
            <ellipse cx="78" cy="505" rx="12" ry="10" fill="#98a8b4" stroke="#a0adb8" strokeWidth=".8"/>
            <circle cx="78" cy="505" r="3.5" fill="#38444e" stroke="#5a6872" strokeWidth=".5"/>
            <path d="M65,515 Q58,540 62,567 Q64,580 73,586 L83,586 Q90,580 92,567 Q94,540 88,515 Z" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth=".7"/>
            <path d="M78,518 Q76,540 77,565" fill="none" stroke={CABLE} strokeWidth="1.5" opacity=".3" strokeLinecap="round"/>
            <rect x="50" y="264" width="60" height="48" rx="8" fill="#38444e" stroke="#4a5560" strokeWidth=".8"/>
            <rect x="54" y="275" width="52" height="2" rx="1" fill="#4f5e6a" opacity=".4"/>
            <rect x="54" y="283" width="52" height="1.5" rx=".75" fill="#4f5e6a" opacity=".3"/>
            <rect x="44" y="271" width="8" height="34" rx="4" fill="#4a5560" stroke="#556570" strokeWidth=".5"/>
            <rect x="108" y="271" width="8" height="34" rx="4" fill="#4a5560" stroke="#556570" strokeWidth=".5"/>
            <path d="M72,268 Q70,282 72,302" fill="none" stroke={CABLE} strokeWidth="1.5" opacity=".25" strokeLinecap="round"/>
            <path d="M88,268 Q90,282 88,302" fill="none" stroke={CABLE} strokeWidth="1.5" opacity=".25" strokeLinecap="round"/>
            <path d="M38,290 Q18,270 18,210 Q18,150 48,120 Q78,100 108,118 Q132,140 132,178 L132,262 Q132,282 115,290 Z" fill="#d4dbe2" stroke="#b0bcc6" strokeWidth="1.2"/>
            <path d="M50,130 Q78,108 102,125 Q120,142 120,168 Q80,150 48,168 Q45,150 50,130 Z" fill="#eaeff3" opacity=".45"/>
            <path d="M75,108 L75,148" fill="none" stroke="#c0cad2" strokeWidth="1" opacity=".35"/>
            <path d="M40,195 Q75,188 118,195" fill="none" stroke="#b8c2cc" strokeWidth=".5" opacity=".25"/>
            <path d="M120,164 Q138,175 138,198 L138,252 Q138,270 120,278 L114,278 Q128,268 128,252 L128,198 Q128,178 120,164 Z" fill="#0c1320" stroke="#3a4858" strokeWidth="1"/>
            <path d="M124,175 Q132,182 132,196 L132,202" fill="none" stroke="#fff" strokeWidth=".5" opacity=".06"/>
            <path d="M120,270 Q128,268 128,252" fill="none" stroke={CYAN} strokeWidth=".6" opacity=".15"/>
            <circle cx="75" cy="225" r="10" fill="#eaeff3" stroke="#b8c2cc" strokeWidth=".8"/>
            <circle cx="75" cy="225" r="5" fill="#98a8b4" opacity=".4"/>
            <circle cx="75" cy="225" r="2" fill="#38444e" opacity=".5"/>
            <rect x="48" y="192" width="16" height="24" rx="3" fill="#eaeff3" stroke="#b8c2cc" strokeWidth=".8"/>
            <rect x="50" y="197" width="12" height="4" rx="1.5" fill="#9aa8b4" opacity=".4"/>
            <rect x="50" y="206" width="12" height="3" rx="1" fill="#9aa8b4" opacity=".3"/>
            <path d="M110,278 Q80,286 45,278" fill="none" stroke="#b0bcc6" strokeWidth="1"/>
            <ellipse cx="80" cy="296" rx="35" ry="5" fill="#38444e" stroke="#4a5560" strokeWidth=".5"/>
          </svg>
        </div>

      </motion.div>

      {/* ground reflection */}
      <motion.div
        animate={{ opacity: [0.08, 0.22, 0.08], scaleX: [0.82, 1.06, 0.82] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', bottom: '-5%', left: '50%', transform: 'translateX(-50%)',
          width: w * 0.45, height: 18,
          background: `radial-gradient(ellipse, ${CYAN}15 0%, transparent 70%)`,
          filter: 'blur(10px)', pointerEvents: 'none',
        }}
      />

      {/* floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -(10 + Math.random() * 22), 0],
            x: [0, (Math.random() - 0.5) * 14, 0],
            opacity: [0, 0.25 + Math.random() * 0.18, 0],
          }}
          transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: i * 1.1, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: `${22 + Math.random() * 56}%`,
            top:  `${22 + Math.random() * 42}%`,
            width: 2 + Math.random() * 2, height: 2 + Math.random() * 2,
            borderRadius: '50%', background: CYAN,
            boxShadow: `0 0 4px ${CYAN}28`,
            pointerEvents: 'none', zIndex: 3,
          }}
        />
      ))}
    </div>
  );
};

export default AITeacherRobot;
