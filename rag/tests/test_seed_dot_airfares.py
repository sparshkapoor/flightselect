"""
Functional test for the DOT BTS seed's transform step: real Socrata-shaped
rows in, real rag.ingest-shaped CSV rows out. The risk surface here is the
city-name -> IATA mapping and the both-directions emission, not network I/O —
fetch_rows (the actual HTTP call) is exercised manually, not in CI.
"""
from rag.seed_dot_airfares import build_rows


def _raw_row(city1, city2, fare="208.11", nsmiles="1118", year="2025", quarter="4", carrier="DL"):
    return {
        "year": year, "quarter": quarter,
        "city1": city1, "city2": city2,
        "nsmiles": nsmiles, "fare": fare, "carrier_lg": carrier,
    }


def test_known_city_pair_emits_both_directions_with_mapped_iata_codes():
    rows = build_rows([_raw_row("Miami, FL (Metropolitan Area)", "New York City, NY (Metropolitan Area)")])

    assert len(rows) == 2
    assert {r["origin"] for r in rows} == {"MIA", "JFK"}
    assert {r["destination"] for r in rows} == {"MIA", "JFK"}
    forward = next(r for r in rows if r["origin"] == "MIA")
    assert forward["destination"] == "JFK"
    assert forward["price"] == "208.11"
    assert forward["airline"] == "DL"


def test_quarter_maps_to_a_representative_month_within_the_year():
    rows = build_rows([_raw_row("Chicago, IL", "Denver, CO", year="2024", quarter="2")])
    assert rows[0]["date"] == "2024-05-15"


def test_duration_is_estimated_from_distance():
    rows = build_rows([_raw_row("Chicago, IL", "Denver, CO", nsmiles="888")])
    # nsmiles/8 + 30, rounded
    assert rows[0]["duration_minutes"] == str(round(888 / 8 + 30))


def test_unmapped_city_is_skipped_not_guessed():
    rows = build_rows([_raw_row("Nowhereville, ZZ", "Chicago, IL")])
    assert rows == []


def test_zero_or_invalid_fare_is_skipped():
    rows = build_rows([_raw_row("Chicago, IL", "Denver, CO", fare="0")])
    assert rows == []
