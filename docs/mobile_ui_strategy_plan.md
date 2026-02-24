# House Butler Mobile UI Strategy and Interaction Plan (Artifact 2)

Date: 2026-02-24  
Status: Draft (planning artifact for review)

## 1) Purpose

Define a mobile-first UI strategy that makes daily household use fast, clear, and reliable while preserving the existing MVP feature set.

This artifact focuses on:
- interaction design and information architecture,
- responsive behavior rules,
- delivery slices and QA gates for phone usage.

## 2) Mobile Product Goals

The mobile UI must support these outcomes:
1. A user can open the app and identify the next task quickly.
2. A user can complete or skip a task with minimal friction.
3. A user can create quick assignments and situations without dense form fatigue.
4. The app remains understandable under real-world interruptions (one-hand use, short sessions).
5. The app feels friendly and playful, not formal or corporate.

## 2.1) Experience Tone: Friendly + Playful (Required)

The mobile UI should feel:
- warm and encouraging,
- light and approachable,
- energetic without becoming noisy.

Avoid:
- overly formal dashboard language,
- stiff enterprise visual patterns,
- dense "control panel" presentation on mobile.

Apply:
- short supportive microcopy in key moments,
- subtle celebratory feedback for completions/streaks,
- rounded, touch-friendly components and visual softness.

## 3) Current UX Pain Points (to address)

Observed in current screens:
- Header + horizontal nav + content compete for vertical space on small phones.
- Several forms are still dense for mobile scanning (many equal-weight fields shown at once).
- Multi-control rows and badges can feel cramped in checklist and history cards.
- Primary action hierarchy is inconsistent across screens.

## 4) Mobile IA and Navigation Decisions

### A) Navigation model
- Mobile (`< md`): fixed bottom tab bar with 4 tabs: Dashboard, Chores, Situations, History.
- Desktop/tablet (`>= md`): keep current top nav style.

### B) Header model
- Mobile: compact header with page title + overflow menu (includes sign out).
- Desktop: retain current full header layout.

### C) Primary-action placement
- Each screen gets one clear primary CTA near thumb zone.
- Secondary actions move to overflow menus or expandable sections.

### D) Visual personality
- Use a bright accent palette with strong contrast against dark surfaces.
- Introduce playful but restrained illustration/icon accents for empty and success states.
- Preserve readability first; playful styling must not hide hierarchy.

## 5) Screen-by-Screen Interaction Plan

### A) Dashboard (highest-frequency screen)
- Top section: pending summary + one primary CTA.
- Priority sequence cards: one-column stack with concise metadata.
- Task cards: large `Complete` primary, `Skip` secondary; due text simplified.
- Quick Assign: collapsible section on mobile; expanded by default on desktop.
- Completion action includes a lightweight positive response pattern (color/motion/copy).

### B) Chores
- Mobile create/edit form split into:
  - Core fields first (name, assignee, priority, frequency),
  - Advanced settings in collapsible panel (urgency math, timing details).
- Chore cards use action menu (`Assign now`, `Edit`, `Archive`) instead of side-by-side button rows.
- Encourage plain-language labels and helper text over technical framing where possible.

### C) Situations
- New situation form stays single-column; event date stays optional and visually secondary.
- Checklist item editing becomes progressive:
  - first row: title + status,
  - advanced details (description, assignee, due date) behind "Details" toggle.
- Add-item control pinned to end of checklist for rapid entry.
- Use friendly prompt examples that feel conversational instead of procedural.

### D) History
- Timeline cards simplified to:
  - title,
  - short description,
  - timestamp and category chip in a compact footer row.
- Avoid right-heavy layouts that compress text on narrow viewports.

### E) Login
- Keep current centered layout, but reduce vertical padding on shorter screens.
- Preserve strong tap targets and clear error state.
- Keep copy welcoming and non-clinical.

## 6) Responsive System Rules

### A) Breakpoints
- `xs`: 320-479 px
- `sm`: 480-767 px
- `md`: 768-1023 px
- `lg+`: 1024 px and above

### B) Layout and spacing
- Mobile defaults to single-column content flow.
- Minimum touch target: 44x44 px.
- Vertical spacing rhythm: 8 px base increments.
- Card padding on mobile: 12-14 px; desktop: 16 px+.

