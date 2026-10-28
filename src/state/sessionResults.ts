import type { Account } from "@/engine/paperBroker";

// The result screen needs the account from the replay screen, which is too
// big to pass as a route param. A plain in-memory map keyed by day is enough:
// results only need to last while the app is open, and there's no need for a
// state library just for this.
const results = new Map<string, Account>();

export function saveResult(dayId: string, account: Account) {
  results.set(dayId, account);
}

export function getResult(dayId: string): Account | undefined {
  return results.get(dayId);
}
