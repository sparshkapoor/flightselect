/**
 * Seeds fake historical Flight rows into PostgreSQL to exercise the RAG
 * retrieval pipeline without needing 30 days of real searches.
 *
 * Run: npx ts-node prisma/seed-historical.ts
 *
 * Creates synthetic SearchQuery + Flight records spanning the past 30 days
 * for three routes, with realistic price variance and a deliberate week-over-week
 * trend so the trend signal fires correctly.
 */
import { PrismaClient, CabinClass, TripType, SearchStatus } from '@prisma/client';

const prisma = new PrismaClient();

const ROUTES = [
  { origin: 'JFK', destination: 'LAX', basePrice: 280, trend: 'rising' as const },
  { origin: 'LAX', destination: 'ORD', basePrice: 190, trend: 'falling' as const },
  { origin: 'BOS', destination: 'MIA', basePrice: 160, trend: 'stable' as const },
];

const AIRLINES = ['AA', 'UA', 'DL', 'WN', 'B6'];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seedRoute(
  origin: string,
  destination: string,
  basePrice: number,
  trend: 'rising' | 'falling' | 'stable'
) {
  // One synthetic SearchQuery per route — just needs to exist as a FK anchor
  const searchQuery = await prisma.searchQuery.create({
    data: {
      originAirport: origin,
      destinationAirport: destination,
      departureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
      tripType: TripType.ROUND_TRIP,
      passengers: 1,
      cabinClass: CabinClass.ECONOMY,
      status: SearchStatus.COMPLETED,
    },
  });

  // Generate 40 flights spread across 30 days.
  // Trend is modelled as a price multiplier: rising = recent prices ~15% higher,
  // falling = recent prices ~15% lower, stable = flat.
  const flights = Array.from({ length: 40 }, (_, i) => {
    const daysBack = Math.floor(randomBetween(0, 30));
    const scrapedAt = daysAgo(daysBack);

    // Week-over-week price drift
    let trendMultiplier = 1;
    if (trend === 'rising') trendMultiplier = daysBack < 7 ? 1.15 : 0.95;
    if (trend === 'falling') trendMultiplier = daysBack < 7 ? 0.85 : 1.05;

    const price = basePrice * trendMultiplier * randomBetween(0.85, 1.15);
    const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
    const departureTime = new Date(scrapedAt);
    departureTime.setHours(6 + Math.floor(Math.random() * 14));
    const arrivalTime = new Date(departureTime.getTime() + randomBetween(2.5, 6) * 60 * 60 * 1000);

    return {
      airline,
      flightNumber: `${airline}${Math.floor(randomBetween(100, 999))}`,
      departureAirport: origin,
      arrivalAirport: destination,
      departureTime,
      arrivalTime,
      durationMinutes: Math.round((arrivalTime.getTime() - departureTime.getTime()) / 60000),
      price,
      currency: 'USD',
      cabinClass: CabinClass.ECONOMY,
      isLayover: false,
      source: 'seed',
      scrapedAt,
      searchQueryId: searchQuery.id,
    };
  });

  await prisma.flight.createMany({ data: flights });
  console.log(`Seeded ${flights.length} flights for ${origin}→${destination} (trend: ${trend})`);
}

async function main() {
  console.log('Seeding historical flight data...');
  for (const route of ROUTES) {
    await seedRoute(route.origin, route.destination, route.basePrice, route.trend);
  }
  console.log('Done. Run your server and trigger a comparison on JFK→LAX, LAX→ORD, or BOS→MIA.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