### C) Typography and density
- Body text min 14 px on mobile.
- Secondary metadata should not exceed two compact lines where possible.
- Avoid stacked all-caps labels unless required for semantic emphasis.
- Favor human, friendly labels (for example, "Done" over "Complete action" style wording).

### D) Forms
- One input per row on mobile unless two controls are tightly related and short.
- Use field grouping and section labels; avoid long uninterrupted input walls.
- Keep destructive actions visually separated from primary actions.

## 7) Accessibility and Reliability Requirements

- Keyboard and screen-reader navigation preserved for all actions.
- Focus states always visible.
- Color contrast meets accessible thresholds in dark UI.
- Loading/error states must be explicit and non-blocking when possible.
- Motion should be subtle and disabled under reduced-motion preferences.
- Friendly interactions must never compromise accessibility or clarity.

## 8) Mobile Performance Targets

- Core pages interactive within a practical mobile budget on average home networks.
- Avoid layout shifts in the top viewport region.
- Keep initial screen content prioritized before secondary modules.

## 9) QA and Validation Plan

### A) Automated E2E expansion
- Add Playwright mobile projects:
  - iPhone viewport profile,
  - Android viewport profile.
- Cover key flows:
  - login,
  - complete task from dashboard,
  - quick assign,
  - create and edit situation item.

### B) Manual device checklist
- iOS Safari + Add to Home Screen behavior.
- Android Chrome + Add to Home Screen behavior.
- Bottom tab usability with one-hand reach.
- Form readability and keyboard overlap handling.

### C) Success indicators
- Reduced taps/time for common dashboard completion flow.
- Lower mobile form error/abandon rate for situations and quick assign.
- Fewer manual complaints about cramped layouts.
- Positive qualitative feedback on friendliness/playfulness from both household members.

## 10) Delivery Slices

### Slice M1: Shell and Navigation
- Mobile bottom tab bar.
- Compact headers + overflow menu.
- Page-level spacing and container adjustments.

Exit criteria:
- All primary pages are comfortably navigable on 320-430 px widths.

### Slice M2: High-Frequency Flow Optimization
- Dashboard card/action hierarchy pass.
- Quick Assign collapse behavior on mobile.
- Chores form progressive disclosure.

Exit criteria:
- Core daily flows are one-hand friendly and scannable.

### Slice M3: Situations + History Density Pass
- Checklist item progressive details.
- History card simplification.
- Final spacing/typography polish.
- Friendly/playful copy and interaction polish pass.

Exit criteria:
- Situation and history screens remain readable and editable on small devices.

### Slice M4: QA Hardening
- Mobile E2E suite in CI.
- Manual iOS/Android PWA checklist completed.

Exit criteria:
- Mobile UX checks are part of regular release quality gates.

## 11) Key Design Tradeoffs (Chosen Defaults)

### Tradeoff A: Information density vs speed of comprehension
- Choice: prioritize scannability over showing every field at once.
- Mitigation: advanced options remain available via progressive disclosure.

### Tradeoff B: Persistent actions vs visual simplicity
- Choice: keep one primary action visible, demote secondary actions.
- Mitigation: provide reliable overflow actions to avoid hidden functionality risk.

### Tradeoff C: Uniform layouts vs screen-specific optimization
- Choice: optimize each high-frequency screen for its top task.
- Mitigation: retain shared spacing/type tokens for consistency.

### Tradeoff D: Fast rollout vs perfect redesign
- Choice: phased mobile improvements across focused slices.
- Mitigation: each slice has explicit exit criteria and QA checks.

### Tradeoff E: Playfulness vs seriousness of task management
- Choice: keep the interaction tone playful while preserving clear priorities and urgency visibility.
- Mitigation: playful feedback appears in micro-interactions and copy, not at the cost of task clarity.

## 12) Immediate Follow-Ups

After approval of this artifact:
1. Ratify major mobile decisions in canonical docs if scope/priority changes.
2. Execute Artifact 3 roadmap slices in milestone order.
3. Start Slice M1 implementation with before/after screenshots and E2E additions.
