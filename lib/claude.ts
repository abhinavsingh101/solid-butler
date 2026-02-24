import Anthropic from '@anthropic-ai/sdk'

type ChecklistItem = {
  title: string
  description?: string
  suggestedDueDate?: string
  suggestedAssignee?: string
}

type ChecklistResponse = {
  items: ChecklistItem[]
}

export async function generateSituationChecklist(
  rawInput: string,
  eventDate: string | null,
  householdHistoryContext: string,
): Promise<ChecklistResponse> {
  if (!process.env.CLAUDE_API_KEY) {
    console.warn('CLAUDE_API_KEY is missing. Using generic fallback.')
    return getFallbackChecklist()
  }

  const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

  const systemPrompt = `You are The House Butler, a helpful household assistant.
You must return only JSON with shape:
{
  "items": [
    {
      "title": "string",
      "description": "string optional",
      "suggestedDueDate": "YYYY-MM-DD optional",
      "suggestedAssignee": "username optional"
    }
  ]
}

Household context/history:
${householdHistoryContext}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Situation: ${rawInput}\nEvent Date: ${eventDate || 'Not specified'}` }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return { items: [] }
    }

    const jsonText = content.text.trim().replace(/^```json/, '').replace(/```$/, '')
    const parsed = JSON.parse(jsonText) as Partial<ChecklistResponse>

    if (!Array.isArray(parsed.items)) {
      return { items: [] }
    }

    return {
      items: parsed.items.filter((item): item is ChecklistItem => typeof item?.title === 'string'),
    }
  } catch (error) {
    console.error('Claude API error:', error)
    return getFallbackChecklist()
  }
}

function getFallbackChecklist(): ChecklistResponse {
  return {
    items: [
      { title: 'Tidy up the house', description: 'General cleanup before the event.' },
      { title: 'Check groceries', description: 'Ensure required supplies are available.' },
    ],
  }
}
