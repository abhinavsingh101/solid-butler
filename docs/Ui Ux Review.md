# House Butler — Expert Critique of the Mobile UI Strategy Plan

> **Scope**: A critical review of [`mobile_ui_strategy_plan.md`](file:///Users/abhinavsingh/butler/docs/mobile_ui_strategy_plan.md) as a design plan. Judged against the standard of an AI-native, delightful, refined, mobile-optimised product. Held to a high bar because the product concept deserves it.

---

## The Honest Summary

This plan is **competent product management, not mobile design**. It reads like a well-structured requirements document written by someone who has thought clearly about features and information architecture. That's worth something. But it almost entirely defers the actual design thinking — tone, motion, hierarchy, visual personality, AI expression — to "polish passes" and "copy passes" that happen last. In mobile design, that sequencing is backwards. The things left to the end are the things that will make or break whether two people open this app every day.

The plan names the right problems but stops short of solving them. "Warm and encouraging" appears as a requirement; how to produce that feeling does not. "Subtle celebratory feedback" appears as a bullet; what the celebration actually is does not. The plan is a well-labelled container for design work that hasn't been done yet.

---

## What the Plan Gets Right

**1. Navigation architecture decision is correct.**  
Bottom tab bar on `< md`, top nav on `>= md`. This is the right call and the right breakpoint. iOS Human Interface Guidelines, Android Material Design, and every high-retention consumer app converge here. Getting this into the plan as a first-class decision (not an afterthought) is good.

**2. Personal action hierarchy thinking is sound.**  
One primary CTA per screen, secondary actions in overflow or expandable sections — this is correct mobile UX doctrine. The plan names the problem ("primary action hierarchy is inconsistent") and prescribes the right fix.

**3. Progressive disclosure on Chores and Situations is the right call.**  
Splitting the chores form into core vs. advanced, and the situations checklist into title+status vs. details, will dramatically reduce cognitive load on mobile. These are the right decompositions.

**4. Minimum touch target of 44×44 px is explicitly stated.**  
Most plans forget this. Getting it written down with a number is good discipline.

**5. Reduced-motion preference is called out.**  
Rare to see this in a product doc. It signals real accessibility awareness.

---

## Where the Plan Falls Short

### 5.1 The AI Identity Is Almost Absent

This is the most serious gap. The product has Claude generating checklists, computing urgency scores, tracking household memory, and building suggestion rationale. The plan almost entirely ignores how any of this should feel.

"Friendly and playful" is the tone target — but playful for what? For a generic to-do app? Or for an app where an AI knows your home, has read your history, and is actively recommending what to do first today? Those are completely different experiences.

The plan says nothing about:
- **How the AI announces itself.** When Claude generates a checklist from raw text, that moment of generation is the product's signature interaction. The plan calls it "situation creation" and moves on. There's no description of how the AI's presence should be expressed — streamed output, a reveal animation, a "Butler is thinking..." personality moment.
- **How AI suggestions are distinguished from human choices.** The LLM roadmap (Artifact 3) speaks of `suggestion_confidence` and `suggestion_reason` — genuinely valuable metadata. The mobile plan never describes how to surface these. Will confidence be a progress bar? A word? Invisible? Undefined.
- **How feedback flows back.** The roadmap (Ticket LLM-02) plans a `/api/ai/feedback` endpoint. The mobile plan has zero UI description for this. No thumbs, no "this was wrong," no correction affordance. If users can't talk back to the AI, it can't learn, and the memory loop is broken.
- **How memory transparency works.** "Based on your patterns, Abhinav usually takes this on weekends" — this kind of explainability is what makes AI feel collaborative rather than opaque. The plan doesn't describe a single moment of memory transparency in any screen.

**Verdict: The plan treats AI as a backend concern and mobile UX as a frontend concern, and never connects them. That's a fundamental miss for an AI-native product.**

---

### 5.2 "Friendly and Playful" Is Unspecified

Section 2.1 is titled "Experience Tone: Friendly + Playful (Required)" and lists three adjectives: warm, approachable, energetic. Then it says "avoid enterprise visual patterns" and "use rounded components."

This is insufficient. Adjectives without execution direction are aspirations, not design. For a document that claims this as a *Required* section, it should answer:

- **What is the visual metaphor or character?** Is the Butler a servant? A companion? A gentle nag? A coach? The name "Butler" implies a specific personality archetype — sophisticated, attentive, slightly formal — but the plan calls for "playful," which pulls in the opposite direction. That tension is never resolved.
- **Where does playfulness live?** Section 2.1 says "supportive microcopy in key moments" and "celebratory feedback for completions/streaks." Neither is specified further. What does the completion moment say? "Nice work" is fine. "Your streak is 🔥 7 days, the longest yet!" is delightful. "Task completed." is clinical. The plan doesn't differentiate.
- **What are the specific micro-interactions?** "Subtle celebratory feedback" is not a design spec. What is the animation? Scale bounce? Color pulse? Confetti? How long? On which trigger? "Subtle" to one developer is a 500ms particle explosion to another.
- **What are the illustrations?** Section 4D mentions "playful but restrained illustration/icon accents for empty and success states." No illustration direction whatsoever. Style? Weight? Color? Character? Figurative or abstract? This will be implemented as clip art unless specified.

---

### 5.3 The Screen Plans Are Feature Lists, Not Interaction Designs

Section 5 ("Screen-by-Screen Interaction Plan") is the heart of a mobile strategy document. Each sub-section should read like a directed experience — what the user sees, feels, and does. Instead each section is a bullet list of layout decisions.

**Dashboard (Section 5A):**
> "Task cards: large `Complete` primary, `Skip` secondary; due text simplified."  
> "Completion action includes a lightweight positive response pattern (color/motion/copy)."

"Color/motion/copy" as a triplet is a placeholder, not a design decision. What color? What motion? What copy? For the app's highest-frequency interaction (completing a chore), this deserves at minimum:
- A named animation (e.g. "card slides off to the right with a green trail")
- A named copy pattern (e.g. "✓ Done! +12 pts" appearing for 2 seconds)
- A named color beat (e.g. card flashes emerald before disappearing)

**Situations (Section 5C):**
> "first row: title + status, advanced details (description, assignee, due date) behind 'Details' toggle."

Fine structural decision. But the most important question — **how does AI generation appear?** — is entirely absent from this section. The Situations screen is where the AI is most visible. The plan leaves it blank.

**History (Section 5D):**
> "Timeline cards simplified to: title, short description, timestamp and category chip in a compact footer row."

This describes a log. History in a household app should feel like a **shared journal**, not a filtered table. It should group by day ("Yesterday"), surface moments ("You and partner both completed tasks on Sunday 🎉"), and give a sense of the household's rhythm over time. The plan's direction is to simplify. The bolder direction is to make it meaningful.

---

### 5.4 No Gesture or Native-Interaction Language

Mobile is not small desktop. The plan's responsive decisions are entirely about layout (breakpoints, columns, spacing). There is no mention of:
- **Swipe gestures.** Swipe right to complete, swipe left to skip — these are table stakes in task apps. Absent from the plan.
- **Pull-to-refresh.** The dashboard will need freshening; the plan doesn't mention it.
- **Long-press or haptic feedback patterns.** For quick contextual actions on chore cards (reschedule, reassign without opening the full form), long-press is a natural pattern on mobile.
- **Keyboard avoidance.** On iOS, the software keyboard pushes the viewport. Forms in Quick Assign and Situations will have the submit button hidden behind the keyboard unless handled explicitly. The plan's form rules (Section 6D) don't mention this.
- **Safe area insets for punch-hole/notched screens.** The bottom tab bar must respect `safe-area-inset-bottom`. Not mentioned.

---

### 5.5 The Gamification Spec Is Too Thin

Section 8 of the implementation plan describes the gamification model (points, streaks, overdue deductions). The mobile strategy plan (this document) doesn't add anything to how any of this should feel on screen.

Gamification is either a feature or a feeling. In most apps it's a feature — numbers that increment. In a great app it's a feeling — the system acknowledges and celebrates your behaviour. The plan doesn't distinguish between these.

Questions the plan should answer but doesn't:
- Does the streak live on the dashboard permanently or only when it's active?
- Is there a personal best moment ("New streak record!")?
- Is there household comparison? Side-by-side, not competitive leaderboard — just "you both had a great week"?
- Where does the gamification data live on the dashboard vs. a dedicated "My Progress" section?
- What's the first-time experience for someone who just completed their first ever task?

---

### 5.6 The Tone Pass Is an Afterthought

Slice M3 (the last slice) is where "friendly/playful copy and interaction polish" appears. This is a common and consequential mistake. Tone is architecture, not paint. If the copy says "Priority: HIGH", changing it to "Urgent" in a polish pass is a one-line fix. But if the entire interface was designed around surfacing enum values as labels, the late polish pass becomes a semantic refactor across dozens of components.

The plan should have included a copy spec for its highest-frequency strings:
- Section headers (`"PRIORITY SEQUENCE"` → what should this say?)
- Priority labels (`HIGH` / `MEDIUM` / `LOW` → are these the right words?)
- Action buttons (`Complete` / `Skip` — are these the right words for two people in a house?)
- Empty states (what does each screen say when there's nothing there yet?)
- Celebratory microcopy (what does the completion moment say?)

A two-page copy spec would make Slice M3 a real polish pass instead of a ground-up writing exercise at the end of the project.

---

### 5.7 The Delivery Slices Defer Everything Interesting

```
Slice M1 — Shell and Navigation
Slice M2 — High-Frequency Flow Optimization  
Slice M3 — Situations + History Density Pass + Friendly/Playful Copy and Interaction Polish
Slice M4 — QA Hardening
```

Slice M3 contains: progressive disclosure for situations, history simplification, and — bundled in — "friendly/playful copy and interaction polish." The entire emotional character of the app is the last non-QA thing on the list. This is the equivalent of planning to make food taste good in the final step.

A better sequencing:
- Tone, copy, and personality decisions should happen **before** Slice M1, as design foundations, so they can be applied consistently as each slice is built.
- Slice M1 should include the first celebratory micro-interaction (task completion) since it's the highest-frequency emotional moment.
- Each slice should have a "personality check" exit criterion, not just a structural one.

---

## Recommendations

### R1 — Add an AI Interaction Spec (Missing entirely)
Before any slice is built, define: how does the Butler announce its intelligence? At minimum: what happens on checklist generation (streaming vs. reveal), how suggestions are labeled, where feedback affordances live, and one example of memory transparency in the UI.

### R2 — Write a Copy Spec (1–2 pages)
Define the copy for: nav labels, section headers, all priority/status labels (no raw enums), every button, every empty state, the completion moment, and streak moments. This is a half-day exercise that will 10× the quality of M3.

### R3 — Specify Three Micro-Interactions by Name (Missing from M1 exit criteria)
The plan's exit criteria are structural ("all pages are comfortably navigable on 320–430 px widths"). Add emotional exit criteria. At minimum define:
- The task completion animation (M1 or M2)
- The AI generation moment (M3 but needs a spec now)
- The streak increment moment (M3 but needs a spec now)

### R4 — Resolve the Butler Personality (Section 2.1 needs a rewrite)
"Warm, approachable, energetic" is not a personality. Define a character. The Butler archetype — attentive, slightly witty, always helpful — is actually a strong creative anchor. The plan should commit to it: a Butler speaks in first person ("I've put together a checklist for your weekend guests"), uses understated humour, never panics, and celebrates quietly. This should be a paragraph, not three adjectives.

### R5 — Add Gesture Language to Section 6
Add a sub-section 6E: Gesture and Native Interaction. Define swipe-to-complete, pull-to-refresh, safe-area compliance for the bottom tab bar, and keyboard avoidance strategy for forms.

### R6 — Front-load Personality Into Slice M1
Move "friendly/playful copy and interaction polish" from M3 into the exit criteria of M1 for the two highest-frequency interactions: login and task completion. These are the moments users will experience most — they should feel right from the beginning, not be retrofitted at the end.

---

## Overall Assessment

The plan is a strong structural skeleton. Navigation architecture, IA decisions, progressive disclosure, touch targets, accessibility — these are all handled correctly and explicitly. The bones are good.

What's missing is flesh and soul. The plan does not yet describe a product that a person would love. It describes a product that a person would use. For an app designed to reduce household mental load — to feel like relief, like partnership, like the home running smoothly — that gap matters. Two people using this daily is a high bar. The plan doesn't yet reach it.

The fix is not more features. It's going back to Sections 2.1, 5A, and 5C and writing them as if they're interaction design, not requirements. Then writing a copy spec. Then defining three micro-interactions by name. That's the work that the plan currently skips.
