---
name: flightselect-design
description: "Engineered cinema for flight decisions. A near-black, hairline-bordered product surface (Linear) showing flight data with editorial confidence (Runway) — the flight comparison itself is the 'cinematic content,' not photography. One scarce violet accent used deliberately and often, not decoratively. No shadows, no glass, no gradients-as-decoration. Every token below maps to a literal Tailwind class — if a component's code doesn't use these classes, it is out of spec."
status: source of truth as of 2026-06-29 — supersedes the deleted comparison/DESIGN.md
colors:
  canvas: "#08090a"        # bg-canvas — page background, the deepest surface
  surface-1: "#0f1011"     # bg-surface-1 — default card/row surface
  surface-2: "#141516"     # bg-surface-2 — elevated/hovered/recommended surface
  surface-3: "#18191a"     # bg-surface-3 — dropdown menus, popovers
  hairline: "#23252a"      # border-hairline — default 1px border, all cards
  hairline-strong: "#34343a" # border-hairline-strong — hover state, focus-adjacent
  ink: "#f7f8f8"           # text-ink — headlines, prices, primary text
  ink-muted: "#d0d6e0"     # text-ink-muted — secondary text
  ink-subtle: "#8a8f98"    # text-ink-subtle — tertiary, deselected
  ink-cool: "#767d88"      # text-ink-cool — Runway-style secondary on data rows
  ink-faint: "#62666d"     # text-ink-faint — quaternary, disabled, footnotes
  brand-500: "#8b5cf6"     # accent — links, icons, focus, secondary accents
  brand-600: "#7c3aed"     # accent — primary CTA fill
  brand-700: "#6d28d9"     # accent — CTA hover/pressed
  brand-400: "#a78bfa"     # accent — accent text on dark surfaces (readable tint)
  success: "#34d399"       # emerald-400 — cheapest price, Direct badge, best-price pill
  error: "#ef4444"          # red-500 family — errors only, never "more expensive"
font:
  sans: "Inter (variable), weight 400/500/600"
  mono: "JetBrains Mono, weight 400/500 — flight numbers, airport codes, durations, table numerals"
radius:
  sm: "rounded-md (6px) — small chips, inline tags"
  md: "rounded-lg (8px) — ALL buttons and inputs, never pill"
  lg: "rounded-xl (12px) — cards, rows"
  xl: "rounded-2xl (16px) — hero panels (RoundTripBundle, search form panel)"
  pill: "rounded-full — status badges and toggle pills ONLY, never a CTA"
spacing: "Tailwind default 4px scale (p-1=4px...p-24=96px) used disciplined: 4 = tight inline, 6/4 = card padding, 6 = gaps between cards, 24 = section breaks"
---

## Why this exists

FlightSelect's UI has drifted from its stated design intent more than once — a "dark redesign" that turned out to have no real depth system, claimed motion that wasn't perceptible, and components recolored without being re-architected. **This file is the literal source of truth.** Every token above is a real Tailwind class, not an aspiration. If you change a component, check it against this file afterward — that check is the point, not optional.

## Synthesis: why Linear × Runway, and why purple stays

**Linear supplies the engineering**: a four-step surface ladder (canvas → surface-1 → surface-2 → surface-3) carries all visual hierarchy through background lift + 1px hairline borders — **never shadows**. The system reads as dense, precise, built by people who think in systems.

**Runway supplies the editorial voice**: a single typeface used at every size (we use Inter the same way), tight negative-tracked headlines that read like a film title, uppercase eyebrow labels as the only navigational structure, and an interface that tries to disappear so the *content* — for Runway, photography; for us, the flight itself: route, price, time — is what the user actually looks at.

**Purple is the one accent, and it must be visible.** Earlier passes under-used it (one CTA button and nothing else). That's wrong for this synthesis — Linear's own rule is "scarce but ALWAYS present at brand-mark/CTA/focus/link," not "absent." Concretely, every screen must show the accent in at least 3 places: the primary CTA, at least one focus/hover ring, and at least one data-driven highlight (the winning option's border, the AI insight's icon, an active filter pill).

## Depth model (replaces shadows entirely)

| Level | Treatment | Use |
|---|---|---|
| 0 — flat | `bg-canvas`, no border | Page background, body text |
| 1 — lifted | `bg-surface-1 border border-hairline rounded-xl` | Default cards: flight rows, filter panel, AI insight |
| 2 — elevated | `bg-surface-2 border border-hairline-strong` | Hover state, the recommended/winning option, featured panels |
| 3 — popover | `bg-surface-3` | Airport autocomplete dropdown, any floating menu |
| focus | `ring-2 ring-brand-500/50` | Focused input/button — the only place a glow-like effect is allowed |

No `shadow-*` utility appears anywhere in this app. Depth is surface + border, full stop.

## Typography (exact classes, defined once in `globals.css`)

