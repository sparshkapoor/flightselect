"""
One-time seed: python -m rag.seed_dot_airfares

Fetches the US DOT BTS Consumer Airfare Report (Table 1a) via the Socrata CSV
API and writes data/flights/dot_airfares.csv in the schema rag.ingest expects
(origin,destination,date,price,airline,duration_minutes). Ingest it with:

    python -m rag.ingest data/flights/dot_airfares.csv

Scope: Table 1a covers ~1,000 real US contiguous-state metro-area city-pairs
with quarterly average fares (public domain, not synthetic). Its `city1`/
`city2` fields are metro-area names, not airport codes — CITY_TO_IATA below
maps each to its primary commercial airport so the seeded `origin`/
`destination` metadata matches the IATA codes the app's searches use (see
rag/server.py's exact-match `where` filter). Metro areas with no confident
single-airport mapping (small regional markets) are skipped and logged
rather than guessed. International routes (e.g. YYZ) aren't in this dataset
at all and keep relying on the organic per-search ingestion that already
runs via search.job.ts.
"""
import csv
import logging
import sys
import urllib.request
from pathlib import Path

logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

SOCRATA_URL = "https://data.transportation.gov/resource/4f3n-jbg2.csv?$limit={limit}"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "flights" / "dot_airfares.csv"
FETCH_LIMIT = 20000

