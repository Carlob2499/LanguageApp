/** JLPT levels, easiest first. Kept zod-free so UI code can import it without the schema bundle. */
export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
export type Level = (typeof LEVELS)[number]
