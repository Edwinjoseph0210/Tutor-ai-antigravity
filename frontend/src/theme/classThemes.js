/**
 * Class-level theme configurations.
 * Changes the entire visual atmosphere based on class/grade level.
 */

export const classThemes = {
  1: {
    id: 1, label: 'Class 1',
    personality: 'playful',
    bgGradient: 'linear-gradient(160deg, #1a0a2e 0%, #2d1854 30%, #1a1145 60%, #0d1b3a 100%)',
    accentPrimary: '#f472b6',    // pink
    accentSecondary: '#fbbf24',  // yellow
    accentTertiary: '#34d399',   // green
    cardBg: 'rgba(244,114,182,0.06)',
    cardBorder: 'rgba(244,114,182,0.12)',
    buttonGradient: 'linear-gradient(135deg, #ec4899, #f472b6, #fbbf24)',
    particleColors: ['#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#c084fc'],
    stageGlow: '#f472b6',
    fontScale: 1.15,      // larger text for young students
    borderRadius: 24,     // very rounded
    animationIntensity: 1.5, // more motion
    shapes: ['circle', 'star', 'heart', 'cloud'],
    floatingEmoji: ['🌟', '🎨', '🦋', '🌈', '🎵', '🐾'],
  },
  3: {
    id: 3, label: 'Class 3',
    personality: 'colorful',
    bgGradient: 'linear-gradient(160deg, #0f0a2e 0%, #1a1854 30%, #181040 60%, #0a1a3a 100%)',
    accentPrimary: '#818cf8',    // indigo
    accentSecondary: '#f472b6',  // pink
    accentTertiary: '#34d399',   // green
    cardBg: 'rgba(129,140,248,0.06)',
    cardBorder: 'rgba(129,140,248,0.12)',
    buttonGradient: 'linear-gradient(135deg, #6366f1, #818cf8, #f472b6)',
    particleColors: ['#818cf8', '#f472b6', '#34d399', '#fbbf24'],
    stageGlow: '#818cf8',
    fontScale: 1.1,
    borderRadius: 20,
    animationIntensity: 1.3,
    shapes: ['circle', 'star', 'diamond', 'hexagon'],
    floatingEmoji: ['⚡', '🎯', '🔬', '🌍', '📐'],
  },
  5: {
    id: 5, label: 'Class 5',
    personality: 'educational',
    bgGradient: 'linear-gradient(160deg, #0d0a1e 0%, #161045 30%, #141038 60%, #0d1b2a 100%)',
    accentPrimary: '#a78bfa',    // purple
    accentSecondary: '#60a5fa',  // blue
    accentTertiary: '#34d399',   // green
    cardBg: 'rgba(167,139,250,0.05)',
    cardBorder: 'rgba(167,139,250,0.1)',
    buttonGradient: 'linear-gradient(135deg, #7c3aed, #a78bfa, #60a5fa)',
    particleColors: ['#a78bfa', '#60a5fa', '#34d399'],
    stageGlow: '#a78bfa',
    fontScale: 1.05,
    borderRadius: 18,
    animationIntensity: 1.0,
    shapes: ['circle', 'hexagon', 'diamond'],
    floatingEmoji: [],
  },
  8: {
    id: 8, label: 'Class 8',
    personality: 'structured',
    bgGradient: 'linear-gradient(160deg, #0a0a1e 0%, #121040 30%, #0f0d32 60%, #0a1525 100%)',
    accentPrimary: '#8b5cf6',    // violet
    accentSecondary: '#3b82f6',  // blue
    accentTertiary: '#10b981',   // emerald
    cardBg: 'rgba(139,92,246,0.04)',
    cardBorder: 'rgba(139,92,246,0.08)',
    buttonGradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    particleColors: ['#8b5cf6', '#3b82f6', '#10b981'],
    stageGlow: '#8b5cf6',
    fontScale: 1.0,
    borderRadius: 16,
    animationIntensity: 0.8,
    shapes: ['hexagon', 'line'],
    floatingEmoji: [],
  },
  10: {
    id: 10, label: 'Class 10',
    personality: 'focused',
    bgGradient: 'linear-gradient(160deg, #080818 0%, #0e0d2e 30%, #0c0b28 60%, #081420 100%)',
    accentPrimary: '#7c3aed',    // deep purple
    accentSecondary: '#2563eb',  // deep blue
    accentTertiary: '#059669',   // dark emerald
    cardBg: 'rgba(124,58,237,0.03)',
    cardBorder: 'rgba(124,58,237,0.07)',
    buttonGradient: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
    particleColors: ['#7c3aed', '#2563eb'],
    stageGlow: '#7c3aed',
    fontScale: 0.95,
    borderRadius: 14,
    animationIntensity: 0.6,
    shapes: ['line', 'dot'],
    floatingEmoji: [],
  },
  12: {
    id: 12, label: 'Class 12',
    personality: 'minimal',
    bgGradient: 'linear-gradient(160deg, #050510 0%, #0a0a22 30%, #080820 60%, #050d18 100%)',
    accentPrimary: '#6d28d9',    // deep violet
    accentSecondary: '#1d4ed8',  // navy
    accentTertiary: '#047857',   // dark green
    cardBg: 'rgba(109,40,217,0.025)',
    cardBorder: 'rgba(109,40,217,0.06)',
    buttonGradient: 'linear-gradient(135deg, #5b21b6, #6d28d9)',
    particleColors: ['#6d28d9', '#1d4ed8'],
    stageGlow: '#6d28d9',
    fontScale: 0.92,
    borderRadius: 12,
    animationIntensity: 0.4,
    shapes: ['line'],
    floatingEmoji: [],
  },
};

/** Default theme when class level is unknown */
export const defaultClassTheme = classThemes[5];

/** Get theme by class number, with fallback */
export function getClassTheme(classLevel) {
  const num = parseInt(classLevel, 10);
  return classThemes[num] || defaultClassTheme;
}
