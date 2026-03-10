/**
 * Subject theme configurations.
 * Controls environment visuals, colors, and floating elements per subject.
 */

export const subjectThemes = {
  Mathematics: {
    accent: '#667eea',
    accentLight: '#818cf8',
    icon: 'fa-square-root-alt',
    gradient: 'linear-gradient(135deg, #667eea, #818cf8)',
    bgTint: 'rgba(102,126,234,0.04)',
    symbols: ['∑', 'π', '∫', 'Δ', '∞', 'dy/dx', 'f(x)', '√', '∂', 'λ'],
    label: 'Mathematics',
  },
  Physics: {
    accent: '#f56565',
    accentLight: '#fc8181',
    icon: 'fa-atom',
    gradient: 'linear-gradient(135deg, #f56565, #fc8181)',
    bgTint: 'rgba(245,101,101,0.04)',
    symbols: ['E=mc²', 'F=ma', 'λ', 'ℏ', 'Ω', 'v=fλ', '⚡', '∿'],
    label: 'Physics',
  },
  Chemistry: {
    accent: '#48bb78',
    accentLight: '#68d391',
    icon: 'fa-flask',
    gradient: 'linear-gradient(135deg, #48bb78, #68d391)',
    bgTint: 'rgba(72,187,120,0.04)',
    symbols: ['H₂O', 'NaCl', 'CO₂', 'pH', '⬡', 'mol', 'C₆H₁₂O₆', '→'],
    label: 'Chemistry',
  },
  Biology: {
    accent: '#ed8936',
    accentLight: '#fbd38d',
    icon: 'fa-dna',
    gradient: 'linear-gradient(135deg, #ed8936, #fbd38d)',
    bgTint: 'rgba(237,137,54,0.04)',
    symbols: ['DNA', 'RNA', 'ATP', '🧬', '🔬', '◯', '⬣'],
    label: 'Biology',
  },
  'Computer Science': {
    accent: '#4299e1',
    accentLight: '#63b3ed',
    icon: 'fa-code',
    gradient: 'linear-gradient(135deg, #4299e1, #63b3ed)',
    bgTint: 'rgba(66,153,225,0.04)',
    symbols: ['</>',  '{…}', '01', 'fn()', 'if', '>>>', '0x', '&&'],
    label: 'Computer Science',
  },
  History: {
    accent: '#d69e2e',
    accentLight: '#ecc94b',
    icon: 'fa-landmark',
    gradient: 'linear-gradient(135deg, #d69e2e, #ecc94b)',
    bgTint: 'rgba(214,158,46,0.04)',
    symbols: ['⚔', '🏛', '📜', '⏳', '1776', '1945', '●──●'],
    label: 'History',
  },
  Geography: {
    accent: '#38b2ac',
    accentLight: '#4fd1c5',
    icon: 'fa-globe-americas',
    gradient: 'linear-gradient(135deg, #38b2ac, #4fd1c5)',
    bgTint: 'rgba(56,178,172,0.04)',
    symbols: ['🌍', '🗺', '🧭', '⬡', '↗', '△'],
    label: 'Geography',
  },
  English: {
    accent: '#9f7aea',
    accentLight: '#b794f4',
    icon: 'fa-book',
    gradient: 'linear-gradient(135deg, #9f7aea, #b794f4)',
    bgTint: 'rgba(159,122,234,0.04)',
    symbols: ['Aa', '✎', '📖', '"…"', '¶', 'ABC'],
    label: 'English',
  },
};

export const defaultSubjectTheme = {
  accent: '#9f7aea',
  accentLight: '#b794f4',
  icon: 'fa-brain',
  gradient: 'linear-gradient(135deg, #9f7aea, #b794f4)',
  bgTint: 'rgba(159,122,234,0.04)',
  symbols: ['✦', '◈', '⟡', '◉'],
  label: 'General',
};

export function getSubjectTheme(subject) {
  return subjectThemes[subject] || defaultSubjectTheme;
}
