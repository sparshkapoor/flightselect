import { PrismaClient } from '@prisma/client';
import { MockScraper } from '../src/scrapers/mock.scraper';
import { CabinClass, TripType, RecommendedOption } from '@flightselect/shared';

const prisma = new PrismaClient();
const scraper = new MockScraper();

async function main() {
  console.log('Seeding database...');

  // Clean up
  await prisma.comparison.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.searchQuery.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const [alice, bob, carol] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        displayName: 'Alice Johnson',
        preferredCurrency: 'USD',
        homeAirport: 'SFO',
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@example.com',
        displayName: 'Bob Smith',
        preferredCurrency: 'USD',
        homeAirport: 'JFK',
      },
    }),
    prisma.user.create({
      data: {
        email: 'carol@example.com',
        displayName: 'Carol White',
        preferredCurrency: 'GBP',
        homeAirport: 'LHR',
      },
    }),
  ]);

  console.log('Created users:', alice.id, bob.id, carol.id);

  const searchConfigs = [
    {
      originAirport: 'SFO',
      destinationAirport: 'JFK',
      departureDate: new Date('2024-07-15'),
      returnDate: new Date('2024-07-22'),
      tripType: TripType.ROUND_TRIP,
      passengers: 1,
      cabinClass: CabinClass.ECONOMY,
      flexibleDates: false,
      userId: alice.id,
      label: 'SFO→JFK domestic round trip',
    },
    {
      originAirport: 'JFK',
      destinationAirport: 'LHR',
      departureDate: new Date('2024-08-01'),
      returnDate: new Date('2024-08-15'),
      tripType: TripType.ROUND_TRIP,
      passengers: 2,
      cabinClass: CabinClass.ECONOMY,
      flexibleDates: true,
      flexibleDateRangeDays: 3,
      maxLayovers: 1,
      userId: bob.id,
      label: 'JFK→LHR international round trip',
    },
    {
      originAirport: 'LAX',
      destinationAirport: 'NRT',
      departureDate: new Date('2024-09-10'),
      returnDate: null,
      tripType: TripType.ONE_WAY,
      passengers: 1,
      cabinClass: CabinClass.BUSINESS,
      flexibleDates: false,
      userId: carol.id,
      label: 'LAX→NRT business one-way',
    },
    {
      originAirport: 'ORD',
      destinationAirport: 'MIA',
      departureDate: new Date('2024-06-20'),
      returnDate: new Date('2024-06-27'),
      tripType: TripType.ROUND_TRIP,
      passengers: 3,
      cabinClass: CabinClass.ECONOMY,
      flexibleDates: false,
      avoidedAirlines: ['Spirit', 'Frontier'],
      preferredAirlines: ['Delta', 'United'],
      maxLayovers: 0,
      userId: alice.id,
      label: 'ORD→MIA family trip no layovers',
    },
    {
      originAirport: 'SFO',
      destinationAirport: 'LHR',
      departureDate: new Date('2024-12-20'),
      returnDate: new Date('2025-01-05'),
      tripType: TripType.ROUND_TRIP,
      passengers: 1,
      cabinClass: CabinClass.PREMIUM_ECONOMY,
      flexibleDates: true,
      flexibleDateRangeDays: 2,
      userId: bob.id,
      label: 'SFO→LHR holiday trip premium economy',
    },
  ];

  for (const config of searchConfigs) {
    const { label, ...queryData } = config;
    console.log(`Creating search: ${label}`);

    const searchQuery = await prisma.searchQuery.create({
      data: {
        ...queryData,
        preferredLayoverAirports: [],
        avoidedAirlines: (queryData as { avoidedAirlines?: string[] }).avoidedAirlines ?? [],
        preferredAirlines: (queryData as { preferredAirlines?: string[] }).preferredAirlines ?? [],
        maxLayovers: (queryData as { maxLayovers?: number }).maxLayovers ?? null,
        flexibleDateRangeDays:
          (queryData as { flexibleDateRangeDays?: number }).flexibleDateRangeDays ?? null,
      },
    });

    // Scrape mock flights for outbound
    const outboundFlights = await scraper.search({
      searchQueryId: searchQuery.id,
      originAirport: config.originAirport,
      destinationAirport: config.destinationAirport,
      departureDate: config.departureDate,
      passengers: config.passengers,
      cabinClass: config.cabinClass,
    });

    // Scrape mock flights for return (if round trip)
    const returnFlights =
      config.returnDate && config.tripType === TripType.ROUND_TRIP
        ? await scraper.search({
            searchQueryId: searchQuery.id,
            originAirport: config.destinationAirport,
            destinationAirport: config.originAirport,
            departureDate: config.returnDate,
            passengers: config.passengers,
            cabinClass: config.cabinClass,
          })
        : [];

    const allFlights = [...outboundFlights, ...returnFlights];
    const createdFlights = await Promise.all(
      allFlights.map((f) =>
        prisma.flight.create({
          data: {
            searchQueryId: searchQuery.id,
            airline: f.airline,
            flightNumber: f.flightNumber,
            departureAirport: f.departureAirport,
            arrivalAirport: f.arrivalAirport,
            departureTime: f.departureTime,
            arrivalTime: f.arrivalTime,
            durationMinutes: f.durationMinutes,
            price: f.price,
            currency: f.currency,
            cabinClass: f.cabinClass,
            isLayover: f.isLayover,
            layoverAirport: f.layoverAirport,
            layoverDurationMinutes: f.layoverDurationMinutes,
            source: f.source,
            scrapedAt: f.scrapedAt,
            rawData: f.rawData ? (f.rawData as object) : undefined,
          },
        })
      )
    );

    console.log(`  Saved ${createdFlights.length} flights`);

    // Build comparison
    const sorted = [...createdFlights].sort(
      (a, b) => Number(a.price) - Number(b.price)
    );
    const outbound = sorted.filter(
      (f) => f.departureAirport === config.originAirport
    );
    const ret = sorted.filter((f) => f.departureAirport === config.destinationAirport);

    const bestOutbound = outbound[0] ?? sorted[0];
    // A "return" flight only exists for round-trip configs — never invent one
    // by reusing an unrelated outbound flight.
    const bestReturn = ret[0];
    const isRoundTrip = Boolean(bestOutbound && bestReturn);

    // Both legs purchased together (mix-and-match baseline) when round-trip;
    // a bare one-way fare when there's no return leg at all.
    const oneWayTotalPrice = bestOutbound
      ? Number(bestOutbound.price) + (isRoundTrip ? Number(bestReturn!.price) : 0)
      : 0;
    // This seed doesn't model a separate same-airline-vs-mix split — both
    // columns show the same real total when round-trip data exists.
    const roundTripTotalPrice = isRoundTrip ? oneWayTotalPrice : null;
    const priceDifference = roundTripTotalPrice !== null ? roundTripTotalPrice - oneWayTotalPrice : null;
    const recommendedOption = isRoundTrip ? RecommendedOption.ROUND_TRIP : RecommendedOption.ONE_WAY;

    await prisma.comparison.create({
      data: {
        searchQueryId: searchQuery.id,
        roundTripFlightIds: isRoundTrip ? [bestOutbound!.id, bestReturn!.id] : [],
        oneWayOutboundFlightIds: bestOutbound ? [bestOutbound.id] : [],
        oneWayReturnFlightIds: bestReturn ? [bestReturn.id] : [],
        roundTripTotalPrice,
        oneWayTotalPrice,
        priceDifference,
        recommendedOption,
        aiAnalysis: null,
        aiAnalysisGeneratedAt: null,
      },
    });

    console.log(`  Created comparison (recommended: ${recommendedOption})`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
