/**
 * Kontafy brand color palette.
 */
export const Colors = {
  /** Primary navy */
  navy: '#0F2D5E',
  /** Accent green */
  green: '#0A8A54',
  /** Surface / background */
  surface: '#F8F9FB',
  /** Primary text */
  ink: '#1A1A2E',
  /** Secondary / muted text */
  muted: '#64748B',
  /** White */
  white: '#FFFFFF',
  /** Dividers and borders */
  border: '#E2E8F0',
  /** Light green tint for success badges */
  greenLight: '#ECFDF5',
  /** Error / overdue */
  red: '#DC2626',
  redLight: '#FEF2F2',
  /** Warning / draft */
  amber: '#D97706',
  amberLight: '#FFFBEB',
  /** Info / sent */
  blue: '#2563EB',
  blueLight: '#EFF6FF',
} as const;

export type ColorName = keyof typeof Colors;