# Maps this dataset's `city1`/`city2` metro-area strings (verbatim) to the
# metro's primary commercial airport. Only metros we're confident about are
# included — see module docstring.
CITY_TO_IATA: dict[str, str] = {
    "Ashland, WV": "HTS",
    "Belleville, IL": "BLV",
    "Everett, WA": "PAE",
    "Hilton Head, SC": "HHH",
    "Latrobe, PA": "LBE",
    "Lubbock, TX": "LBB",
    "Midland/Odessa, TX": "MAF",
    "Mission/McAllen/Edinburg, TX": "MFE",
    "Montrose/Delta, CO": "MTJ",
    "New Haven, CT": "HVN",
    "Provo, UT": "PVU",
    "Rapid City, SD": "RAP",
    "Springfield, IL": "SPI",
    "St. Cloud, MN": "STC",
    "Steamboat Springs, CO": "HDN",
    "Stockton, CA": "SCK",
    "Toledo, OH": "TOL",
    "Traverse City, MI": "TVC",
    "Trenton, NJ": "TTN",
    "Vero Beach, FL": "VRB",
    "West Palm Beach/Palm Beach, FL": "PBI",
    "Wichita, KS": "ICT",
    "Wilmington, NC": "ILM",
    "Worcester, MA": "ORH",
    "Albany, NY": "ALB",
    "Albuquerque, NM": "ABQ",
    "Allentown/Bethlehem/Easton, PA": "ABE",
    "Amarillo, TX": "AMA",
    "Appleton, WI": "ATW",
    "Asheville, NC": "AVL",
    "Aspen, CO": "ASE",
    "Atlanta, GA (Metropolitan Area)": "ATL",
    "Atlantic City, NJ": "ACY",
    "Austin, TX": "AUS",
    "Bangor, ME": "BGR",
    "Baton Rouge, LA": "BTR",
    "Bellingham, WA": "BLI",
    "Bend/Redmond, OR": "RDM",
    "Billings, MT": "BIL",
    "Birmingham, AL": "BHM",
    "Bismarck/Mandan, ND": "BIS",
    "Bloomington/Normal, IL": "BMI",
    "Boise, ID": "BOI",
    "Boston, MA (Metropolitan Area)": "BOS",
    "Bozeman, MT": "BZN",
    "Buffalo, NY": "BUF",
    "Burlington, VT": "BTV",
    "Cedar Rapids/Iowa City, IA": "CID",
    "Charleston, SC": "CHS",
    "Charlotte, NC": "CLT",
    "Charlottesville, VA": "CHO",
    "Chattanooga, TN": "CHA",
    "Chicago, IL": "ORD",
    "Cincinnati, OH": "CVG",
    "Cleveland, OH (Metropolitan Area)": "CLE",
    "Colorado Springs, CO": "COS",
    "Columbia, SC": "CAE",
    "Columbus, OH": "CMH",
    "Corpus Christi, TX": "CRP",
    "Dallas/Fort Worth, TX": "DFW",
    "Daytona Beach, FL": "DAB",
    "Dayton, OH": "DAY",
    "Denver, CO": "DEN",
    "Des Moines, IA": "DSM",
    "Detroit, MI": "DTW",
    "Eagle, CO": "EGE",
    "El Paso, TX": "ELP",
    "Eugene, OR": "EUG",
    "Eureka/Arcata, CA": "ACV",
    "Fargo, ND": "FAR",
    "Fayetteville, AR": "XNA",
    "Flint, MI": "FNT",
    "Fort Myers, FL": "RSW",
    "Fort Wayne, IN": "FWA",
    "Fresno, CA": "FAT",
    "Grand Forks, ND": "GFK",
    "Grand Rapids, MI": "GRR",
    "Great Falls, MT": "GTF",
    "Green Bay, WI": "GRB",
    "Greensboro/High Point, NC": "GSO",
    "Greenville/Spartanburg, SC": "GSP",
    "Gulfport/Biloxi, MS": "GPT",
    "Harlingen/San Benito, TX": "HRL",
    "Harrisburg, PA": "MDT",
    "Hartford, CT": "BDL",
    "Houston, TX": "IAH",
    "Huntsville, AL": "HSV",
    "Idaho Falls, ID": "IDA",
    "Indianapolis, IN": "IND",
    "Jackson/Vicksburg, MS": "JAN",
    "Jacksonville, FL": "JAX",
    "Jackson, WY": "JAC",
    "Kalispell, MT": "FCA",
    "Kansas City, MO": "MCI",
    "Key West, FL": "EYW",
    "Knoxville, TN": "TYS",
    "Lansing, MI": "LAN",
    "Laredo, TX": "LRD",
    "Las Vegas, NV": "LAS",
    "Lexington, KY": "LEX",
    "Little Rock, AR": "LIT",
    "Los Angeles, CA (Metropolitan Area)": "LAX",
    "Louisville, KY": "SDF",
    "Madison, WI": "MSN",
    "Martha's Vineyard, MA": "MVY",
    "Medford, OR": "MFR",
    "Melbourne, FL": "MLB",
    "Memphis, TN": "MEM",
    "Miami, FL (Metropolitan Area)": "MIA",
    "Milwaukee, WI": "MKE",
    "Minneapolis/St. Paul, MN": "MSP",
    "Minot, ND": "MOT",
    "Missoula, MT": "MSO",
    "Myrtle Beach, SC": "MYR",
    "Nantucket, MA": "ACK",
    "Nashville, TN": "BNA",
    "New Orleans, LA": "MSY",
    "New York City, NY (Metropolitan Area)": "JFK",
    "Norfolk, VA (Metropolitan Area)": "ORF",
    "Oklahoma City, OK": "OKC",
    "Omaha, NE": "OMA",
    "Orlando, FL": "MCO",
    "Palm Springs, CA": "PSP",
    "Panama City, FL": "ECP",
    "Pasco/Kennewick/Richland, WA": "PSC",
    "Paso Robles/San Luis Obispo, CA": "SBP",
    "Pensacola, FL": "PNS",
    "Peoria, IL": "PIA",
    "Philadelphia, PA": "PHL",
    "Phoenix, AZ": "PHX",
    "Pittsburgh, PA": "PIT",
    "Portland, ME": "PWM",
    "Portland, OR": "PDX",
    "Punta Gorda, FL": "PGD",
    "Raleigh/Durham, NC": "RDU",
    "Reno, NV": "RNO",
    "Richmond, VA": "RIC",
    "Rochester, NY": "ROC",
    "Rockford, IL": "RFD",
    "Sacramento, CA": "SMF",
    "Salt Lake City, UT": "SLC",
    "San Antonio, TX": "SAT",
    "San Diego, CA": "SAN",
    "Sanford, FL": "SFB",
    "San Francisco, CA (Metropolitan Area)": "SFO",
    "Santa Barbara, CA": "SBA",
    "Santa Rosa, CA": "STS",
    "Sarasota/Bradenton, FL": "SRQ",
    "Savannah, GA": "SAV",
    "Seattle, WA": "SEA",
    "Sioux Falls, SD": "FSD",
    "South Bend, IN": "SBN",
    "Spokane, WA": "GEG",
    "Springfield, MO": "SGF",
    "St. Louis, MO": "STL",
    "Syracuse, NY": "SYR",
    "Tallahassee, FL": "TLH",
    "Tampa, FL (Metropolitan Area)": "TPA",
    "Tucson, AZ": "TUS",
    "Tulsa, OK": "TUL",
    "Valparaiso, FL": "VPS",
    "Washington, DC (Metropolitan Area)": "DCA",
}

