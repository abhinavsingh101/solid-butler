import Anthropic from '@anthropic-ai/sdk'

export async function generateSituationChecklist(rawInput: string, eventDate: string | null, householdHistoryContext: string) {
    if (!process.env.CLAUDE_API_KEY) {
        console.warn('CLAUDE_API_KEY is missing. Using generic fallback.')
        return getFallbackChecklist()
    }

    const anthropic = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY,
    })

    const systemPrompt = `You are The House Butler, a helpful household assistant.
The users are facing a special situation. You need to generate a checklist of chores and tasks for them to complete.
Your output MUST be a raw JSON object (without markdown code blocks, just the JSON) with this exact shape:
{
  "items": [
    { 
      "title": "Short action item title (e.g. Vacuum bedrooms)", 
      "description": "More context if needed", 
      "suggestedDueDate": "YYYY-MM-DD (optional, relative to Event Date if provided)", 
      "suggestedAssignee": "username (optional, only if confident based on history)" 
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
            messages: [
                { role: 'user', content: `Situation: ${rawInput}\nEvent Date: ${eventDate || 'Not specified'}` }
            ]
        })

        const responseBlock = response.content[0]
        if (responseBlock.type === 'text') {
            const jsonStr = responseBlock.text.trim().replace(/^```json/, '').replace(/```$/, '')
            const parsed = JSON.parse(jsonStr)
            return parsed.items ? parsed : { items: [] }
        }

        return { items: [] }
    } catch (err) {
        console.error('Claude API or Parse error:', err)
        return getFallbackChecklist()
    }
}

function getFallbackChecklist() {
    return {
        items: [
            { title: 'Tidy up the house', description: 'General cleanup' },
            { title: 'Check groceries', description: 'Ensure you have enough food' }
        ]
    }
}
