# Points & Miles — Reference

## CPP Valuations (2025)

CPP = cents per point. How much one point is worth in travel value at a good redemption. Triangulated from TPG, NerdWallet, and Upgraded Points as of mid-2025.

| Program | CPP range | Best redemption | Floor (worst use) |
|---------|-----------|-----------------|-------------------|
| Chase Ultimate Rewards | 1.8–2.05¢ | Transfer to Hyatt or United (Star Alliance) | 1.0¢ cash back / 1.5¢ portal |
| Amex Membership Rewards | 1.8–2.2¢ | Air France Flying Blue, ANA | 0.6¢ gift cards |
| Capital One Miles | 1.7–1.85¢ | Turkish Miles&Smiles, Air Canada Aeroplan | 1.0¢ cash back / 1.25¢ portal |
| AA AAdvantage | 1.5–1.7¢ | Partner awards (Cathay Pacific, Qatar) | — |
| Southwest Rapid Rewards | ~1.5¢ | Revenue-based; nearly fixed CPP | — |
| United MileagePlus | 1.2–1.35¢ | Saver awards on Star Alliance partners | — |
| Delta SkyMiles | 1.1–1.2¢ | Off-peak domestic, Flash sales | — |
| World of Hyatt | 1.5–1.7¢ | Category 1–4 properties | — |
| Marriott Bonvoy | 0.6–0.7¢ | Generally poor transfer destination | — |

**Delta and Marriott have the widest floor-to-ceiling spread.** Show a range for these programs, not a single number.

---

## Best Non-Obvious Transfer Paths

The pipeline should flag these automatically when the relevant airline appears in search results.

**Amex MR → Air France Flying Blue → Delta flights**
Flying Blue often prices Delta transcon routes at 7,500–12,500 miles vs. 25,000+ SkyMiles. This is the main way to book Delta flights at better value than Delta's own program. Flag any time Delta appears in results and user has Amex MR.

**Chase UR → Hyatt**
Consistently returns 2.5–4.0¢/pt at Park Hyatt properties vs. the 2.05¢ program average. Not flight-specific but worth surfacing if the itinerary involves a hotel night.

**Amex MR → ANA Mileage Club**
Round-trip business class to Japan ~88k miles, no fuel surcharges.

**Amex MR → Virgin Atlantic → Delta One transatlantic**
~50k miles one-way, often better than Delta's own SkyMiles rate.

**Capital One → Turkish Miles&Smiles**
Domestic US Star Alliance awards from 7,500 miles each way. Can be dramatically cheaper than United MileagePlus on the same United flight.

---

## Transfer Bonuses (Time-Sensitive)

These are periodic promotions that temporarily increase effective CPP. The pipeline should flag when one is active.

| Transfer | Frequency | Typical bonus |
|----------|-----------|---------------|
| Amex MR → Flying Blue | 2–3x/year (Jan, May, Oct pattern) | 25–30% |
| Amex MR → Avianca LifeMiles | 1–2x/year | 20–25% |
| Amex MR → British Airways Avios | ~1x/year | 25–30% |
| Amex MR → Virgin Atlantic | 1–2x/year | 20–30% |
| Chase UR → United | Rare, ~1x/year | 10–20% |

Store with `active_from` / `active_until` timestamps. Recalculate effective CPP when a bonus is active.

---

## What the Pipeline Surfaces Automatically

Never recommends definitively. Surfaces the math; user decides.

1. **Cash-equivalent value**: "Using 45,000 SkyMiles on this flight values each mile at 1.4¢ — above the 1.2¢ typical estimate. Reasonable redemption."
2. **Flag when cash beats points**: "Cash price $180. Redeeming 30,000 Chase UR through the portal at 1.0¢ = $300 equivalent. Buy cash."
3. **Flag transfer opportunity**: "You could transfer Amex MR to Flying Blue and book this Delta flight for ~10,000 miles instead of 25,000 SkyMiles."
4. **Flag active bonus**: "Amex MR → Flying Blue currently has a 30% transfer bonus. Effective CPP increases to ~2.6¢."

---

## Storage Schema

```sql
CREATE TABLE points_valuations (
  program          TEXT PRIMARY KEY,
  cpp_low_cents    NUMERIC(4,2),
  cpp_high_cents   NUMERIC(4,2),
  best_use         TEXT,
  floor_use        TEXT,
  source           TEXT,
  as_of_date       DATE
);

CREATE TABLE transfer_bonuses (
  id               SERIAL PRIMARY KEY,
  from_program     TEXT,
  to_program       TEXT,
  bonus_pct        INT,
  active_from      DATE,
  active_until     DATE,
  source_url       TEXT
);
```

---

## Live Verification

CPP valuations shift quarterly. Before shipping, pull current numbers from:
- thepointsguy.com/guide/monthly-valuations/
- upgradedpoints.com/travel/best-credit-card-points-valuations/

Both pages are structured enough to scrape reliably on a monthly schedule.
