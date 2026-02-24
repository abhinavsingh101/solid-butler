import { z } from 'zod'

const generatedItemSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(280).optional(),
  suggestedDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  suggestedAssignee: z.string().trim().min(2).max(64).optional(),
})

type GeneratedItem = z.infer<typeof generatedItemSchema>

export function buildSituationTitle(rawInput: string, providedTitle?: string | null): string {
  const candidate = (providedTitle ?? '').trim()
  if (candidate.length >= 2) {
    return candidate.slice(0, 120)
  }

  const firstSentence = rawInput
    .trim()
    .split(/[.!?\n]/)
    .map((segment) => segment.trim())
    .find((segment) => segment.length > 0)

  if (firstSentence) {
    return firstSentence.slice(0, 120)
  }

  return 'Special Situation'
}

export function normalizeGeneratedItems(rawItems: unknown[], eventDate: Date | null): GeneratedItem[] {
  const validated = rawItems
    .map((item) => generatedItemSchema.safeParse(item))
    .filter((result): result is { success: true; data: GeneratedItem } => result.success)
    .map((result) => result.data)
    .slice(0, 15)

  if (validated.length > 0) {
    return validated
  }

  return getDefaultGeneratedItems(eventDate)
}

export function parseSuggestedDueDate(dateText: string | undefined): Date | null {
  if (!dateText) return null
  const parsed = new Date(`${dateText}T09:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function buildHouseholdHistoryContext(params: {
  memorySummaries: Array<{ summaryText: string; summaryType: string }>
  contextSummaries: Array<{ contextType: string; summary: string }>
  recentSituations: Array<{ title: string; rawInput: string; status: string; createdAt: Date }>
}): string {
  const summarySection = params.memorySummaries
    .map((item) => `- [${item.summaryType}] ${item.summaryText}`)
    .join('\n')

  const contextSection = params.contextSummaries
    .map((item) => `- [${item.contextType}] ${item.summary}`)
    .join('\n')

  const recentSection = params.recentSituations
    .map((item) => `- ${item.createdAt.toISOString().slice(0, 10)} | ${item.title} (${item.status}) | ${item.rawInput}`)
    .join('\n')

  return [
    'Stable memory summaries:',
    summarySection || '- none yet',
    '',
    'Layered context summaries:',
    contextSection || '- none yet',
    '',
    'Recent special situations:',
    recentSection || '- none yet',
  ].join('\n')
}

function getDefaultGeneratedItems(eventDate: Date | null): GeneratedItem[] {
  const dueDate = eventDate ? eventDate.toISOString().slice(0, 10) : undefined
  return [
    {
      title: 'List required preparation tasks',
      description: 'Break the situation into concrete tasks for both members.',
      suggestedDueDate: dueDate,
    },
    {
      title: 'Check supplies and dependencies',
      description: 'Confirm what is needed and what must be purchased or arranged.',
      suggestedDueDate: dueDate,
    },
  ]
}
