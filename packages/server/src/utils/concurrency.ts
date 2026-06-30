// Runs `fn` over `items` with at most `limit` calls in flight at once. Used
// instead of a sequential for-loop when each call is an independent slow I/O
// operation (e.g. one SerpAPI request per flight) — caps concurrency so we
// don't fire all requests at once and trip rate limits, while still finishing
// in roughly items.length / limit time instead of items.length * perCallTime.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
