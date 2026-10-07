import { useSettings } from '@/app/study/settings'

/** full: everything. gentle: gold and soft sound only. off: no animation (reduce-motion). */
export type MotionTier = 'full' | 'gentle' | 'off'

export function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function motionTier(): MotionTier {
  if (reducedMotion()) return 'off'
  return useSettings.getState().settings.motion === 'gentle' ? 'gentle' : 'full'
}
