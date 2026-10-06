/** WCAG 2.x relative luminance and contrast ratio for #rrggbb colours. */
export function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(value)) throw new Error(`expected #rrggbb, got ${hex}`)
  const channel = (i: number) => {
    const c = Number.parseInt(value.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}
