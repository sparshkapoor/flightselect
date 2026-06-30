-- Idempotent schema — safe to run on every startup
DO $$ BEGIN CREATE TYPE "CabinClass" AS ENUM ('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "TripType" AS ENUM ('ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "TripType" ADD VALUE IF NOT EXISTS 'MULTI_CITY';

DO $$ BEGIN CREATE TYPE "RecommendedOption" AS ENUM ('ROUND_TRIP', 'ONE_WAY', 'MIXED', 'MULTI_CITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "RecommendedOption" ADD VALUE IF NOT EXISTS 'MULTI_CITY';

DO $$ BEGIN CREATE TYPE "SearchStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "User" (
    "id"                TEXT        NOT NULL PRIMARY KEY,
    "email"             TEXT        NOT NULL UNIQUE,
    "displayName"       TEXT,
    "preferredCurrency" TEXT        NOT NULL DEFAULT 'USD',
    "homeAirport"       TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SearchQuery" (
    "id"                        TEXT           NOT NULL PRIMARY KEY,
    "originAirport"             TEXT           NOT NULL,
    "destinationAirport"        TEXT           NOT NULL,
    "departureDate"             TIMESTAMP(3)   NOT NULL,
    "returnDate"                TIMESTAMP(3),
    "tripType"                  "TripType"     NOT NULL,
    "passengers"                INTEGER        NOT NULL DEFAULT 1,
    "cabinClass"                "CabinClass"   NOT NULL DEFAULT 'ECONOMY',
    "maxLayovers"               INTEGER,
    "maxTotalDurationMinutes"   INTEGER,
    "preferredLayoverAirports"  TEXT[],
    "avoidedAirlines"           TEXT[],
    "preferredAirlines"         TEXT[],
    "flexibleDates"             BOOLEAN        NOT NULL DEFAULT false,
    "flexibleDateRangeDays"     INTEGER,
    "includeNearbyAirports"     BOOLEAN        NOT NULL DEFAULT false,
    "nearbyRadiusMiles"         INTEGER,
    "status"                    "SearchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"                 TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"                    TEXT           REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
ALTER TABLE "SearchQuery" ADD COLUMN IF NOT EXISTS "includeNearbyAirports" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SearchQuery" ADD COLUMN IF NOT EXISTS "nearbyRadiusMiles" INTEGER;

-- Multi-city only: one row per leg of the trip (always one-way). Flight rows belonging to
-- a leg reference it via Flight.searchLegId — necessary because a multi-city trip can repeat
-- the same airport pair on different dates (e.g. EWR->LAS twice), so legs can't be disambiguated
-- by (originAirport, destinationAirport) alone the way the 2-leg round-trip flow does.
CREATE TABLE IF NOT EXISTS "SearchLeg" (
    "id"                TEXT         NOT NULL PRIMARY KEY,
    "searchQueryId"     TEXT         NOT NULL REFERENCES "SearchQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "legIndex"          INTEGER      NOT NULL,
    "originAirport"     TEXT         NOT NULL,
    "destinationAirport" TEXT        NOT NULL,
    "departureDate"     TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "SearchLeg_searchQueryId_idx" ON "SearchLeg"("searchQueryId");

CREATE TABLE IF NOT EXISTS "Flight" (
    "id"                    TEXT         NOT NULL PRIMARY KEY,
    "airline"               TEXT         NOT NULL,
    "flightNumber"          TEXT         NOT NULL,
    "departureAirport"      TEXT         NOT NULL,
    "arrivalAirport"        TEXT         NOT NULL,
    "departureTime"         TIMESTAMP(3) NOT NULL,
    "arrivalTime"           TIMESTAMP(3) NOT NULL,
    "durationMinutes"       INTEGER      NOT NULL,
    "price"                 DECIMAL(65,30) NOT NULL,
    "currency"              TEXT         NOT NULL DEFAULT 'USD',
    "cabinClass"            "CabinClass" NOT NULL,
    "isLayover"             BOOLEAN      NOT NULL DEFAULT false,
    "layoverAirport"        TEXT,
    "layoverDurationMinutes" INTEGER,
    "source"                TEXT         NOT NULL,
    "scrapedAt"             TIMESTAMP(3) NOT NULL,
    "bookingUrl"            TEXT,
    "rawData"               JSONB,
    "searchQueryId"         TEXT         NOT NULL REFERENCES "SearchQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "searchLegId"           TEXT         REFERENCES "SearchLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "Flight" ADD COLUMN IF NOT EXISTS "searchLegId" TEXT REFERENCES "SearchLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Comparison" (
    "id"                        TEXT              NOT NULL PRIMARY KEY,
    "searchQueryId"             TEXT              NOT NULL REFERENCES "SearchQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "roundTripFlightIds"        TEXT[],
    "oneWayOutboundFlightIds"   TEXT[],
    "oneWayReturnFlightIds"     TEXT[],
    "roundTripTotalPrice"       DECIMAL(65,30),
    "oneWayTotalPrice"          DECIMAL(65,30)    NOT NULL,
    "priceDifference"           DECIMAL(65,30),
    "recommendedOption"         "RecommendedOption" NOT NULL,
    "aiAnalysis"                TEXT,
    "aiAnalysisGeneratedAt"     TIMESTAMP(3),
    "createdAt"                 TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "legFlightIds"              TEXT[],
    "multiCityTotalPrice"       DECIMAL(65,30)
);
ALTER TABLE "Comparison" ADD COLUMN IF NOT EXISTS "legFlightIds" TEXT[];
ALTER TABLE "Comparison" ADD COLUMN IF NOT EXISTS "multiCityTotalPrice" DECIMAL(65,30);

-- True only when a genuine same-airline round-trip pairing exists. When false,
-- roundTripFlightIds still holds a fallback pairing (so downstream code never
-- sees an empty array) but it's identical to the one-way/best-mix pairing —
-- the client uses this flag to avoid presenting two cards with duplicate data.
ALTER TABLE "Comparison" ADD COLUMN IF NOT EXISTS "sameAirlineAvailable" BOOLEAN NOT NULL DEFAULT TRUE;

-- Round-trip pricing is not always derivable (e.g. no return flights for the route) — nullable
-- so that case can be represented honestly instead of inventing a number. Idempotent for
-- databases created before this column allowed NULL. oneWayTotalPrice similarly nullable now
-- that multi-city comparisons don't populate it (they use multiCityTotalPrice instead).
ALTER TABLE "Comparison" ALTER COLUMN "roundTripTotalPrice" DROP NOT NULL;
ALTER TABLE "Comparison" ALTER COLUMN "priceDifference" DROP NOT NULL;
ALTER TABLE "Comparison" ALTER COLUMN "oneWayTotalPrice" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "SavedSearch" (
    "id"                 TEXT           NOT NULL PRIMARY KEY,
    "userId"             TEXT           NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "searchQueryId"      TEXT           NOT NULL REFERENCES "SearchQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "nickname"           TEXT,
    "priceAlertEnabled"  BOOLEAN        NOT NULL DEFAULT false,
    "priceAlertThreshold" DECIMAL(65,30),
    "createdAt"          TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
