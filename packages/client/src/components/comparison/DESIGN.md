# Comparison view design spec

Read this before changing `RoundTripBundle`, `MixAndMatchSection`, or `ComparisonView`. Anchored in Stripe (confident type scale, generous spacing, trust-through-polish) fused with Apple/Notion calm (warm neutral surfaces, minimal chrome, one accent color at a time) — not generic Tailwind card-soup.

## Color
No `tailwind.config.js` changes needed — `emerald-*`, `stone-*`, `gray-*` are already available default Tailwind colors via the existing `extend` config, and `brand-600/700` already exist for the one true primary CTA.

Money color vocabulary, used consistently everywhere:
- Cheaper / recommended price → `text-emerald-600` / `bg-emerald-50 text-emerald-700 border-emerald-100` pill. Calmer than `green-*`, not a "success toast."
- More expensive / non-recommended price → `text-gray-400`, **never red** — it's a tradeoff, not an error.
- Neutral/informational price → `text-gray-900`.

## Type scale
- Hero trip total price: `text-4xl font-bold tracking-tight tabular-nums text-gray-900` — the only `text-4xl` in the view.
- Per-leg price (inside the bundle, subordinate): `text-base font-semibold text-gray-500`.
- Eyebrow/section label: `text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400`.
- Flight time / airport code: unchanged, already correct in `FlightTimeline`.
- Microcopy under CTAs: `text-xs text-gray-500`/`text-gray-400`, never smaller.

## Spacing
- Hero outer padding: `p-6 sm:p-8` (roomier than `.card`'s `p-4`) — justified because this view only ever shows ≤4 flights total, so generous space never causes scroll fatigue.
- Gap between the hero and "or mix airlines" divider: `mt-10`/`mt-12` — a deliberate jump, signaling a different mode, not "next list item."
- Legs inside the bundle: `gap-0`, joined by `divide-y divide-gray-100` — they are one object, not two cards with a gap.
- Mix & match's two cards: `gap-4`, genuinely side by side — contrast against the bundle's nesting.

## Motion
- Hero hover: `transition-shadow duration-200 hover:shadow-lg` — shadow only, no transform/scale.
- Buttons: `transition-colors duration-150`, matching the existing `.btn-primary` convention.
- Seller-link skeleton → content: `transition-opacity duration-200` fade, reserving space up front (no height animation, to avoid layout jank as eager fetches resolve at different times).

## Voice
- Combined CTA: "Book round trip on Google Flights" — name the destination of the click and that both legs are pre-selected.
- Real-seller link: lead with the seller name, e.g. "Book on United.com" — never a generic "Book Now" when a real seller is known.
- Google Flights fallback: "Or check Google Flights" — "Or" matters, it must read as alternative, not default.
- Section eyebrows state the airline-sameness fact directly: "ROUND TRIP · SAME AIRLINE" / "MIX & MATCH · DIFFERENT AIRLINES".
- Savings framing is always comparative: "Saves $42 vs. mixing airlines," never a bare "+$42".
- No-return state: one plain sentence in the eyebrow ("ONE-WAY · NO RETURN FOUND FOR THIS ROUTE"), not a separate apologetic card.

## Anti-patterns
1. Two equal-weight leg cards inside the bundle — there is one total price; legs are subordinate detail.
2. Badge-color soup — one colored accent per visual unit, never two competing at equal saturation.
3. Red for "more expensive" — reserve red for actual failures only.
4. Centering everything — left-aligned, asymmetric blocks (price big + left, meta small + left below).
5. Shadow on everything — only the hero gets a resting shadow; mix & match and the demoted detail section stay flat.
6. Letting the chart/table compete visually with the price hero — they're reference material, demoted accordingly (smaller heading, flatter container, collapsed by default).

## Hierarchy rule for "hero position" vs. "cheapest price"
The bundle is always the hero by position/size — that's structural, independent of price. The emerald "cheapest" accent is data-driven and can live on the bundle OR on the mix & match section depending on `recommendedOption`. These are allowed to disagree: position signals "the complete, one-click bookable trip"; the emerald accent signals "the verifiably cheapest number." Don't conflate them.