| Class | Spec | Use |
|---|---|---|
| `.text-display` | 44px / 600 / leading-none / tracking `-0.03em` | Hero trip price — the single largest number on any *results* page |
| landing headline (one-off, `HomePage.tsx`) | `text-[2.75rem] sm:text-[3.25rem] font-semibold leading-[1.05] tracking-[-0.03em]` | The landing question. Documented exception to `.text-display`'s fixed size — this is the one full-viewport editorial moment in the app, not a repeated data point, so it's allowed to scale up on larger viewports where `.text-display` stays fixed everywhere else. |
| `.text-h1` | 28px / 600 / leading-tight / tracking `-0.02em` | "Your Trip", page titles |
| `.text-h2` | 22px / 500 / leading-snug / tracking `-0.018em` | Card titles (airline name on the hero, "Filters") |
| `.text-eyebrow` | 12px / 500 / uppercase / tracking `0.08em` | Section labels — "ROUND TRIP · SAME AIRLINE", "AI INSIGHT", filter group headers. Color is NOT baked in — pair with `text-ink-subtle` normally, `text-brand-400` when the eyebrow itself is the highlighted fact. |
| `font-mono` (Tailwind) | JetBrains Mono | Flight numbers, airport codes (EWR, ATL), durations (8h 2m), and table numerals — anywhere a value should read as *data*, not prose. |
| default body | Inter 400, `tracking-[-0.005em]` | Everything else |

Negative tracking is mandatory on `.text-display`/`.text-h1`/`.text-h2` — flat default tracking on a 28px+ headline is the single fastest way back to "generic AI app" territory. Eyebrows use *positive* tracking deliberately, as the contrast signal that marks them as structure, not prose.

## Component anatomy (not just recoloring)

**Comparison hero (`RoundTripBundle.tsx`) — the protagonist of the whole app.** Anatomy, top to bottom: eyebrow (accent-tinted only when this option is the recommended one) → airline chip + name → **`.text-display` price**, tabular-nums → leg rows in `font-mono` for codes/numbers, plain Inter for everything else → connector glyph between legs → CTA. The CTA is `rounded-lg` (md, 8px), `bg-brand-600 hover:bg-brand-700`, normal button width (NOT a full-bleed neon slab), with a 1px `-translate-y-px` lift on hover — confident, not shouting. When this option is the recommended/cheapest one, the whole card steps up to depth level 2 (`surface-2` + `hairline-strong`) — the surface lift IS the "you should pick this" signal, no extra badge needed beyond the existing savings pill.

**Disclosures** (`<details>` "See full price breakdown"): never bare browser-default styling. Always: hairline top border, an eyebrow-styled `<summary>`, a chevron that rotates 90° on `[open]`, and the opened content sitting in its own `surface-1` panel with padding — not flush against the page.

**Flight rows** (`FlightCard.tsx`): `surface-1` + `hairline`, airline initial chip, `font-mono` for flight number/codes/duration, `.text-display`-adjacent (but smaller, `text-xl tabular-nums`) for price. Hover steps the row to `hairline-strong` + `-translate-y-px`, 200ms transition — every row in a list of 20+ should feel alive when scanned, not just clickable.

**Filter sidebar**: `self-start sticky top-20` — it must hug its content and track scroll, never stretch to the page's full height (this was the literal bug in the screenshot that started this rewrite). Internally: `surface-1` panel, sections divided by `hairline`, each section gets an eyebrow label, and padding continues *after* the last control (no dead trailing space).

**Status badges / pills** (Direct, layover, Best price): `rounded-full`, small, `bg-{color}-500/10 text-{color}-400 border border-{color}-500/20` — the one place `rounded-full` is correct.

## Motion (must be perceptible — this was the explicit complaint)

A previous pass shipped "ambient blobs" that moved under 40px on a 384px blurred shape — invisible in practice. That doesn't count as motion. The bar: **if you watch the screen for 3 seconds you must be able to see it move**, full stop.

- **Entrance**: every page — landing AND the search results page, which previously had zero animation — gets a staggered `fadeInUp` (defined in `tailwind.config.js`) on its top-level sections/cards: hero → AI insight → flight rows, ~60ms stagger between siblings.
- **Hover**: `transition-all duration-200`, surface-1→surface-2, hairline→hairline-strong, `-translate-y-px`. Never a shadow.
- **Landing ambient**: one large, slow-drifting low-opacity accent glow with real travel distance (100px+) and a slow opacity pulse, plus a faint static engineered grid texture behind it (no motion needed on the grid — its job is texture, not animation).
- **Respect `prefers-reduced-motion: reduce`** — disable all animation/transition duration globally when set. This is in `globals.css`, not per-component.

## Voice (carried forward from the prior comparison-only spec, now app-wide)

- Name the destination of a click: "Book round trip on Google Flights," never "Book Now."
- Lead with the real seller when known: "Book on United.com," not "View options."
- "Or check Google Flights" — the word "Or" matters; it must read as the alternative, never the default.
- Savings are always comparative: "Saves $42 vs. mixing airlines," never a bare "+$42."
- **Never red for "more expensive."** Red means an actual error. A pricier-but-valid option uses `text-ink-subtle`, not a warning color.

## Do / Don't

**Do**: use the accent often (3+ places per screen); lift surfaces for hierarchy; use `font-mono` for every flight number/code/duration; make motion big enough to see; keep CTAs `rounded-lg`, never pill.

**Don't**: use `shadow-*` anywhere; use glassmorphism/backdrop-blur as a primary effect; use more than one accent hue; let any container stretch to a height its content doesn't need; ship an animation under ~80px of travel or 0.05 opacity delta and call it "ambient motion."
