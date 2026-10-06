import type { SVGProps } from 'react'

/**
 * Kintsugi's icon set: single-stroke, brush-weight glyphs drawn in code. Every icon is 24×24,
 * stroke-based so it inherits `currentColor`, and decorative unless given a title.
 */
export type IconName =
  | 'today'
  | 'library'
  | 'progress'
  | 'sources'
  | 'close'
  | 'undo'
  | 'speaker'
  | 'strokes'
  | 'parts'
  | 'sentence'
  | 'check'
  | 'crack'
  | 'spark'
  | 'chevron'
  | 'settings'
  | 'keyboard'

const PATHS: Record<IconName, string> = {
  // A vessel with a gold seam: today's repair.
  today: 'M7 4h10l1 4c0 5-2 9-6 12C8 17 6 13 6 8l1-4Zm3 5c1 2 2 2 3 3s1 3 2 4',
  // A shelf with three tiles.
  library: 'M4 7h4v10H4zM10 5h4v12h-4zM16 9h4v8h-4zM3 20h18',
  // Three seams fanning out.
  progress: 'M4 20c3-4 4-8 5-14M9 20c3-3 5-6 8-13M14 20c2-2 4-4 6-7',
  // A hanko seal.
  sources: 'M6 6h12v12H6zM9 9h2v6H9zM13 9h2v2h-2zM13 13h2v2h-2z',
  close: 'M6 6l12 12M18 6L6 18',
  undo: 'M9 14 4 9l5-5M4 9h9a6 6 0 0 1 0 12h-2',
  speaker: 'M4 10v4h3l5 4V6L7 10H4Zm12-2c1.5 1.5 1.5 6.5 0 8m3-11c3 3 3 11 0 14',
  strokes: 'M4 18c4-1 6-3 7-6 1-2 3-7 6-9M5 20c3 0 5-2 6-4',
  parts: 'M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z',
  sentence: 'M4 7h16M4 12h12M4 17h8',
  check: 'M5 12l4 4L19 7',
  crack: 'M12 3l-2 6 3 3-2 5 2 4',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5',
  chevron: 'M9 6l6 6-6 6',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2 2m-7 7-2 2m0-11 2 2m7 7 2 2',
  keyboard: 'M3 7h18v10H3zM6 10h2M10 10h2M14 10h2M18 10h0M7 14h10',
}

export function Icon({
  name,
  size = 24,
  title,
  strokeWidth = 1.75,
  ...rest
}: SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number
  title?: string
  strokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  )
}
