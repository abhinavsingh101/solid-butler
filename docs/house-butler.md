Questionnaire:

Batch 1 — Household & Core Chore Behavior
Users & Roles

How many household members will use this? Do they all need individual logins, or is a single shared household account enough?
Should there be an admin/owner role — someone who can set up chores, assign members, and override the LLM's suggestions?
Chore Assignment 3. Should the LLM fully auto-assign chores, or just suggest assignments that an admin approves? 4. Do you want to start with a pre-seeded list of chores, or have the app learn from scratch as you add them?

Batch 2 — Notifications & Follow-up
How should the app follow up on incomplete chores? Options:
In-app reminders (user has to open the app)
Browser push notifications (works on mobile without the app being open)
Email
WhatsApp / SMS (requires integration like Twilio)
Should reminders escalate if a chore is ignored (e.g., remind again after 2 hours, then reassign)?
Batch 3 — Special Situations
How should a special situation be triggered?
Picking from a pre-defined list (Trip, Guests, etc.)
Free-text input ("We have guests arriving March 5")
Both?
Should the LLM generate the checklist dynamically, or start from a template the user can edit?
Batch 4 — Tech & Hosting
Where do you want this hosted?
A cloud service (easy, requires subscription) — e.g., Vercel, Railway
Your own home server / Raspberry Pi (private, one-time cost)
Do you have a preferred LLM provider? (OpenAI, Google Gemini, Anthropic Claude) — and do you already have an API key?
Login method preference: Simple password, or Sign in with Google?
Batch 5 — Design & Feel
Do you want the app to feel fun/gamified (e.g., points, streaks for completing chores) or clean and professional?
Any name in mind for the app?
Dark mode — nice to have or essential?

Response:

Two household members will use the app. For now, we don’t need to think about logins, and we also don’t need admin/owner roles.

The LLM should gradually learn our preferences. Initially, we will assign chores ourselves. Over time, it can begin to suggest chore assignments based on what it remembers. We will start with a predefined list of chores and keep adding to it. We will also choose the frequency ourselves. The key need is for the LLM to retain history so it can make intelligent suggestions later, including around notifications and follow-ups.

For now, let’s keep the notification/follow-up strategy as simple as possible. For example: should reminders escalate if a chore is ignored? That’s the kind of feature we can add later if we need it. Let’s ship the basic set of features first, then add more intelligence over time.

Special occasions will be triggered by free-text input. The LLM should recommend a checklist based on context and the history of how we’ve handled similar situations in the past.

Importantly, the LLM should recognize the individuals involved. My partner and I will use separate devices, so there may be a case for logins—mainly so it can assign identities to who is talking, learn each person’s preferences, and distinguish who is doing what and who is saying what.

Hosting: a cloud service is fine for now, until we get our own home server. We don’t have a preferred LLM provider, though I like Claude, so we can start with that. If we implement logins, a simple password is fine; don’t worry too much about security since this is a private household app.

Design: we want it to feel fun and gamified—points and streaks both sound good. We could call the app “The House Butler.” It should definitely have dark mode. Aesthetics matter a lot: it should feel polished and refined.