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