QUARTER_TO_MONTH = {"1": "02", "2": "05", "3": "08", "4": "11"}


def _representative_date(year: str, quarter: str) -> str:
    month = QUARTER_TO_MONTH.get(quarter, "01")
    return f"{year}-{month}-15"


def _duration_minutes(nsmiles: float) -> int:
    # Rough cruise-speed estimate (~480mph) plus taxi/climb/descent overhead —
    # this dataset has no duration field, only distance.
    return round(nsmiles / 8 + 30)


def fetch_rows(limit: int = FETCH_LIMIT) -> list[dict]:
    url = SOCRATA_URL.format(limit=limit)
    logger.info("Fetching %s", url)
    with urllib.request.urlopen(url, timeout=60) as resp:
        text = resp.read().decode("utf-8")
    return list(csv.DictReader(text.splitlines()))


def build_rows(raw_rows: list[dict]) -> list[dict]:
    out: list[dict] = []
    skipped_cities: set[str] = set()

    for row in raw_rows:
        city1, city2 = row.get("city1", ""), row.get("city2", "")
        iata1, iata2 = CITY_TO_IATA.get(city1), CITY_TO_IATA.get(city2)
        if not iata1 or not iata2:
            if city1 and not iata1:
                skipped_cities.add(city1)
            if city2 and not iata2:
                skipped_cities.add(city2)
            continue

        try:
            fare = float(row["fare"])
            nsmiles = float(row["nsmiles"])
        except (ValueError, KeyError, TypeError):
            continue
        if fare <= 0 or nsmiles <= 0:
            continue

        date = _representative_date(row.get("year", ""), row.get("quarter", ""))
        duration = _duration_minutes(nsmiles)
        airline = row.get("carrier_lg") or "Unknown"

        # Emit both directions so either search direction matches.
        out.append({
            "origin": iata1, "destination": iata2, "date": date,
            "price": f"{fare:.2f}", "airline": airline, "duration_minutes": str(duration),
        })
        out.append({
            "origin": iata2, "destination": iata1, "date": date,
            "price": f"{fare:.2f}", "airline": airline, "duration_minutes": str(duration),
        })

    if skipped_cities:
        logger.info(
            "Skipped %d metro areas with no confident IATA mapping: %s",
            len(skipped_cities), sorted(skipped_cities),
        )
    return out


def write_csv(rows: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh, fieldnames=["origin", "destination", "date", "price", "airline", "duration_minutes"]
        )
        writer.writeheader()
        writer.writerows(rows)
    logger.info("Wrote %d rows to %s", len(rows), OUTPUT_PATH)


def main() -> None:
    raw_rows = fetch_rows()
    logger.info("Fetched %d raw DOT BTS rows", len(raw_rows))
    rows = build_rows(raw_rows)
    if not rows:
        logger.error("No rows mapped to IATA codes — nothing written")
        sys.exit(1)
    write_csv(rows)
    logger.info("Done. Ingest with: python -m rag.ingest data/flights/dot_airfares.csv")


if __name__ == "__main__":
    main()
