import { useMemo } from 'react'

import styles from './Grain.module.css'

/** A static film-grain tile, generated once on a tiny canvas and tiled by CSS. Never animated. */
export function Grain() {
  const url = useMemo(() => {
    if (typeof document === 'undefined') return ''
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    const image = ctx.createImageData(size, size)
    let seed = 7
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647
      const v = 200 + (seed % 56)
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v
      image.data[i + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    return canvas.toDataURL('image/png')
  }, [])
  if (!url) return null
  return (
    <div className={styles.grain} style={{ backgroundImage: `url(${url})` }} aria-hidden="true" />
  )
}
