/** Status tones: green and yellow exist only as status colours. */
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

/** Tones of a label chip: the status tones plus two hue-free weights. */
export type BadgeTone = StatusTone | 'info' | 'emphasis'
