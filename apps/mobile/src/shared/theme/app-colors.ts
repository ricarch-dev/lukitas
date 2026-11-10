export const AUTH_COLORS = {
  canvas: '#F1F5F4',
  surface: '#FFFFFF',
  ink: '#192D30',
  body: '#334A4E',
  muted: '#52696D',
  primary: '#005864',
  primaryPressed: '#004751',
  disabled: '#4C696D',
  border: '#D8E2DF',
  fieldBorder: '#71868A',
  error: '#A12F24',
  errorSurface: '#FFF1EE',
  segmentSurface: '#EAF0EE',
} as const;

export const APP_COLORS = {
  ...AUTH_COLORS,
  softSurface: '#EAF4FF',
  subtleSurface: AUTH_COLORS.segmentSurface,
  warning: '#795200',
  warningSurface: '#FFF6DF',
  income: '#005864',
  expense: '#A12F24',
} as const;
