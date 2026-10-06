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
})
export type KanjiItem = z.infer<typeof KanjiItemSchema>

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
