import { z } from 'zod'

/**
 * Language-agnostic pack envelope. A language profile (see ./ja) supplies the item schema;
 * the study engine only ever sees item ids and card types, never item contents.
 */
export const PackMetaSchema = z.object({
  language: z.string().min(2),
  kind: z.string().min(1),
  level: z.string().optional(),
  generated: z.string().datetime(),
  /** Path of the provenance manifest that describes this file. */
  provenance: z.string(),
})
export type PackMeta = z.infer<typeof PackMetaSchema>

export function packSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ meta: PackMetaSchema, items: z.array(item) })
}

export const PackIndexSchema = z.object({
  language: z.string(),
  generated: z.string().datetime(),
  levels: z.array(z.string()),
  files: z.record(z.string(), z.record(z.string(), z.string())),
  counts: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
})
export type PackIndex = z.infer<typeof PackIndexSchema>

export const ProvenanceSchema = z.object({
  generated: z.string().datetime(),
  sources: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      url: z.string(),
      homepage: z.string(),
      licence: z.object({ name: z.string(), url: z.string(), notes: z.string().optional() }),
      attribution: z.string(),
      file: z.string(),
      sha256: z.string(),
      bytes: z.number().int(),
      downloadedAt: z.string(),
      lastModified: z.string().nullable(),
    }),
  ),
  files: z.array(
    z.object({
      path: z.string(),
      kind: z.string(),
      level: z.string().optional(),
      records: z.number().int(),
      sha256: z.string(),
      bytes: z.number().int(),
      sources: z.array(z.string()),
      transform: z.string(),
    }),
  ),
})
export type Provenance = z.infer<typeof ProvenanceSchema>
