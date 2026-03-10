/**
 * ═══════════════════════════════════════════════════════════════════
 *  Senku AI — Unified Design System
 *  All pages MUST import tokens from here for visual consistency.
 * ═══════════════════════════════════════════════════════════════════
 */

/* ── Color Palette ──────────────────────────────────────────────── */
export const COLORS = {
  // Primary accents
  teal:        '#14b8a6',
  tealDim:     '#0d9488',
  cyan:        '#06b6d4',
  blue:        '#3b82f6',
  indigo:      '#6366f1',
  violet:      '#8b5cf6',
  emerald:     '#10b981',
  amber:       '#f59e0b',
  rose:        '#f43f5e',

  // Backgrounds
  bgDeep:      '#03080e',
  bgCard:      'rgba(255,255,255,0.03)',
  bgCardHover: 'rgba(255,255,255,0.06)',
  bgInput:     'rgba(255,255,255,0.05)',

  // Borders
  border:      'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',
  borderTeal:  'rgba(20,184,166,0.15)',

  // Text
  textPrimary:   '#ffffff',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted:     'rgba(255,255,255,0.35)',
  textDim:       'rgba(255,255,255,0.25)',
};

/* ── Typography ─────────────────────────────────────────────────── */
export const FONTS = {
  heading: "'Sora', 'Inter', system-ui, -apple-system, sans-serif",
  body:    "'Inter', system-ui, -apple-system, sans-serif",
};

export const FONT_SIZES = {
  xs:   '0.72rem',
  sm:   '0.82rem',
  base: '0.92rem',
  md:   '1rem',
  lg:   '1.15rem',
  xl:   '1.35rem',
  '2xl': '1.65rem',
  '3xl': '2.2rem',
  '4xl': '3rem',
};

/* ── Spacing ────────────────────────────────────────────────────── */
export const SPACING = {
  xs:   '0.35rem',
  sm:   '0.5rem',
  md:   '0.75rem',
  lg:   '1rem',
  xl:   '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem',
  '4xl': '4rem',
};

/* ── Shadows ────────────────────────────────────────────────────── */
export const SHADOWS = {
  card:   '0 4px 24px rgba(0,0,0,0.25)',
  glow:   (color) => `0 4px 24px ${color}40`,
  button: (color) => `0 4px 20px ${color}40`,
  nav:    '0 4px 30px rgba(0,0,0,0.35), 0 1px 0 rgba(20,184,166,0.08) inset',
};

/* ── Shared Inline Styles ───────────────────────────────────────── */

/** Navigation bar style */
export const navStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0.9rem 3.5rem',
  position: 'fixed', top: 0, left: 0, right: 0,
  zIndex: 100,
  background: 'linear-gradient(135deg, rgba(6,20,36,0.88) 0%, rgba(10,30,50,0.85) 40%, rgba(8,38,48,0.82) 100%)',
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
  borderBottom: `1px solid rgba(20,184,166,0.12)`,
  boxShadow: SHADOWS.nav,
};

/** Standard page container (below fixed nav) */
export const pageContainer = {
  maxWidth: 1320,
  margin: '0 auto',
  padding: '6.5rem 3rem 3rem',
};

/** Standard card */
export const cardStyle = {
  background: COLORS.bgCard,
  borderRadius: 18,
  border: `1px solid ${COLORS.border}`,
  padding: '1.5rem',
  transition: 'all 0.3s ease',
};

export const cardHoverStyle = {
  background: COLORS.bgCardHover,
  border: `1px solid ${COLORS.borderLight}`,
  transform: 'translateY(-2px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
};

/** Standard input */
export const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.85rem',
  borderRadius: 10,
  border: `1px solid ${COLORS.borderLight}`,
  background: COLORS.bgInput,
  color: 'white',
  fontSize: FONT_SIZES.base,
  fontFamily: FONTS.body,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.3s',
};

/** Standard select (same as input) */
export const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: '2.2rem',
};

/** Standard select option styling */
export const optionStyle = {
  background: '#0f1a2e',
  color: 'white',
};

/** Primary teal button */
export const btnPrimary = {
  background: `linear-gradient(135deg, ${COLORS.tealDim}, ${COLORS.teal})`,
  border: 'none',
  borderRadius: 12,
  padding: '0.65rem 1.5rem',
  color: '#fff',
  fontSize: FONT_SIZES.base,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: FONTS.heading,
  boxShadow: SHADOWS.button(COLORS.teal),
  transition: 'all 0.3s',
};

