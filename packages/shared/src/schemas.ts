import { z } from 'zod';
import { CabinClass, TripType } from './enums';

export const IATACodeSchema = z.string().length(3).toUpperCase();

export const SearchRequestSchema = z.object({
  originAirport: IATACodeSchema,
  destinationAirport: IATACodeSchema,
  departureDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  returnDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  tripType: z.nativeEnum(TripType),
  passengers: z.number().int().min(1).max(9).default(1),
  cabinClass: z.nativeEnum(CabinClass).default(CabinClass.ECONOMY),
  maxLayovers: z.number().int().min(0).max(2).optional(),
  maxTotalDurationMinutes: z.number().int().min(30).optional(),
  preferredLayoverAirports: z.array(IATACodeSchema).optional(),
  avoidedAirlines: z.array(z.string()).optional(),
  preferredAirlines: z.array(z.string()).optional(),
  flexibleDates: z.boolean().default(false),
  flexibleDateRangeDays: z.number().int().min(1).max(7).optional(),
  userId: z.string().uuid().optional(),
});

export const UserCreateSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  preferredCurrency: z.string().length(3).default('USD'),
  homeAirport: IATACodeSchema.optional(),
});

export const SavedSearchCreateSchema = z.object({
  userId: z.string().uuid(),
  searchQueryId: z.string().uuid(),
  nickname: z.string().optional(),
  priceAlertEnabled: z.boolean().default(false),
  priceAlertThreshold: z.number().min(0).optional(),
});

export type SearchRequestInput = z.infer<typeof SearchRequestSchema>;
export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type SavedSearchCreateInput = z.infer<typeof SavedSearchCreateSchema>;
