import { z } from 'zod'

import { packSchema } from '@/packs/schema'

import { LEVELS, type Level } from './levels'

export { LEVELS, type Level }
export const LevelSchema = z.enum(LEVELS)

export const KanjiItemSchema = z.object({
  id: z.string().regex(/^k:.$/u),
  char: z.string().length(1),
  level: LevelSchema,
  on: z.array(z.string()),
  kun: z.array(z.string()),
  meanings: z.array(z.string()).min(1),
  strokes: z.number().int().positive(),
  grade: z.number().int().nullable(),
  radical: z.number().int(),
  /** KANJIDIC2 newspaper frequency rank (1 = most frequent), when present. */
  freq: z.number().int().nullable(),
  /** Visual components from KRADFILE, in the file's order. */
  components: z.array(z.string()),
})
export type KanjiItem = z.infer<typeof KanjiItemSchema>

export const StrokeGroupSchema: z.ZodType<StrokeGroup> = z.lazy(() =>
  z.object({
    element: z.string().optional(),
    position: z.string().optional(),
    radical: z.string().optional(),
    /** Indices into the stroke list, in drawing order. */
    strokes: z.array(z.number().int().nonnegative()),
    children: z.array(StrokeGroupSchema),
  }),
)
export interface StrokeGroup {
  element?: string | undefined
  position?: string | undefined
  radical?: string | undefined
  strokes: number[]
  children: StrokeGroup[]
}
export const StrokeItemSchema = z.object({
  id: z.string(),
  char: z.string().length(1),
  /** SVG path data in a 109×109 box, drawing order. */
  strokes: z.array(z.object({ d: z.string(), type: z.string().optional() })).min(1),
  /** Stroke-number label positions, one per stroke. */
  numbers: z.array(z.tuple([z.number(), z.number()])),
  groups: z.array(StrokeGroupSchema),
})
export type StrokeItem = z.infer<typeof StrokeItemSchema>

export const SentenceItemSchema = z.object({
  /** `s:<tatoeba id>` */
  id: z.string().regex(/^s:\d+$/),
  tatoebaId: z.number().int().positive(),
  jp: z.string().min(1),
  en: z.string().min(1),
  /** Vocab item this sentence illustrates. */
  word: z.string().regex(/^v:\d+$/),
  /** The inflected form of the word as it appears in the sentence. */
  form: z.string(),
  contributor: z.string(),
  audio: z
    .object({
      id: z.number().int().positive(),
      file: z.string(),
      speaker: z.string(),
      licence: z.string(),
    })
    .optional(),
})
export type SentenceItem = z.infer<typeof SentenceItemSchema>
export const StrokePackSchema = packSchema(StrokeItemSchema)
export const SentencePackSchema = packSchema(SentenceItemSchema)

export const VocabFormSchema = z.object({ text: z.string().min(1), common: z.boolean() })
export const VocabReadingSchema = z.object({
  text: z.string().min(1),
  common: z.boolean(),
  /** JMdict re_restr: this reading applies only to these kanji forms. */
  restrictTo: z.array(z.string()).optional(),
})
export const VocabSenseSchema = z.object({
  gloss: z.array(z.string()).min(1),
  pos: z.array(z.string()),
  misc: z.array(z.string()),
})
export const VocabItemSchema = z.object({
  id: z.string().regex(/^v:\d+$/),
  seq: z.number().int().positive(),
  level: LevelSchema,
  forms: z.array(VocabFormSchema),
  readings: z.array(VocabReadingSchema).min(1),
  senses: z.array(VocabSenseSchema).min(1),
  /** Distinct kanji characters used across the written forms. */
  kanji: z.array(z.string().length(1)),
  /** 0 = no JMdict priority marker; 1 = *2 markers; 2 = *1 markers (most common). */
  priority: z.number().int().min(0).max(2),
})
export type VocabItem = z.infer<typeof VocabItemSchema>

export const KanjiPackSchema = packSchema(KanjiItemSchema)
export const VocabPackSchema = packSchema(VocabItemSchema)
export type KanjiPack = z.infer<typeof KanjiPackSchema>
export type VocabPack = z.infer<typeof VocabPackSchema>
