---
doc_type: cards
as_of: 2025-08
review_after: 2025-11
sources:
  - thepointsguy.com
  - card issuer benefit terms (Amex, Chase, BofA, Citi)
---

# Credit Card Bag Benefits — Reference

## Verified Card Benefits (2025)

| Card | Bags free | Companions covered | How it triggers | Carrier-operated only |
|------|-----------|-------------------|-----------------|----------------------|
| Delta SkyMiles Gold Amex | 1st bag | Up to 8 (same booking) | SkyMiles account linked to card | Delta only |
| Delta SkyMiles Platinum Amex | 1st bag | Up to 8 (same booking) | SkyMiles account linked to card | Delta only |
| Delta SkyMiles Reserve Amex | 1st bag | Up to 8 (same booking) | SkyMiles account linked to card | Delta only |
| United Explorer (Chase) | 1st bag | 1 companion only | Must pay with card | United only |
| United Quest (Chase) | 1st + 2nd bag | 1 companion only | Must pay with card | United only |
| United Club Infinite (Chase) | 1st + 2nd bag | 1 companion only | Must pay with card | United only |
| Alaska Airlines Visa (BofA) | 1st bag | Up to 6 (same booking) | Must pay with card | Alaska only |
| SW Rapid Rewards Priority/Performance | 2 bags | All pax on booking | Card ownership | Southwest only |
| Citi AAdvantage Platinum Select | 1st bag | Up to 4 (same booking) | Must pay with card | AA only |
| Chase Sapphire Reserve | $300 travel credit (indirect) | N/A | Any travel purchase | Any airline |
| Amex Platinum | $200 airline fee credit/year (indirect) | N/A | Selected airline only | Selected airline |
| Capital One Venture X | **No bag benefit** | — | — | — |

---

## Quick Lookup by Airline

The table above embeds poorly against natural-language "what about [airline]" questions — this section restates the same facts as one plain-language sentence per airline so a query naming a specific carrier retrieves the right answer.

- **Delta:** SkyMiles Gold, Platinum, and Reserve Amex cards (all issuers Amex) waive the first checked bag for up to 8 companions on the same booking — the trigger is having your SkyMiles number linked to the card, not paying with it.
- **United:** United Explorer, Quest, and Club Infinite (all Chase) waive the first checked bag when you pay with the card — Explorer and Quest cover only 1 companion. Direct booking on united.com or the United app is required; third-party OTA bookings (Expedia, Google Flights, Kayak) can void the benefit at check-in.
- **Alaska:** The Alaska Airlines Visa (BofA) waives the first bag for up to 6 companions on the same booking when you pay with the card.
- **American (AA):** Citi AAdvantage Platinum Select waives the first bag for up to 4 companions when you pay with the card.
- **Southwest:** Rapid Rewards Priority/Performance cardholders get 2 free bags for all passengers on the booking automatically (card ownership, no payment condition required) — but as of May 28, 2025 this only applies to Anytime, Business Select, and A-List Preferred fares; Wanna Get Away and WGA+ fares now charge for bags regardless of card.
- **Any airline (indirect credits, not waivers):** Chase Sapphire Reserve's $300 travel credit and Amex Platinum's $200 airline fee credit can offset bag fees but aren't airline-specific waivers, and don't apply automatically. Capital One Venture X has no bag benefit at all.
- **Frontier, Spirit, JetBlue, Allegiant, Hawaiian, and other carriers not listed above:** no verified airline-branded baggage waiver for these carriers is in this reference — don't assume one exists without checking the card's current terms.

---

## Key Corrections (Things Commonly Cited Incorrectly)

**Delta cards trigger via account linkage, not payment.** Your SkyMiles number must be in the booking AND the card linked to that account. You don't have to pay with the Delta Amex — you just have to have it linked. This is more forgiving than United/Alaska/AA which require payment with the card.

**Delta Basic Economy qualifies for the free bag with the card.** AA Basic Economy does not — the fare class overrides the card benefit on American.

**United Explorer covers 1 companion only.** Not 6 or 8 like Delta/Alaska. A group of 3 doesn't all get the benefit.

**Southwest no longer universally offers 2 free bags (as of May 28, 2025).** Wanna Get Away and WGA+ fares now charge for bags (~$35/$45). Only Anytime, Business Select, A-List Preferred, and SW credit card holders (Priority/Performance) kept the free bag benefit. Many sources still have the old info.

**Capital One Venture X has zero bag benefit.** The $300 "travel credit" requires booking through the Capital One portal and doesn't offset bag fees.

**United requires direct booking.** The United Explorer card bag benefit requires booking on united.com or the app. OTA bookings (Expedia, Google Flights, Kayak) can nullify the benefit at check-in. Flag this whenever a United fare is sourced from a third-party channel.

---

## The Codeshare Rule

**The operating carrier determines benefit eligibility — not the marketing carrier.**

- Delta-marketed flight operated by KLM → Delta card does NOT apply
- United-marketed flight operated by Lufthansa → United card does NOT apply
- Alaska-marketed flight operated by American → Alaska card does NOT apply

The pipeline must check operating carrier, not just the ticket number prefix. This catches the most common international itinerary gotcha.

---

## How the Benefit Triggers Differ

| Card type | Trigger | Implication |
|-----------|---------|-------------|
| Delta Amex (all) | SkyMiles account linked to card | More forgiving — applies to separate one-way bookings as long as account is linked on each PNR |
| United cards | Payment with card | Each booking must be paid on the card; miles redemption legs don't qualify |
| Alaska Visa | Payment with card | Same — each booking must be paid on the card |
| Citi AAdvantage | Payment with card | Same |
| SW Priority/Performance | Card ownership | Automatic — no payment condition |

---

## International vs. Domestic Bag Benefit Value

On international routes, many airlines already include the first checked bag free in Economy (Delta, United on most routes, AA). If the bag is already free, the card benefit saves $0 on that leg — the waiver is redundant.

The pipeline must check `bag_1_fee(route_type)` before computing card savings. If the fee is already $0 (international), skip the card waiver calculation for that leg.

---

## Chunk Metadata Schema

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
  "last_verified": "2025-08",
  "source_url": "..."
}
```

---

## Items Requiring Live Verification Before Shipping

- Southwest exact bag fee amounts for WGA/WGA+ (were still being finalized mid-2025)
- United OTA booking rule — confirm still applies in 2026
- Alaska/Hawaiian merger — confirm whether Hawaiian-operated routes now qualify under Alaska card
- Amex Platinum eligible incidental fee categories — Amex adjusts this list periodically
