import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  preferredCurrency: string;
  homeAirport: string | null;
  setUser: (user: { id: string; email: string; displayName?: string | null; preferredCurrency?: string; homeAirport?: string | null }) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      email: null,
      displayName: null,
      preferredCurrency: 'USD',
      homeAirport: null,
      setUser: (user) =>
        set({
          userId: user.id,
          email: user.email,
          displayName: user.displayName ?? null,
          preferredCurrency: user.preferredCurrency ?? 'USD',
          homeAirport: user.homeAirport ?? null,
        }),
      clearUser: () =>
        set({ userId: null, email: null, displayName: null, homeAirport: null }),
    }),
    {
      name: 'flightselect-user',
    }
  )
);
