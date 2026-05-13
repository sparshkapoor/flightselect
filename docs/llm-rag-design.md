# LLM + RAG Design: Soft Factors

## Quick Reference — What the Pipeline Needs to Know

These are all the factors that affect what a flight actually costs or is worth. The pipeline computes these automatically on every search — no user typing required.

**Pricing factors (change the actual dollar total):**
- **Route type** — domestic vs. international changes everything. Legacy carriers include 1 free checked bag on international Economy. Applying domestic fees to an international flight gives the wrong answer.
- **Bag count** — the cheapest base fare often isn't cheapest once you add bags. The winner changes at 0, 1, and 2 bags.
- **Fare class** — Basic Economy has hidden restrictions (no seat selection, sometimes no overhead bin). The ticket type matters, not just the price.
- **Credit cards** — some cards waive the first bag fee (Delta Amex, United Explorer, etc.). Completely changes the math. See [credit-cards.md](credit-cards.md) for full breakdown.
- **Airline status** — elite members get free bags. If the user has status, card benefits don't matter for that airline.
- **Points/miles** — is it worth redeeming points instead of paying cash? Depends on the specific route price vs. the points cost. See [points-miles.md](points-miles.md) for CPP valuations.

**Risk/quality factors (don't change the price but change the decision):**
- **Refund/change policy** — a $50 more expensive refundable ticket may be worth it. The pipeline surfaces the premium; the user decides.
- **On-time performance** — a 6pm departure at Newark or O'Hare is historically late 35-45% of the time. An early morning flight on the same route is 85%+ on time.
- **Codeshare detection** — the "Delta" flight might actually be operated by a regional carrier on a small plane with no overhead bin space, no Wi-Fi, and no power outlets.
- **Connection risks** — some layovers that look fine on paper are routinely missed. International connections also require rechecking bags through US customs, which adds 45-90 min.
- **Seat quality** — two business class tickets at the same price can be lie-flat vs. angled-flat. Economy seat pitch varies significantly by aircraft type.

**Edge cases (affect specific traveler types):**
- **Fuel surcharges** — some airlines charge $400-600 in fees on top of award ticket redemptions, killing the value of using points.
- **Transit visas** — a layover in certain countries requires a visa or transit permit even if you never leave the airport.
- **Military** — active duty military get bag fees waived on all major US carriers.
- **Children/infants** — fare rules change completely. Lap infant on an international flight can be 10% of the base fare, which adds up fast.

---

*Detailed breakdowns: [credit-cards.md](credit-cards.md) — [points-miles.md](points-miles.md)*

---

## The Core Insight: Optimal Flight Is a Function, Not a Single Answer

The cheapest ticket is not always the best ticket. The optimal choice is a function of:

- **How many bags you're bringing** — a $30 cheaper ticket with a $45/bag fee loses at 1 bag
- **How certain you are of your travel dates** — a $50 more expensive refundable ticket may be worth it
- **Which airline's policies fit your situation** — better refund policy vs. better bag allowance is a real tradeoff

The pipeline must compute **multiple scenarios per search** and surface the right answer per traveler profile. The UI shows a matrix, not a single recommendation:

| Scenario | Best Option |
|----------|-------------|
| Carry-on only | Option A (cheapest base fare) |
| 1 checked bag | Option B (free first bag) |
| 2 checked bags | Option C (bundle beats per-bag fees) |
| Flexible traveler (may cancel/change) | Option D (refundable premium worth it) |
| Committed traveler | Option A (non-refundable fine, save money) |

Bag count and flexibility posture should be captured as search inputs, not inferred.

---

## Data Type Classification

Eight meaningfully different data types — each needs different treatment:

| Data | Shape | Freshness | Best Storage |
|------|-------|-----------|--------------|
| Airline baggage fee schedules | Structured fee tables | Changes ~monthly | SQL table (math, not text) |
| Fare class restriction matrix | Semi-structured per-airline rules | Stable, airline-specific | SQL table + staleness flag |
| Airline cancellation/change policies | Unstructured prose | Changes ~monthly | Vector chunks w/ metadata |
| Credit card travel benefits | Semi-structured prose w/ conditions | Changes annually | Vector chunks w/ metadata |
| Points/miles CPP valuations | Numeric estimates | Fluctuates quarterly | SQL table + staleness flag |
| On-time performance by route | Aggregated BTS statistics | Monthly update | SQL table |
| Historical pricing | Time-series numbers | Grows daily | Aggregated summaries |
| Airport/route facts (MCT, terminals) | Structured, mostly static | Rarely changes | SQL table |

Baggage fees and fare class rules go into SQL because the pipeline does arithmetic on them. You cannot compute "total cost at 2 bags" from a prose chunk — you need queryable numbers.

---

## Bag Count Sensitivity Analysis

Pure math, not RAG — but requires the fee schedule to be structured and **route-type-aware**.

### Route type is the first variable, not an afterthought

The fee calculation is completely different depending on whether the flight is domestic or international. This matters directly for FlightSelect's core use case — a family flying JFK→DEL (India) is on an international route where Economy **includes 1 free checked bag** on Delta, United, and AA. The card benefit math, the Spirit comparison, and everything else changes accordingly.

**Domestic (US point-to-point, including Hawaii, Puerto Rico, USVI):**
- Legacy carriers (Delta, United, AA, Alaska): bags cost $35 (first), $45 (second)
- Spirit/Frontier: everything paid, dynamic pricing

**International (any segment crossing a US border):**
- Delta Economy: 1 free checked bag included (most routes)
- United Economy: 1 free checked bag on most international routes (route-dependent)
- AA Economy: 1 free checked bag on most international routes
- Alaska Economy: typically paid even on international
- Spirit/Frontier: paid regardless

**Implication for the pipeline:** The pipeline must look up `route_type` from the flight segment before doing any fee calculation. Applying domestic fees to an international itinerary produces a wrong answer.

**Implication for card benefits:** If the international route already includes 1 free bag, the Delta Gold Amex's "first bag free" benefit is redundant for that leg — the savings is $0, not $35. The pipeline must check `bag_1_fee(route_type)` before computing card waivers. If the fee is already $0, the card contributes nothing.

**Implication for the round-trip vs. one-way comparison (the core product):** On an international round-trip, both legs likely include a free bag, so the bag fee difference between airlines narrows. The comparison shifts toward ticket price, refund policy, seat quality, and layover routing — not bags.

### The calculation per flight option

```
// Step 1: resolve route type from segment
route_type = classify(origin_country, dest_country)
  // DOMESTIC if both US territories
  // INTERNATIONAL otherwise

// Step 2: look up fee schedule for this airline × fare_class × route_type
fees = baggage_fees.lookup(airline, fare_class, route_type)

// Step 3: apply waivers in priority order
effective_bag_1_fee = fees.bag_1_fee
if (user.status qualifies for this airline) → effective_bag_1_fee = 0
else if (user.card qualifies AND trigger conditions met) → effective_bag_1_fee = 0

// Step 4: total cost
total_cost(n_bags) =
  base_fare
  + carry_on_fee                          // $0 on legacy; $40-70 on Spirit/Frontier
  + effective_bag_1_fee (if n >= 1)
  + fees.bag_2_fee (if n >= 2)            // card waiver usually only covers bag 1
  + seat_selection_fee (if BE + user wants seat)
```

Run for n = 0, 1, 2, 3 bags per flight option. The winner changes at every n.

### Why this matters (domestic example)

Spirit + 2 bags vs. Delta Basic Economy (domestic, no card):
- Spirit base: $89, bag 1: $45, bag 2: $55 → **$189 total**
- Delta Basic Economy: $159, bag 1: $35, bag 2: $45 → **$239 total**

Spirit looks $70 cheaper. With 2 bags, Delta is actually $50 cheaper. This is the primary value of the domestic comparison.

### Why this matters (international example — the original use case)

Family of 4 flying JFK→DEL (India), comparing Delta round-trip vs. two one-way tickets:
- Bags are **included free** in Economy on both Delta and most partners for this route
- The bag fee delta between options = $0
- The comparison now hinges entirely on: base fare difference, refund policy, layover routing, seat quality, and total travel time
- The pipeline should recognize this and shift the output matrix accordingly — bag count becomes irrelevant, flexibility and route quality become the decision factors

### Critical weight limit asymmetry

**Spirit's weight limit is 40 lbs, not 50 lbs.** All legacy carriers use 50 lbs. A standard packed suitcase at 45–48 lbs clears Delta/United/AA but triggers Spirit's overweight fee. The pipeline must apply the correct limit per airline when computing overweight fees.

```sql
CREATE TABLE baggage_fees (
  airline          TEXT NOT NULL,
  fare_class       TEXT NOT NULL,   -- BASIC_ECONOMY, ECONOMY, PREMIUM_ECONOMY, BUSINESS
  route_type       TEXT NOT NULL,   -- DOMESTIC, INTERNATIONAL
  carry_on_fee     NUMERIC,         -- NULL = included free
  bag_1_fee        NUMERIC,         -- NULL = included free (e.g. Delta INTL Economy = 0)
  bag_2_fee        NUMERIC,         -- NULL = included free
  bag_3_fee        NUMERIC,
  weight_limit_lbs NUMERIC,         -- 40 for Spirit, 50 for all others
  overweight_fee   NUMERIC,         -- per bag exceeding weight limit
  oversize_fee     NUMERIC,         -- per bag exceeding linear inch limit
  effective_date   DATE,
  last_scraped     TIMESTAMPTZ,
  source_url       TEXT
);
```

Sample rows that illustrate why route_type is a first-class column:
```
-- Delta Economy domestic: bags cost money
('Delta', 'ECONOMY', 'DOMESTIC', NULL, 35, 45, 150, 50, 100, 200, ...)

-- Delta Economy international: first bag free
('Delta', 'ECONOMY', 'INTERNATIONAL', NULL, 0, 45, 200, 50, 100, 200, ...)

-- Spirit domestic: everything paid, 40lb limit
('Spirit', 'ECONOMY', 'DOMESTIC', 50, 45, 55, 150, 40, 30, 100, ...)
```

---

## Fare Class Restriction Matrix

Basic Economy is a different product, not just a cheap Economy seat. This data is critical for the pipeline — restrictions vary significantly by airline.

### Carry-on access by fare class (verified 2025, domestic routes)

| Airline | Basic Economy checked bag (domestic) | Basic Economy checked bag (international) | Basic Economy overhead carry-on |
|---------|--------------------------------------|-------------------------------------------|---------------------------------|
| Delta | Paid ($35/$45) | **Free (1st bag included)** | Allowed (overhead bin) |
| United | Paid ($35/$45) | Free on most routes (route-dependent) | **NOT allowed** (personal item only) |
| American | Paid ($35/$45) | **Free (1st bag included)** | Allowed (overhead bin) |
| Alaska (Saver) | Paid ($35/$45) | Paid (typically) | **NOT allowed** (personal item only) |
| JetBlue (Blue Basic) | Paid ($35/$45) | Route-dependent | **NOT allowed** (personal item only) |
| Spirit | Everything paid | Everything paid | Everything paid |
| Frontier | Everything paid | Limited international flying | Everything paid; WORKS bundle changes this |

**Common inaccuracy to avoid:** Many sources say "Basic Economy never includes overhead carry-on" — this is wrong for Delta and AA on domestic routes. Also wrong to assume checked bags always cost money — on international routes, most legacy carrier Economy fares (including Basic Economy on Delta/AA) include the first checked bag free.

### Additional Basic Economy restrictions beyond bags

| Restriction | Delta BE | United BE | AA BE | Alaska Saver |
|-------------|----------|-----------|-------|--------------|
| Advance seat selection | No | No | No | No |
| Same-day changes | No | No | No | No |
| Itinerary changes | No | No | No | No |
| Upgrades | No | No | No | No |
| Boarding group | Last | Last | Last | Last |
| Miles earning | Reduced | Reduced | Reduced | Reduced |

Store this as a structured matrix keyed by `(airline, fare_class)`. Retrieve when the pipeline detects a Basic Economy fare in SerpAPI results and surface the full restriction list automatically.

### JetBlue's unique tier structure

JetBlue builds bag inclusion into fare tiers — not status or card based:

| Fare | Checked bag 1 | Checked bag 2 |
|------|--------------|--------------|
| Blue Basic | Paid ($35) | Paid ($45) |
| Blue | Paid ($35) | Paid ($45) |
| Blue Plus | **Free** | Paid ($45) |
| Blue Extra | **Free** | **Free** |
| Mint | Free | Free |

Blue Plus and Blue Extra have free bags baked into the fare price. The pipeline needs to detect this from the fare class code, not from status or card lookup.

### Frontier WORKS bundle

Frontier's base fare includes nothing. But the **WORKS bundle** (sold at booking) includes: 1 carry-on + 1 checked bag + seat selection + no change fee. If the scraped fare includes the bundle, the fee calculation is completely different. This bundle flag needs to be in the data model.

---

## Cancellation and Change Policy Analysis

### The automated pipeline's job (no user prompting)

On every search result, automatically surface:
1. **Can this ticket be changed?** → Yes / Fee amount / No
2. **Can this ticket be cancelled?** → Yes / Fee amount / No
3. **24-hour rule** → All US-sold tickets are cancellable within 24h of purchase (DOT rule). Flag this on every result.
4. **Basic Economy flag** → Automatically surface the restriction list when BE detected

### Cancellation policy tiers (metadata tags for every chunk)

| Tag | Description |
|-----|-------------|
| `RIGID` | Non-refundable, no changes allowed |
| `CHANGE_FEE` | Changes allowed for fee (typically $75–200) |
| `FLEXIBLE_CHANGE` | Free changes, non-refundable |
| `REFUNDABLE` | Fully refundable, changes free |
| `BASIC_ECONOMY` | No changes, no refund, fare class restrictions apply |

Tag every policy chunk with the tier — pipeline resolves via metadata filter, not semantic search.

### Refundable ticket breakeven

```
refundable_premium = refundable_fare - non_refundable_fare
```

Surface as: *"Refundable ticket costs $X more. Worth it if there's any real chance you'll cancel."* Don't decide for the user — surface the number.

---

## Credit Card Benefits Layer

A $35 bag fee on Delta might be $0 if the user has the Delta Gold Amex. The price comparison is wrong without this.

### Verified card benefits (2025)

| Card | Bags free | Companions covered | Trigger mechanism | Carrier-operated only |
|------|-----------|-------------------|-------------------|-----------------------|
| Delta SkyMiles Gold Amex | 1st bag | Up to 8 (same PNR) | SkyMiles account linkage (not payment) | Delta only |
| Delta SkyMiles Platinum Amex | 1st bag | Up to 8 (same PNR) | SkyMiles account linkage | Delta only |
| Delta SkyMiles Reserve Amex | 1st bag | Up to 8 (same PNR) | SkyMiles account linkage | Delta only |
| United Explorer (Chase) | 1st bag | **1 companion only** | Must pay with card | United only |
| United Quest (Chase) | 1st + 2nd bag | 1 companion only | Must pay with card | United only |
| United Club Infinite (Chase) | 1st + 2nd bag | 1 companion only | Must pay with card | United only |
| Alaska Airlines Visa (BofA) | 1st bag | Up to 6 (same PNR) | Must pay with card | Alaska only |
| Southwest Rapid Rewards Priority/Performance | 2 bags | All pax on reservation | Card ownership | Southwest only |
| Citi AAdvantage Platinum Select | 1st bag | Up to 4 (same PNR) | Must pay with card | AA only |
| Chase Sapphire Reserve | $300 travel credit (indirect) | N/A | Any travel purchase | Any airline |
| Amex Platinum | $200 airline fee credit/year (indirect) | N/A | Selected airline only | Selected airline |
| Capital One Venture X | **No bag benefit** | N/A | N/A | N/A |

### Critical corrections vs. commonly cited info

**Delta cards use account linkage, not point-of-sale payment.** Your SkyMiles number must be in the reservation AND the card must be linked to that SkyMiles account. More forgiving than United/Alaska/AA which require you to actually pay with the card.

**Delta Basic Economy qualifies for the free bag with the card.** This is the opposite of AA, where Basic Economy explicitly blocks the card benefit.

**AA Basic Economy does NOT qualify for the free bag card benefit**, even if you pay with the Citi AAdvantage card. The fare class overrides the card benefit.

**United Explorer covers only 1 companion** — not 6 or 8 like Delta/Alaska. A family of 3 does not all get the benefit.

**Southwest no longer universally offers 2 free bags (as of May 28, 2025).** WGA and WGA+ fares now charge for bags. Only Anytime, Business Select, A-List Preferred members, and SW credit card holders (Priority/Performance) retain free bags. This is one of the biggest changes in US airline history — many sources still have the old info.

**Capital One Venture X has no bag benefit at all.** The $300 "travel credit" requires booking through the Capital One portal and does not offset bag fees directly.

**United's OTA caveat:** The United Explorer card bag benefit requires booking on united.com or the United app. Booking through Expedia, Google Flights, or other OTAs can nullify the benefit at check-in. This should be flagged whenever a United fare is detected from a third-party source.

### The conditionality problem

Every card benefit has a condition tree that can't be flattened into a boolean:
- Delta: SkyMiles account must be linked to the card (not just owning the card)
- United/Alaska/AA: must pay with the card (not just have it)
- All cards: codeshare-operated flights excluded — operating carrier must match
- Companions: must be on the same PNR, within companion limit
- United: direct booking only (not OTA)

```json
{
  "card": "United Explorer",
  "issuer": "Chase",
  "airline": "United",
  "benefit_type": "baggage",
  "bags_free": 1,
  "trigger": "payment",
  "companion_limit": 1,
  "conditions": ["pay_with_card", "united_operated", "same_pnr", "direct_booking_only"],
  "effective_date": "2025-01",
  "source_url": "..."
}
```

### Codeshare rule (universal across all cards)

**The operating carrier determines eligibility, not the marketing carrier.**

- Delta-marketed flight operated by KLM: Delta card benefit does NOT apply
- United-marketed flight operated by Lufthansa: United card benefit does NOT apply
- Alaska-marketed flight operated by American: Alaska card benefit does NOT apply

This is the #1 gotcha on international itineraries. The pipeline must check operating carrier, not just the ticket number prefix.

### One-way tickets vs. round-trip

- **Delta:** Benefit applies per PNR via account linkage. Separate one-way bookings each qualify independently as long as the SkyMiles account is linked on each PNR.
- **United/Alaska/AA:** Payment-based — each separate one-way booking must be paid with the card. If one leg is redeemed with miles, only the cash leg qualifies.
- Round-trip is cleaner: one PNR, one payment transaction, benefit applies to both legs automatically.

---

## Points and Miles Analysis Layer

### Verified CPP valuations (2025, triangulated from TPG + NerdWallet + Upgraded Points)

| Program | CPP range | Best redemption path | Floor value |
|---------|-----------|---------------------|-------------|
| Chase Ultimate Rewards | 1.8–2.05¢ | Transfer to Hyatt or United (Star Alliance) | 1.0¢ (cash back), 1.5¢ (CSR portal) |
| Amex Membership Rewards | 1.8–2.2¢ | Air France Flying Blue, ANA | 0.6¢ (gift cards) |
| Capital One Miles | 1.7–1.85¢ | Turkish Miles&Smiles, Air Canada Aeroplan | 1.0¢ (cash back), 1.25¢ (portal) |
| AA AAdvantage | 1.5–1.7¢ | Partner awards (Cathay, Qatar); still has award chart | — |
| Southwest Rapid Rewards | ~1.5¢ | Revenue-based, nearly fixed CPP | — |
| United MileagePlus | 1.2–1.35¢ | Saver awards on Star Alliance partners | — |
| Delta SkyMiles | 1.1–1.2¢ | Highly variable (no award chart); Flash sales | — |
| World of Hyatt | 1.5–1.7¢ | Category 1–4 properties; best hotel program | — |
| Marriott Bonvoy | 0.6–0.7¢ | Generally poor; 3:1 transfer ratio to airlines | — |

**Delta and Marriott have the widest floor-to-ceiling spread.** The pipeline should show a range, not a single number, for variable programs.

### High-value non-obvious transfer paths

The pipeline should flag these automatically when relevant airlines appear in results:

- **Amex MR → Air France Flying Blue → Delta flights**: Flying Blue often prices Delta transcon routes at 7,500–12,500 miles vs. 25k+ SkyMiles. This is the primary way to redeem for Delta flights at better value than Delta's own program.
- **Chase UR → Hyatt**: Consistently returns 2.5–4.0¢/pt at Park Hyatt properties vs. the 2.05¢ program average.
- **Amex MR → ANA**: Round-trip business class to Japan ~88k miles, no fuel surcharges.
- **Amex MR → Virgin Atlantic → Delta One**: Transatlantic Delta One at ~50k miles one-way, often better than SkyMiles rates.
- **Cap1 → Turkish Miles&Smiles**: Domestic US Star Alliance awards from 7,500 miles each way.

### Transfer bonuses (time-sensitive metadata)

| Bonus | Frequency | Typical amount |
|-------|-----------|----------------|
| Amex MR → Flying Blue | 2–3x/year (Jan, May, Oct pattern) | 25–30% bonus |
| Amex MR → Avianca LifeMiles | 1–2x/year | 20–25% bonus |
| Amex MR → British Airways Avios | ~1x/year | 25–30% bonus |
| Amex MR → Virgin Atlantic | 1–2x/year | 20–30% bonus |
| Chase UR → United | Rare, ~1x/year | 10–20% bonus |

Transfer bonuses change effective CPP significantly. The pipeline should flag when a known bonus window is active and recalculate accordingly. Store with `active_from` / `active_until` timestamps and a `source_url` to the announcement.

### What the pipeline surfaces (automated, no user prompt)

1. **Cash-equivalent value of using points**: "Using 45,000 SkyMiles on this flight values each mile at 1.4¢ — above the 1.2¢ typical estimate. Reasonable redemption."
2. **Flag when cash beats points**: "Cash price $180. Using 30,000 Chase UR at 1.0¢ CPP (portal) = $300 equivalent. Buy cash."
3. **Flag transfer opportunities**: "You could transfer Amex MR to Flying Blue and book this Delta flight for ~10,000 miles vs. 25,000 SkyMiles."

Never recommend definitively. Surface the math; user decides.

---

## Airline Elite Status Layer

Status is resolved before card benefits — if the user has status, skip card benefit retrieval for that airline.

| Status | Free bags |
|--------|-----------|
| Delta Silver | 1 free bag |
| Delta Gold/Platinum/Diamond | 2–3 free bags |
| United Silver | 1 free bag |
| United Gold/Platinum/1K | 2 free bags |
| AA Gold | 1 free bag |
| AA Platinum / Platinum Pro / Executive Platinum | 2–3 free bags |
| Alaska MVP | 1 free bag |
| Alaska MVP Gold | 2 free bags |
| Alaska MVP Gold 75K | 3 free bags |
| SW A-List (post May 2025 change) | 1 free bag |
| SW A-List Preferred | 2 free bags (retained) |

---

## Nuanced Pipeline Enrichment Factors

These are automatically surfaced on every result — no user prompt required. Ranked by impact.

### Tier 1: High impact, invisible in raw flight data

**Codeshare vs. operated-by detection**
A "Delta" flight may be operated by SkyWest on a CRJ-200: no overhead bin, no Wi-Fi, no power, different upgrade eligibility. The booking class affects award earning. Card bag benefits don't apply.
- Storage: `(marketing_carrier, flight_number) → operating_carrier, aircraft_type`
- Update weekly from OAG or FlightAware
- Flag automatically: *"This flight is marketed by Delta but operated by SkyWest (CRJ-200)"*

**On-time performance by route + departure time**
The same route on the same airline can have 30% OTP variance by departure time. 6am (first bank) = 85%+ on time. 6pm at ORD/EWR/JFK = 55–65%. This is completely absent from every major OTA.
- Storage: `(carrier, origin, dest, departure_hour_bucket) → avg_delay_min, on_time_pct, cancel_pct`
- Source: BTS Form 41 data, update monthly
- Surface as a risk tier: green / yellow / red

**Minimum connection time (MCT) validation**
Airlines sell connections that technically meet published MCT but are operationally risky. JFK T4 → T2 with AirTrain: 45 min on paper, 60+ min in practice. International → domestic at ORD T5 or MIA: customs + recheck can take 90+ min.
- Storage: `(airport, terminal_from, terminal_to, connection_type) → mct_minutes, risk_notes`
- Flag connections within 15 min of MCT as "tight", under MCT as "invalid"
- Rule-based, not vector: pure lookup

**Recheck baggage requirement on US-entry connections**
US Customs requires ALL international arrivals to recheck bags before connecting domestically, even on a single itinerary. This is invisible in booking UIs and causes missed connections constantly.
- Rule-based logic (no retrieval needed): if `segment[i].dest.country == "US" AND segment[i].origin.country != "US"` → flag `recheck_required = true`, add 45–90 min buffer to effective MCT
- Flag automatically on any international → domestic connection

**Seat quality / aircraft type**
Two business class tickets at the same price on the same route can be lie-flat vs. angled-flat. A 737 MAX vs. A321neo have meaningfully different economy seat pitch. Completely invisible in raw flight data.
- Storage: `(aircraft_iata_type) → seat_config, lie_flat (bool), seat_pitch_economy_in, wifi, power_outlets`
- Source: SeatGuru / Aerolopa data
- Surface on every result: economy seat pitch, business class bed type (if applicable)

### Tier 2: Significant impact for specific scenarios

**Fuel surcharges on award bookings**
British Airways Avios on BA metal: $400–600 in YQ surcharges transatlantic. Lufthansa Group carries heavy surcharges through most programs. The "points cost" looks good; the cash fees at checkout are not.
- Storage: `(program, operating_carrier, cabin) → surcharge_range_usd` (categorical: none / low / moderate / high)
- Surface when points redemption is detected in the itinerary

**Visa / transit requirements for layover airports**
A US citizen transiting airside through Canada technically requires an eTA ($7). China, India, Russia have specific airside transit rules. Getting it wrong = denied boarding.
- Storage: `(passport_country, transit_country, transit_type) → visa_required (bool), permit_type, notes`
- Source: IATA Timatic
- Rule-based flag: any itinerary with a layover country that commonly requires transit documentation for US citizens

**Hidden city ticketing detection**
Booking NYC→DEN→LAX and deplaning in DEN when DEN is cheaper than a direct NYC→DEN ticket. Not illegal for leisure travelers but violates airline CoC — risks: account bans, miles confiscated, bags going to LAX, return leg auto-cancelled.
- Don't recommend it. If detected (fare to further city < fare to layover city), surface a structured warning with the risk factors listed.

**International "most permissive leg" rule**
If your itinerary includes an international segment, the most permissive baggage rule for the whole trip typically applies (e.g., the free international bag allowance covers your domestic connection). Airlines apply this inconsistently — AA and United tend to honor it; Delta reads it narrowly.
- Flag when a domestic connection is part of an international itinerary: *"International baggage allowance may apply to entire itinerary — confirm with airline at check-in"*

### Tier 3: Meaningful for specific traveler segments

**Child / infant fare rules**
Domestic lap infant: free on most US carriers. International: 10% of base fare (can be surprisingly large on premium cabins). Some carriers prohibit lap infants in exit rows / bulkhead. A family of 4 can face a $2,000+ surprise on an international itinerary.
- Storage: `(carrier, origin_region, dest_region, cabin, age_bucket) → fare_rule, seat_required`
- Retrieve when search includes infant/child traveler tag

**Unaccompanied minor (UM) policies**
Most carriers require UMs (ages 5–14) to book by phone, pay $150–200/segment, and prohibit tight connections. Budget carriers (Spirit, Frontier) have very limited UM programs.
- Storage: `(carrier) → um_age_min, um_age_max, um_fee_per_segment, connections_allowed, online_booking_allowed`
- Retrieve when traveler tag = unaccompanied_minor

**Military exception**
All major US carriers waive checked bag fees for active-duty military traveling on orders. Most also waive for leisure travel with military ID. This is a non-trivial exception — up to 5 free bags on Delta.
- Storage: rule per carrier, retrieve when user profile includes military status

---

## True Cost Calculation Model

The full pipeline runs this for **each flight option × each bag count scenario**:

```
base_fare
  + carry_on_fee                         // baggage_fees table
  + bag_fees(n_bags)                     // baggage_fees table (note Spirit's 40lb limit)
  + seat_selection_fee (if BE + user wants seat)  // fare_class_rules table
  - status_bag_waiver                    // user profile × status table (check first)
  - card_bag_waiver                      // user profile × card_benefits chunks (if no status)
  ± points_cash_equivalent (optional)    // points_valuations table
= true_out_of_pocket(n_bags)
```

Surface separately (risk/value judgment, not added to cost):
```
refundable_premium = refundable_fare - non_refundable_fare
cancellation_tier  = RIGID | CHANGE_FEE | FLEXIBLE_CHANGE | REFUNDABLE
otp_risk           = GREEN | YELLOW | RED
be_restrictions    = [...list of restrictions if Basic Economy detected]
operating_carrier  = flag if different from marketing carrier
recheck_required   = true/false
```

Result is a matrix, not a single number. The pipeline outputs a different matrix depending on route type:

**Domestic example (JFK → LAX):**

| | Spirit | Delta Basic Economy | Delta Economy |
|-|--------|---------------------|---------------|
| 0 bags | $89 | $159 | $189 |
| 1 bag | $134 | $194 | $224 |
| 1 bag + Delta Gold Amex | $134 | **$159** | **$189** |
| 2 bags | $189 | $239 | $269 |
| 2 bags + Delta Gold Amex | $189 | $204 | $234 |
| Carry-on | +$50 (paid) | Included | Included |
| Cancellation | RIGID | RIGID | CHANGE_FEE |

**International example (JFK → DEL, India — the original use case):**

| | Delta Economy (round-trip) | Delta outbound + Air India return |
|-|----------------------------|-----------------------------------|
| 0 bags | $1,200 | $980 |
| 1 bag | **$1,200** (free) | **$980** (free on both) |
| 2 bags | $1,245 ($45 2nd bag) | $1,025 ($45 2nd bag) |
| Card benefit on bag 1 | Irrelevant (already free) | Irrelevant (already free) |
| Cancellation | CHANGE_FEE | RIGID outbound / CHANGE_FEE return |
| Flexibility premium | +$150 for fully refundable | — |

On international routes, the comparison shifts away from bag fees entirely — the decision factors become base fare, refund policy, layover routing, and total travel time. The pipeline should detect this automatically and weight the output accordingly.

---

## Data Architecture Tiers

Different update cadences require different pipeline jobs:

**Static knowledge base (update monthly via BullMQ scheduled job)**
- CPP valuation table
- Aircraft type → seat quality metadata
- Airport MCT matrix
- Fare class restriction matrix (Basic Economy rules)
- Fuel surcharge estimates by program + carrier
- UM and infant fare rules
- Military exception rules

**Semi-static lookup (update weekly)**
- Baggage fee schedules (airlines change without announcement)
- Codeshare → operating carrier map (OAG)
- OTP stats from BTS Form 41
- Credit card benefit terms (changes less often but silently)
- Transfer bonus active windows (manually curated)

**Rule-based flags (no retrieval — pure logic at query time)**
- Recheck baggage requirement (international → US connection check)
- Transit visa requirement (passport + layover country lookup)
- Hidden city detection (compare fare to layover vs. final destination)
- MCT validation (connection time vs. MCT floor)
- OTA booking caveat (United fare sourced from non-United channel)

**Real-time (API call at query time — optional for v1)**
- Award seat availability (seats.aero, Point.me)
- Inbound aircraft delay risk (FlightAware)

---

## System Prompt Architecture

The pipeline is automated — no user prompts. The LLM receives a structured enrichment packet and produces structured output, not prose.

```
Inputs:
1. flight_comparison     — structured JSON (prices, airlines, fare classes, routes)
2. user_profile          — cards, status, bag count, flexibility posture, points balances
3. baggage_fees          — structured fee table for all airlines in results
4. fare_class_rules      — restriction matrix for all fare classes in results
5. card_benefits         — condition-tree chunks for user's cards × airlines in results
6. points_valuations     — current CPP + transfer bonus metadata for user's programs
7. enrichment_flags      — pre-computed rule-based flags (recheck, MCT, OTA caveat, etc.)

Rules:
- All fee/weight claims MUST come from baggage_fees or fare_class_rules
- All points value claims MUST cite CPP from points_valuations
- If a card benefit has conditions you cannot verify (e.g. "was this paid with the card?"),
  flag it: "Applies if paid with [card] and booked directly — confirm at checkout"
- If operating carrier differs from marketing carrier, flag it before computing card benefits
- Status waiver takes priority over card waiver — check status first
- Do not hallucinate fees, CPP values, or policy terms
- Output structured JSON (comparison matrix + flags), not prose
```

---

## Speed

**Parallel execution.** Kick off baggage fee lookup, OTP check, and MCT validation as soon as the search is submitted — you know the route before SerpAPI returns. Don't wait.

**Status-before-card short circuit.** If user has status on the airline, skip card benefit RAG retrieval entirely for that airline. Status always wins.

**Cache aggressively.** Delta's Economy bag fee doesn't change between two searches 5 minutes apart. Redis TTL: 24h+ for fee tables, 1h for OTP data, 7 days for CPP valuations.

**Top-3 chunk retrieval max.** More context = slower + more hallucination risk from irrelevant chunks slipping in.

**pgvector over managed vector DB.** Already have Postgres. No network hop, simpler ops, sufficient at this scale.

**Small model for structured enrichment.** Haiku for fee lookup + flag resolution. Sonnet for the comparison recommendation reasoning. Don't use Sonnet for things that are just table lookups.

---

## Data Sourcing

| Data type | Source | Cadence |
|-----------|--------|---------|
| Baggage fee schedules | Scrape airline fee pages (delta.com/baggage, united.com/baggage, etc.) | Weekly |
| Fare class restrictions | Scrape airline Basic Economy comparison pages | Monthly |
| Cancellation/change policies | Scrape airline fare rules pages | Monthly |
| Card benefit terms | Scrape issuer benefit pages (Amex, Chase, Citi, BofA) | Monthly |
| Points CPP valuations | Scrape TPG + Upgraded Points valuation pages | Monthly |
| Transfer bonus windows | TPG deal alerts + manually curated | As announced |
| OTP statistics | BTS Form 41 (public, bulk download) | Monthly |
| Codeshare/operating carrier map | OAG (paid) or FlightAware (API) | Weekly |
| Aircraft seat metadata | SeatGuru / Aerolopa | As updated |
| MCT by airport + terminal | IATA SSIM / OAG MCT data | Quarterly |
| Transit visa rules | IATA Timatic | Monthly |
| Historical pricing | Accumulate SerpAPI `rawData` already being stored | Continuous |

---

## Items Requiring Live Verification Before Shipping

1. **Southwest bag fee amounts** — policy changed May 2025, exact fee amounts for WGA/WGA+ were still being finalized at training cutoff (~$35/$45 expected, verify on southwest.com)
2. **United Explorer OTA rule** — confirm whether OTA-booked United tickets still disqualify the card bag benefit in 2026
3. **Alaska/Hawaiian integration** — confirm whether Hawaiian-operated routes now fully follow Alaska card bag benefit rules
4. **Delta Basic Economy overhead bin** — enforcement is inconsistent; confirm current status
5. **Spirit network post-bankruptcy** — confirm current route coverage and fee structure
6. **Amex Platinum eligible incidental fee categories** — Amex adjusts this list periodically; confirm bag fees still qualify

---

## Pre-Build Decision Checklist

**Infrastructure**
- [ ] pgvector extension on existing Postgres vs. separate vector DB?
- [ ] Embedding model: text-embedding-3-small (cheap, fast) vs. text-embedding-3-large?
- [ ] Model per task: Haiku for structured enrichment, Sonnet for recommendation reasoning?
- [ ] Redis TTL per data type (fees: 24h, OTP: 1h, CPP: 7 days)?

**Data coverage for launch**
- [ ] Airlines: Delta, United, AA, Southwest, Alaska, JetBlue, Spirit, Frontier?
- [ ] Cards: Delta Gold/Platinum Amex, United Explorer, Alaska Visa, Citi AAdvantage, CSR, Amex Plat?
- [ ] Points programs: Chase UR, Amex MR, Delta, United, AA, Southwest?
- [ ] Tier 1 enrichment flags: codeshare, OTP, MCT, recheck requirement, seat quality?

**Schema decisions**
- [ ] `baggage_fees` table — include Spirit's 40lb weight limit field
- [ ] `fare_class_rules` table — carry-on access boolean is critical
- [ ] Card benefit condition tree schema — trigger type (payment vs. account linkage)
- [ ] User profile schema — which fields required vs. optional at signup?
- [ ] Transfer bonus table with `active_from` / `active_until` timestamps

**Product inputs**
- [ ] Add bag count to search form (0 / 1 / 2 / 3+)
- [ ] Add flexibility posture (committed vs. flexible)
- [ ] Add user profile (cards, status, points) — required or optional with anonymous fallback?

**Architecture**
- [ ] Parallel enrichment pipeline running alongside SerpAPI scrape?
- [ ] Status-before-card short circuit in benefit resolution?
- [ ] Anonymous mode: show base fare matrix only, prompt to add profile for full analysis?
- [ ] OTA booking caveat detection for United fares?