/** Ghost / outline button */
export const btnGhost = {
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${COLORS.borderLight}`,
  borderRadius: 10,
  padding: '0.55rem 1.1rem',
  color: 'white',
  fontSize: FONT_SIZES.sm,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: FONTS.heading,
  transition: 'all 0.3s',
};

/** Danger / red button */
export const btnDanger = {
  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
  border: 'none',
  borderRadius: 10,
  padding: '0.55rem 1.1rem',
  color: '#fff',
  fontSize: FONT_SIZES.sm,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.3s',
};

/** Page title */
export const pageTitleStyle = {
  fontSize: FONT_SIZES['2xl'],
  fontWeight: 800,
  letterSpacing: '-0.5px',
  fontFamily: FONTS.heading,
  margin: 0,
  background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.7))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

/** Page subtitle */
export const pageSubtitle = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.textMuted,
  fontWeight: 500,
  marginTop: 2,
};

/** Section heading */
export const sectionTitle = {
  fontSize: FONT_SIZES.lg,
  fontWeight: 700,
  letterSpacing: '-0.3px',
  fontFamily: FONTS.heading,
  color: COLORS.textPrimary,
  margin: 0,
};

/** Label */
export const labelStyle = {
  display: 'block',
  marginBottom: SPACING.xs,
  color: COLORS.textSecondary,
  fontSize: FONT_SIZES.xs,
  fontWeight: 600,
};

/** Badge / tag */
export const badgeStyle = (color = COLORS.teal) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: '0.7rem',
  fontWeight: 700,
  background: `${color}18`,
  color: color,
  border: `1px solid ${color}25`,
});

/** Empty state */
export const emptyState = {
  textAlign: 'center',
  padding: '3rem 1.5rem',
  color: COLORS.textMuted,
  fontSize: FONT_SIZES.base,
};

/** Table styles */
export const tableWrap = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
};

export const thStyle = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  color: COLORS.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: `1px solid ${COLORS.border}`,
};

export const tdStyle = {
  padding: '0.85rem 1rem',
  fontSize: FONT_SIZES.sm,
  borderBottom: `1px solid ${COLORS.border}`,
  color: COLORS.textSecondary,
};

/** Modal / overlay backdrop */
export const modalBackdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

export const modalContent = {
  background: 'linear-gradient(135deg, #0a1628, #0f1e36)',
  borderRadius: 20,
  border: `1px solid ${COLORS.borderLight}`,
  padding: '2rem',
  width: '100%',
  maxWidth: 520,
  maxHeight: '85vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};

/** Success message toast */
export const successToast = {
  position: 'fixed',
  top: 90,
  right: 24,
  background: 'linear-gradient(135deg, #065f46, #047857)',
  color: '#6ee7b7',
  padding: '0.75rem 1.25rem',
  borderRadius: 12,
  fontWeight: 600,
  fontSize: FONT_SIZES.sm,
  zIndex: 1100,
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  border: '1px solid rgba(16,185,129,0.3)',
};

/** Stat card (small metric display) */
export const statCard = (accent = COLORS.teal) => ({
  ...cardStyle,
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '1.25rem 1.5rem',
});

export const statIcon = (accent = COLORS.teal) => ({
  width: 42,
  height: 42,
  borderRadius: 12,
  background: `${accent}15`,
  border: `1px solid ${accent}25`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: accent,
  flexShrink: 0,
});

export const statValue = {
  fontSize: FONT_SIZES.xl,
  fontWeight: 800,
  color: COLORS.textPrimary,
  fontFamily: FONTS.heading,
  lineHeight: 1,
};

export const statLabel = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.textMuted,
  fontWeight: 500,
  marginTop: 2,
};

/* ── Shared Navbar Component Helper ─────────────────────────────── */
export const navLinkStyle = (active = false, accent = COLORS.teal) => ({
  background: active ? `${accent}15` : 'transparent',
  border: active ? `1px solid ${accent}30` : '1px solid transparent',
  borderRadius: 10,
  padding: '8px 20px',
  color: active ? accent : 'rgba(255,255,255,0.5)',
  fontSize: FONT_SIZES.base,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s',
  fontFamily: FONTS.heading,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});

export const logoStyle = {
  fontWeight: 800,
  fontSize: FONT_SIZES.xl,
  letterSpacing: '-0.3px',
  fontFamily: FONTS.heading,
  background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.7))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

export const logoIcon = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: `linear-gradient(135deg, ${COLORS.tealDim}, ${COLORS.teal})`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: `0 4px 24px ${COLORS.teal}50`,
};
